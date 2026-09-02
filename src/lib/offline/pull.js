import { supabase } from "@/lib/supabase";
import { getDb } from "@/lib/offline/db";
import { looksLikeNetworkError, normEmail } from "@/lib/offline/net";
import { getDishes } from "@/lib/data/dishes";
import { getRestaurantTables } from "@/lib/data/tables";

// Synchro descendante (Phase 6) : rafraîchit les miroirs locaux avec l'état
// serveur, indépendamment de l'onglet ouvert.
//
//   - carte / tables       : petits, rafraîchis en entier (via la couche
//                             cache-through existante) ;
//   - commandes            : miroir = vraie réplique locale des commandes
//                             récentes (fenêtre glissante). Rafraîchi soit en
//                             DELTA (updated_at > curseur), soit par
//                             RÉCONCILIATION complète de la fenêtre (qui
//                             capture aussi les suppressions).
//   - dépenses (Phase 3.6) : miroir de la fenêtre glissante, réconciliation
//                             complète uniquement (pas de curseur).

const MIRROR_WINDOW_DAYS = 3;
const windowStartISO = () =>
  new Date(Date.now() - MIRROR_WINDOW_DAYS * 24 * 3600 * 1000).toISOString();

const cursorKey = (key) => `cursor:orders:${key}`;
const syncedKey = (key) => `synced:orders:${key}`;

const maxIso = (a, b) => {
  if (!a) return b;
  if (!b) return a;
  return Date.parse(a) >= Date.parse(b) ? a : b;
};

// ---------------------------------------------------------------------------
// Miroir commandes — lecture / écriture
// ---------------------------------------------------------------------------

export async function readOrdersMirror(ownerEmail) {
  const db = getDb();
  if (!db) return { rows: [], everSynced: false };
  const key = normEmail(ownerEmail);
  const [rows, meta] = await Promise.all([
    db.orders.where("owner_email").equalsIgnoreCase(key).toArray(),
    db.meta.get(syncedKey(key)),
  ]);
  return { rows, everSynced: Boolean(meta) };
}

// Applique des lignes serveur dans le miroir SANS rien supprimer (upsert) et
// fait avancer le curseur updated_at. Utilisé par les lectures en ligne.
export async function upsertOrdersMirror(ownerEmail, rows) {
  const db = getDb();
  if (!db || !rows) return;
  const key = normEmail(ownerEmail);
  await db.transaction("rw", db.orders, db.meta, async () => {
    if (rows.length) {
      await db.orders.bulkPut(rows.map((r) => ({ ...r, owner_email: normEmail(r.owner_email) })));
    }
    const cur = await db.meta.get(cursorKey(key));
    let next = cur ? cur.value : null;
    for (const r of rows) next = maxIso(next, r.updated_at);
    if (next) await db.meta.put({ key: cursorKey(key), value: next });
    await db.meta.put({ key: syncedKey(key), at: Date.now() });
  });
}

// ---------------------------------------------------------------------------
// Pull delta / réconciliation
// ---------------------------------------------------------------------------

// Récupère les commandes changées depuis le curseur (dans la fenêtre).
// Si la colonne updated_at n'existe pas encore (migration non appliquée),
// on retombe sur une réconciliation complète.
export async function pullOrdersDelta(ownerEmail) {
  const db = getDb();
  if (!db || !ownerEmail) return;
  if (typeof navigator !== "undefined" && navigator.onLine === false) return;
  const key = normEmail(ownerEmail);
  const cur = await db.meta.get(cursorKey(key));

  try {
    let q = supabase
      .from("orders")
      .select("*")
      .eq("owner_email", ownerEmail)
      .gte("created_at", windowStartISO());
    if (cur && cur.value) q = q.gt("updated_at", cur.value);

    const { data, error } = await q;
    if (error) {
      if ((error.message || "").toLowerCase().includes("updated_at")) {
        return reconcileOrders(ownerEmail); // migration pas encore là
      }
      throw error;
    }
    await upsertOrdersMirror(ownerEmail, data || []);
  } catch (err) {
    if (!looksLikeNetworkError(err)) throw err;
    /* hors-ligne : on garde le miroir tel quel */
  }
}

