import { getDb } from "@/lib/offline/db";
import { normEmail } from "@/lib/offline/net";

// File d'attente des écritures faites hors-ligne.
//
//   - createOp .................. enfile une opération
//   - pendingOps / pendingCount . opérations restant à envoyer (status 'pending')
//   - unsentOps / failedCount ... 'pending' + 'failed', pour l'affichage local :
//                                 une op échouée ne doit pas faire "disparaître"
//                                 la commande de l'écran, elle reste pliée dans
//                                 la vue et signalée par l'indicateur.
//   - foldPendingOrders ........ reconstruit l'état effectif des commandes
//
// Le rejeu vers Supabase vit dans src/lib/offline/sync.js (Phase 5).
//
// Forme d'une opération :
//   {
//     opId: uuid,            // clé primaire = clé d'idempotence
//     entity: 'order' | 'transaction',
//     entityId: string,      // id de la commande / transaction concernée
//     kind: 'order.create' | 'order.update' | 'order.status' | 'order.delete'
//         | 'payment.create' | 'expense.create' | 'expense.delete',
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
// Émis par le rejeu (sync.js) quand au moins une opération a été confirmée
// côté serveur — les onglets s'en servent pour recharger leurs données.
export const SYNCED_EVENT = "comptoir:synced";
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

  // Optimisation : supprimer une entité dont la création n'a jamais atteint
  // le serveur => on annule ses opérations non envoyées et on n'enfile RIEN
  // (rien à supprimer côté serveur).
  if (kind === "order.delete" || kind === "expense.delete") {
    const related = await db.outbox
      .where("entityId")
      .equals(entityId)
      .and((o) => o.entity === entity && o.status !== "done")
      .toArray();
    const hadUnsentCreate = related.some((o) => o.kind === `${entity}.create`);
    if (related.length) {
      await db.outbox.bulkDelete(related.map((o) => o.opId));
    }
    if (hadUnsentCreate) {
      notifyOutboxChanged();
      return null;
    }
  }

  await db.outbox.add(op);
  notifyOutboxChanged();
  return op;
}

async function opsByStatus(statuses, ownerEmail) {
  const db = getDb();
  if (!db) return [];
  const key = ownerEmail ? normEmail(ownerEmail) : null;
  const rows = await db.outbox.where("status").anyOf(statuses).toArray();
  return rows
    .filter((o) => !key || o.ownerEmail === key)
    .sort((a, b) => a.clientCreatedAt - b.clientCreatedAt);
}

/** Opérations restant à envoyer (ordre de rejeu). */
export function pendingOps(ownerEmail) {
  return opsByStatus(["pending"], ownerEmail);
}

/** Opérations non confirmées côté serveur (en attente OU en échec) — vue locale. */
export function unsentOps(ownerEmail) {
  return opsByStatus(["pending", "failed"], ownerEmail);
}

export async function pendingCount(ownerEmail) {
  return (await pendingOps(ownerEmail)).length;
}

export function failedOps(ownerEmail) {
  return opsByStatus(["failed"], ownerEmail);
}

export async function failedCount(ownerEmail) {
  return (await failedOps(ownerEmail)).length;
}

/** Supprime définitivement une opération de l'outbox (bouton "Abandonner"). */
export async function discardOp(opId) {
  const db = getDb();
  if (!db) return;
  await db.outbox.delete(opId);
  notifyOutboxChanged();
}

const money = (v) => `${Number(v || 0).toLocaleString("fr-FR")} F`;

