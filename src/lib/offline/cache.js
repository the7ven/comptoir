import { getDb } from "@/lib/offline/db";

// Lecture "cache-through" pour les données de référence (Phase 2).
//
//   - EN LIGNE  : on interroge Supabase, on remplace le miroir local de ce
//                 restaurant, on renvoie les données fraîches.
//   - HORS-LIGNE: on renvoie le dernier miroir local connu.
//
// La bascule sur le cache ne se fait QUE pour une panne réseau (fetch qui
// échoue / navigator.onLine === false). Une vraie erreur applicative
// (RLS, requête invalide…) est propagée normalement — on ne veut pas masquer
// un bug derrière des données périmées.

function looksLikeNetworkError(err) {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return true;
  if (err instanceof TypeError) return true; // "Failed to fetch"
  const m = (err && err.message ? err.message : "").toLowerCase();
  return (
    m.includes("failed to fetch") ||
    m.includes("network") ||
    m.includes("fetch") ||
    m.includes("timeout")
  );
}

const normEmail = (v) => (v || "").trim().toLowerCase();

async function replaceMirror(storeName, ownerKey, rows) {
  const db = getDb();
  if (!db) return;
  await db.transaction("rw", db[storeName], db.meta, async () => {
    await db[storeName].where("owner_email").equalsIgnoreCase(ownerKey).delete();
    if (rows.length) {
      // On force owner_email en minuscule dans le miroir pour des relectures
      // insensibles à la casse fiables.
      await db[storeName].bulkPut(rows.map((r) => ({ ...r, owner_email: normEmail(r.owner_email) })));
    }
    await db.meta.put({ key: `synced:${storeName}:${ownerKey}`, at: Date.now() });
  });
}

async function readMirror(storeName, ownerKey) {
  const db = getDb();
  if (!db) return { rows: [], everSynced: false };
  const [rows, meta] = await Promise.all([
    db[storeName].where("owner_email").equalsIgnoreCase(ownerKey).toArray(),
    db.meta.get(`synced:${storeName}:${ownerKey}`),
  ]);
  return { rows, everSynced: Boolean(meta) };
}

/**
 * @param {string} storeName    nom de la table Dexie (= table Supabase)
 * @param {string} ownerEmail   e-mail du restaurant (clé de partage)
 * @param {() => Promise<any[]>} networkFetch  requête Supabase, renvoie les lignes
 * @returns {Promise<any[]>}
 */
export async function readThroughCache(storeName, ownerEmail, networkFetch) {
  const ownerKey = normEmail(ownerEmail);

  try {
    const rows = await networkFetch();
    replaceMirror(storeName, ownerKey, rows).catch((e) =>
      console.warn(`[offline] miroir ${storeName} non mis à jour`, e),
    );
    return rows;
  } catch (err) {
    if (!looksLikeNetworkError(err)) throw err;

    const { rows, everSynced } = await readMirror(storeName, ownerKey);
    if (rows.length || everSynced) return rows;

    // Jamais synchronisé pour ce restaurant : rien à montrer, on propage.
    throw err;
  }
}

/** Dernière synchro réussie (ms epoch) pour (table, restaurant), ou null. */
export async function lastSyncedAt(storeName, ownerEmail) {
  const db = getDb();
  if (!db) return null;
  const meta = await db.meta.get(`synced:${storeName}:${normEmail(ownerEmail)}`);
  return meta ? meta.at : null;
}
