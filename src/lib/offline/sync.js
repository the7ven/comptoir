import { supabase } from "@/lib/supabase";
import { getDb } from "@/lib/offline/db";
import { looksLikeNetworkError } from "@/lib/offline/net";
import { OUTBOX_EVENT, SYNCED_EVENT } from "@/lib/offline/outbox";

// Rejeu de l'outbox vers Supabase (Phase 5).
//
// Règles :
//   - ordre strict par clientCreatedAt ;
//   - idempotence : les créations passent par upsert(onConflict:'id',
//     ignoreDuplicates) ; les updates/status/delete sont idempotents par
//     nature ;
//   - garde anti-régression : un `order.status` ne s'applique que si le
//     statut serveur est ANTÉRIEUR à la cible (clause .in(...)) ;
//   - échec réseau  -> on s'arrête, on réessaiera (op laissée 'pending') ;
//   - échec applicatif (RLS, contrainte, 4xx) -> op marquée 'failed', on
//     STOPPE le rejeu (les suivantes peuvent en dépendre) et on laisse
//     l'indicateur alerter l'utilisateur.

let flushing = false;

// Statuts serveur acceptés pour qu'un passage vers `target` soit autorisé.
const STATUS_PREV = {
  "En cours": null, // pas de garde (rare, retour arrière volontaire)
  "Prêt": ["En cours"],
  "Servi": ["En cours", "Prêt"],
};

async function replayOp(op) {
  switch (op.kind) {
    case "order.create": {
      const { error } = await supabase
        .from("orders")
        .upsert([op.payload], { onConflict: "id", ignoreDuplicates: true });
      if (error) throw error;
      return;
    }
    case "order.update": {
      const { error } = await supabase
        .from("orders")
        .update(op.payload)
        .eq("id", op.entityId)
        .eq("owner_email", op.ownerEmail);
      if (error) throw error;
      return;
    }
    case "order.status": {
      const prev = STATUS_PREV[op.payload.status];
      let q = supabase.from("orders").update({ status: op.payload.status }).eq("id", op.entityId);
      if (prev) q = q.in("status", prev);
      const { error } = await q;
      if (error) throw error;
      return;
    }
    case "order.delete": {
      const { error } = await supabase.from("orders").delete().eq("id", op.entityId);
      if (error) throw error;
      return;
    }
    case "payment.create": {
      const { error } = await supabase
        .from("transactions")
        .upsert([op.payload.tx], { onConflict: "id", ignoreDuplicates: true });
      if (error) throw error;
      return;
    }
    case "expense.create": {
      const { error } = await supabase
        .from("expenses")
        .upsert([op.payload], { onConflict: "id", ignoreDuplicates: true });
      if (error) throw error;
      return;
    }
    case "expense.delete": {
      const { error } = await supabase.from("expenses").delete().eq("id", op.entityId);
      if (error) throw error;
      return;
    }
    case "closing.create": {
      const { error } = await supabase
        .from("daily_closings")
        .upsert([op.payload], { onConflict: "id", ignoreDuplicates: true });
      // Une clôture déjà faite pour ce jour (contrainte d'unicité éventuelle sur
      // owner_email+date) n'est pas un échec bloquant : la caisse EST clôturée.
      if (error && !/duplicate|unique|already exists/i.test(error.message || "")) throw error;
      return;
    }
    default:
      throw new Error(`Type d'opération inconnu : ${op.kind}`);
  }
}

/**
 * Vide l'outbox. Réentrant-safe (verrou module).
 * @returns {Promise<{ran:boolean, done:number, failed?:object, stoppedByNetwork?:boolean, reason?:string}>}
 */
export async function flushOutbox() {
  const db = getDb();
  if (!db) return { ran: false, done: 0, reason: "no-db" };
  if (flushing) return { ran: false, done: 0, reason: "busy" };
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return { ran: false, done: 0, reason: "offline" };
  }

  flushing = true;
  let done = 0;
  let failed = null;
  let stoppedByNetwork = false;

  try {
    const ops = (await db.outbox.where("status").equals("pending").toArray()).sort(
      (a, b) => a.clientCreatedAt - b.clientCreatedAt,
    );

    for (const op of ops) {
      try {
        await replayOp(op);
        await db.outbox.delete(op.opId);
        done += 1;
      } catch (err) {
        if (looksLikeNetworkError(err)) {
          stoppedByNetwork = true;
          break;
        }
        await db.outbox.update(op.opId, {
          status: "failed",
          attempts: (op.attempts || 0) + 1,
          lastError: err && err.message ? err.message : String(err),
        });
        failed = { ...op, lastError: err && err.message ? err.message : String(err) };
        break;
      }
    }
  } finally {
    flushing = false;
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(OUTBOX_EVENT));
    if (done > 0) window.dispatchEvent(new Event(SYNCED_EVENT));
  }

  return { ran: true, done, failed, stoppedByNetwork };
}

/** Repasse les opérations 'failed' en 'pending' (bouton "Réessayer"). */
export async function retryFailedOps() {
  const db = getDb();
  if (!db) return 0;
  const failed = await db.outbox.where("status").equals("failed").toArray();
  await Promise.all(
    failed.map((o) => db.outbox.update(o.opId, { status: "pending", lastError: null })),
  );
  if (typeof window !== "undefined") window.dispatchEvent(new Event(OUTBOX_EVENT));
  return failed.length;
}
