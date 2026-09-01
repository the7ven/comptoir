import Dexie from "dexie";

// Base locale (IndexedDB) pour le mode hors-ligne.
//
// v1 (Phase 2) — miroir lecture seule des données de référence : carte
//   (`dishes`), définitions de tables (`restaurant_tables`), `meta`.
// v2 (Phase 3) — commandes :
//   - `orders`  : miroir du dernier instantané "commandes actives" ;
//   - `outbox`  : file des écritures faites hors-ligne (créations / éditions /
//                 changements de statut / encaissements). La Phase 5 la
//                 rejouera vers Supabase ; en Phase 3 elle ne fait que
//                 s'accumuler et alimenter les lectures locales.
//
// Singleton paresseux : jamais instancié côté serveur (SSR / build), où
// `indexedDB` n'existe pas.

let _db = null;

export function getDb() {
  if (typeof indexedDB === "undefined") return null;
  if (_db) return _db;

  _db = new Dexie("comptoir_offline");

  _db.version(1).stores({
    dishes: "id, owner_email",
    restaurant_tables: "id, owner_email",
    meta: "key",
  });

  _db.version(2).stores({
    dishes: "id, owner_email",
    restaurant_tables: "id, owner_email",
    meta: "key",
    orders: "id, owner_email, created_at, status",
    // opId = clé primaire = clé d'idempotence pour le rejeu (Phase 5).
    outbox: "opId, entity, entityId, status, ownerEmail, clientCreatedAt",
  });

  return _db;
}

export function canUseOfflineDb() {
  return getDb() !== null;
}
