import Dexie from "dexie";

// Base locale (IndexedDB) — miroir en lecture seule des données de référence
// pour que le dashboard reste consultable hors-ligne.
//
// Phase 2 du chantier hors-ligne : on ne stocke QUE des données de référence
// peu changeantes (carte, définitions de tables). Les commandes/encaissements
// (write-heavy, append-only) et l'outbox arrivent aux phases suivantes.
//
// Singleton paresseux : jamais instancié côté serveur (SSR / build), où
// `indexedDB` n'existe pas.

let _db = null;

export function getDb() {
  if (typeof indexedDB === "undefined") return null;
  if (_db) return _db;

  _db = new Dexie("comptoir_offline");
  _db.version(1).stores({
    // `id` = clé primaire (UUID Supabase) ; `owner_email` indexé pour purger /
    // relire par restaurant.
    dishes: "id, owner_email",
    restaurant_tables: "id, owner_email",
    // Horodatage de dernière synchro réussie, par (table, restaurant).
    meta: "key",
  });

  return _db;
}

export function canUseOfflineDb() {
  return getDb() !== null;
}