// Description lisible d'une opération, pour l'écran de détail des échecs.
export function describeOp(op) {
  const p = op.payload || {};
  switch (op.kind) {
    case "order.create":
      return { title: `Nouvelle commande · ${p.table_number || "?"}`, sub: money(p.total_amount) };
    case "order.update":
      return { title: `Modification de commande`, sub: money(p.total_amount) };
    case "order.status":
      return { title: `Commande → « ${p.status} »`, sub: "" };
    case "order.delete":
      return { title: `Annulation de commande`, sub: "" };
    case "payment.create": {
      const tx = p.tx || {};
      return {
        title: `Encaissement · ${tx.payment_method || "?"}`,
        sub: `${money(tx.amount)}${tx.table_number ? ` — ${tx.table_number}` : ""}`,
      };
    }
    case "expense.create":
      return { title: `Dépense : ${p.label || "sans libellé"}`, sub: money(p.amount) };
    case "expense.delete":
      return { title: `Suppression de dépense`, sub: "" };
    case "closing.create":
      return { title: `Clôture de caisse du ${p.date || "?"}`, sub: `Réel ${money(p.real_amount)}` };
    default:
      return { title: op.kind, sub: "" };
  }
}

/**
 * Applique les opérations non envoyées sur une base de commandes (lignes
 * serveur OU miroir local) et renvoie l'état effectif.
 * @param {any[]} baseRows
 * @param {any[]} ops  déjà triées par clientCreatedAt (unsentOps)
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

// Les lignes issues d'une opération non envoyée sont marquées :
//   _pending : true  -> saisie hors-ligne, pas encore confirmée par le serveur
//   _failed  : true  -> le serveur l'a refusée (voir "Voir le détail")
const tagPending = (row, op) => ({ ...row, _pending: true, _failed: op.status === "failed" });

/** Idem foldPendingOrders, pour les dépenses (create / delete). */
export function foldPendingExpenses(baseRows, ops) {
  const byId = new Map((baseRows || []).map((r) => [r.id, { ...r }]));
  for (const op of ops || []) {
    if (op.kind === "expense.create") byId.set(op.entityId, tagPending(op.payload, op));
    else if (op.kind === "expense.delete") byId.delete(op.entityId);
  }
  return [...byId.values()];
}

// Opérations non envoyées transformées en entrées de journal d'activité
// (pour que le Journal montre "ce que je viens de faire" avant la synchro).
// isOwner=false masque annulations et suppressions, comme la RLS serveur.
const OP_TO_ACTION = {
  "order.create": "order.create",
  "order.delete": "order.cancel",
  "payment.create": "payment.create",
  "expense.create": "expense.create",
  "expense.delete": "expense.delete",
  "closing.create": "closing.create",
};
export async function pendingActivityEntries(ownerEmail, isOwner) {
  const ops = await unsentOps(ownerEmail);
  const out = [];
  for (const op of ops) {
    const action = OP_TO_ACTION[op.kind];
    if (!action) continue;
    if (!isOwner && (action === "order.cancel" || action === "expense.delete")) continue;
    const p = op.payload || {};
    let label = null, sub_label = null, amount = null;
    if (op.kind === "order.create") { label = p.table_number; sub_label = p.items_summary; amount = p.total_amount; }
    else if (op.kind === "order.delete") { label = null; }
    else if (op.kind === "payment.create") { label = p.tx?.table_number; sub_label = p.tx?.payment_method; amount = p.tx?.amount; }
    else if (op.kind === "expense.create") { label = p.label; sub_label = p.category; amount = p.amount; }
    else if (op.kind === "closing.create") { label = p.date; amount = p.real_amount; }
    out.push({
      id: op.opId,
      action,
      entity_type: op.entity === "transaction" ? "transaction" : op.entity,
      entity_id: op.entityId,
      label,
      sub_label,
      amount,
      source: "offline",
      actor_name: null,
      actor_role: null,
      occurred_at: new Date(op.clientCreatedAt).toISOString(),
      _local: true,
      _status: op.status, // 'pending' | 'failed'
    });
  }
  return out;
}

/** Encaissements en attente (op payment.create) fondus sur les transactions. */
export function foldPendingTransactions(baseRows, ops) {
  const byId = new Map((baseRows || []).map((r) => [r.id, { ...r }]));
  for (const op of ops || []) {
    if (op.kind === "payment.create" && op.payload && op.payload.tx) {
      byId.set(op.payload.tx.id, tagPending(op.payload.tx, op));
    }
  }
  return [...byId.values()];
}
