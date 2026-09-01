import { getDb } from "@/lib/offline/db";
import { normEmail } from "@/lib/offline/net";

// File d'attente des écritures faites hors-ligne.
//
// Phase 3 : on ENREGISTRE seulement (createOp) et on RELIT (pendingOps,
// pendingCount, foldPendingOrders) pour que l'UI reflète immédiatement ce
// qui a été fait sans réseau. Le rejeu vers Supabase (ordre, idempotence,
// garde anti-régression de statut, gestion des échecs) est la Phase 5.
//
// Forme d'une opération :
//   {
//     opId: uuid,            // clé primaire = clé d'idempotence
//     entity: 'order' | 'transaction',
//     entityId: string,      // id de la commande / transaction concernée
//     kind: 'order.create' | 'order.update' | 'order.status'
//         | 'order.delete'  | 'payment.create',
//     payload: object,       // ce dont la Phase 5 aura besoin pour rejouer
//     ownerEmail: string,
//     clientCreatedAt: number, // Date.now() — ordre de rejeu
//     status: 'pending' | 'done' | 'failed',
//     attempts: 0,
//     lastError: null,
//   }

const uuid = () =>
  (globalThis.crypto && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`);

// Évènement émis à chaque changement de l'outbox — l'indicateur d'état
// (Phase 4) s'y abonne pour rafraîchir son compteur sans polling agressif.
export const OUTBOX_EVENT = "comptoir:outbox-changed";
function notifyOutboxChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(OUTBOX_EVENT));
  }
}

export function newOrderId() {
  // `orders.id` est un TEXT côté Supabase (format historique "ORD-XXXX").
  // On garde le préfixe mais avec un UUID complet : pas de collision possible
  // entre appareils, et l'id sert de clé d'idempotence au rejeu.
  return `ORD-${uuid()}`;
}

export function newTransactionId() {
  return uuid();
}

const STATUS_RANK = { "En cours": 0, "Prêt": 1, "Servi": 2 };
const furthestStatus = (a, b) =>
  (STATUS_RANK[b] ?? -1) > (STATUS_RANK[a] ?? -1) ? b : a;

/** Enfile une opération. Sans IndexedDB (SSR), no-op silencieux. */
export async function createOp({ entity, entityId, kind, payload, ownerEmail }) {
  const db = getDb();
  if (!db) return null;
  const op = {
    opId: uuid(),
    entity,
    entityId,
    kind,
    payload,
    ownerEmail: normEmail(ownerEmail),
    clientCreatedAt: Date.now(),
    status: "pending",
    attempts: 0,
    lastError: null,
  };

  // Optimisation : supprimer une commande créée hors-ligne et jamais
  // synchronisée => on annule ses opérations en attente et on n'enfile RIEN
  // (il n'y a rien à supprimer côté serveur).
  if (kind === "order.delete") {
    const related = await db.outbox
      .where("entityId")
      .equals(entityId)
      .and((o) => o.entity === "order" && o.status === "pending")
      .toArray();
    const hadPendingCreate = related.some((o) => o.kind === "order.create");
    if (related.length) {
      await db.outbox.bulkDelete(related.map((o) => o.opId));
    }
    if (hadPendingCreate) {
      notifyOutboxChanged();
      return null;
    }
  }

  await db.outbox.add(op);
  notifyOutboxChanged();
  return op;
}

/** Opérations en attente, triées par ordre de création (ordre de rejeu). */
export async function pendingOps(ownerEmail) {
  const db = getDb();
  if (!db) return [];
  let coll = db.outbox.where("status").equals("pending");
  const rows = await coll.toArray();
  const key = ownerEmail ? normEmail(ownerEmail) : null;
  return rows
    .filter((o) => !key || o.ownerEmail === key)
    .sort((a, b) => a.clientCreatedAt - b.clientCreatedAt);
}

/** Nombre d'opérations en attente (indicateur d'état — Phase 4). */
export async function pendingCount(ownerEmail) {
  return (await pendingOps(ownerEmail)).length;
}

/**
 * Applique les opérations en attente sur une base de commandes (lignes
 * serveur OU miroir local) et renvoie l'état effectif.
 * @param {any[]} baseRows
 * @param {any[]} ops  déjà triées par clientCreatedAt
 */
export function foldPendingOrders(baseRows, ops) {
  const byId = new Map((baseRows || []).map((r) => [r.id, { ...r }]));

  for (const op of ops || []) {
    if (op.kind === "order.create") {
      byId.set(op.entityId, { ...op.payload });
    } else if (op.kind === "order.update") {
      const cur = byId.get(op.entityId);
      if (cur) byId.set(op.entityId, { ...cur, ...op.payload });
    } else if (op.kind === "order.status") {
      const cur = byId.get(op.entityId);
      if (cur) cur.status = furthestStatus(cur.status, op.payload.status);
    } else if (op.kind === "order.delete") {
      byId.delete(op.entityId);
    } else if (op.kind === "payment.create") {
      const cur = byId.get(op.payload.orderId);
      if (cur) cur.status = "Servi";
    }
  }

  return [...byId.values()];
}