// Réconciliation complète de la fenêtre : remplace toutes les lignes de la
// fenêtre par l'état serveur (capture les suppressions) et purge le hors-fenêtre.
export async function reconcileOrders(ownerEmail) {
  const db = getDb();
  if (!db || !ownerEmail) return;
  if (typeof navigator !== "undefined" && navigator.onLine === false) return;
  const key = normEmail(ownerEmail);
  const start = windowStartISO();

  try {
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .eq("owner_email", ownerEmail)
      .gte("created_at", start);
    if (error) throw error;
    const rows = (data || []).map((r) => ({ ...r, owner_email: normEmail(r.owner_email) }));

    await db.transaction("rw", db.orders, db.meta, async () => {
      const inWindow = await db.orders
        .where("owner_email")
        .equalsIgnoreCase(key)
        .and((o) => (o.created_at || "") >= start)
        .primaryKeys();
      await db.orders.bulkDelete(inWindow);

      // Purge du hors-fenêtre (commandes anciennes accumulées).
      const stale = await db.orders
        .where("owner_email")
        .equalsIgnoreCase(key)
        .and((o) => (o.created_at || "") < start)
        .primaryKeys();
      await db.orders.bulkDelete(stale);

      if (rows.length) await db.orders.bulkPut(rows);

      let next = null;
      for (const r of rows) next = maxIso(next, r.updated_at);
      if (next) await db.meta.put({ key: cursorKey(key), value: next });
      await db.meta.put({ key: syncedKey(key), at: Date.now() });
    });
  } catch (err) {
    if (!looksLikeNetworkError(err)) throw err;
  }
}

// ---------------------------------------------------------------------------
// Miroir dépenses (Phase 3.6) — pas de curseur (pas d'updated_at) : simple
// réconciliation de la fenêtre glissante, suffisant vu le très faible volume.
// ---------------------------------------------------------------------------

const expSyncedKey = (key) => `synced:expenses:${key}`;

export async function readExpensesMirror(ownerEmail) {
  const db = getDb();
  if (!db) return { rows: [], everSynced: false };
  const key = normEmail(ownerEmail);
  const [rows, meta] = await Promise.all([
    db.expenses.where("owner_email").equalsIgnoreCase(key).toArray(),
    db.meta.get(expSyncedKey(key)),
  ]);
  return { rows, everSynced: Boolean(meta) };
}

// Upsert sans suppression — utilisé par les lectures en ligne.
export async function upsertExpensesMirror(ownerEmail, rows) {
  const db = getDb();
  if (!db || !rows) return;
  const key = normEmail(ownerEmail);
  await db.transaction("rw", db.expenses, db.meta, async () => {
    if (rows.length) {
      await db.expenses.bulkPut(rows.map((r) => ({ ...r, owner_email: normEmail(r.owner_email) })));
    }
    await db.meta.put({ key: expSyncedKey(key), at: Date.now() });
  });
}

export async function reconcileExpenses(ownerEmail) {
  const db = getDb();
  if (!db || !ownerEmail) return;
  if (typeof navigator !== "undefined" && navigator.onLine === false) return;
  const key = normEmail(ownerEmail);
  const start = windowStartISO();

  try {
    const { data, error } = await supabase
      .from("expenses")
      .select("*")
      .eq("owner_email", ownerEmail)
      .gte("created_at", start);
    if (error) throw error;
    const rows = (data || []).map((r) => ({ ...r, owner_email: normEmail(r.owner_email) }));

    await db.transaction("rw", db.expenses, db.meta, async () => {
      // Remplacement complet pour ce restaurant (volume négligeable).
      await db.expenses.where("owner_email").equalsIgnoreCase(key).delete();
      if (rows.length) await db.expenses.bulkPut(rows);
      await db.meta.put({ key: expSyncedKey(key), at: Date.now() });
    });
  } catch (err) {
    if (!looksLikeNetworkError(err)) throw err;
  }
}

// ---------------------------------------------------------------------------
// Miroir transactions (Phase 3.7) — même schéma que les dépenses.
// ---------------------------------------------------------------------------

const txSyncedKey = (key) => `synced:transactions:${key}`;

export async function readTransactionsMirror(ownerEmail) {
  const db = getDb();
  if (!db) return { rows: [], everSynced: false };
  const key = normEmail(ownerEmail);
  const [rows, meta] = await Promise.all([
    db.transactions.where("owner_email").equalsIgnoreCase(key).toArray(),
    db.meta.get(txSyncedKey(key)),
  ]);
  return { rows, everSynced: Boolean(meta) };
}

export async function upsertTransactionsMirror(ownerEmail, rows) {
  const db = getDb();
  if (!db || !rows) return;
  const key = normEmail(ownerEmail);
  await db.transaction("rw", db.transactions, db.meta, async () => {
    if (rows.length) {
      await db.transactions.bulkPut(rows.map((r) => ({ ...r, owner_email: normEmail(r.owner_email) })));
    }
    await db.meta.put({ key: txSyncedKey(key), at: Date.now() });
  });
}

export async function reconcileTransactions(ownerEmail) {
  const db = getDb();
  if (!db || !ownerEmail) return;
  if (typeof navigator !== "undefined" && navigator.onLine === false) return;
  const key = normEmail(ownerEmail);
  const start = windowStartISO();

  try {
    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .eq("owner_email", ownerEmail)
      .gte("created_at", start);
    if (error) throw error;
    const rows = (data || []).map((r) => ({ ...r, owner_email: normEmail(r.owner_email) }));

    await db.transaction("rw", db.transactions, db.meta, async () => {
      await db.transactions.where("owner_email").equalsIgnoreCase(key).delete();
      if (rows.length) await db.transactions.bulkPut(rows);
      await db.meta.put({ key: txSyncedKey(key), at: Date.now() });
    });
  } catch (err) {
    if (!looksLikeNetworkError(err)) throw err;
  }
}

// Nombre de comptes caissier actifs — mis en cache pour le garde-fou de la
// clôture de caisse hors-ligne (Phase 3.7).
export async function refreshStaffCount(ownerEmail) {
  const db = getDb();
  if (!db || !ownerEmail) return;
  if (typeof navigator !== "undefined" && navigator.onLine === false) return;
  try {
    const { count, error } = await supabase
      .from("restaurants")
      .select("id", { head: true, count: "exact" })
      .eq("owner_email", ownerEmail)
      .eq("role", "cashier");
    if (error) throw error;
    await db.meta.put({ key: `staff_count:${normEmail(ownerEmail)}`, value: count || 0 });
  } catch (err) {
    if (!looksLikeNetworkError(err)) throw err;
  }
}

export async function cachedStaffCount(ownerEmail) {
  const db = getDb();
  if (!db) return null;
  const m = await db.meta.get(`staff_count:${normEmail(ownerEmail)}`);
  return m ? m.value : null;
}

// ---------------------------------------------------------------------------
// Orchestration
// ---------------------------------------------------------------------------

/**
 * Rafraîchit tous les miroirs.
 * @param {string} ownerEmail
 * @param {{full?: boolean}} opts  full = réconciliation complète (commandes,
 *   dépenses, transactions, compte caissiers) ; sinon simple delta commandes.
 */
export async function pullAll(ownerEmail, { full = false } = {}) {
  if (!ownerEmail) return;
  if (typeof navigator !== "undefined" && navigator.onLine === false) return;
  const jobs = [
    getDishes(ownerEmail),
    getRestaurantTables(ownerEmail),
    full ? reconcileOrders(ownerEmail) : pullOrdersDelta(ownerEmail),
  ];
  if (full) {
    jobs.push(
      reconcileExpenses(ownerEmail),
      reconcileTransactions(ownerEmail),
      refreshStaffCount(ownerEmail),
    );
  }
  await Promise.allSettled(jobs);
}
