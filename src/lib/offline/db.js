import Dexie from "dexie";

// Base locale (IndexedDB) pour le mode hors-ligne.
//
// v1 (Phase 2) — miroir lecture seule des données de référence : carte
//   (`dishes`), définitions de tables (`restaurant_tables`), `meta`.
// v2 (Phase 3) — commandes :
//   - `orders`  : miroir des commandes récentes (réplique locale, Phase 6) ;
//   - `outbox`  : file des écritures faites hors-ligne (créations / éditions /
//                 changements de statut / encaissements), rejouée vers
//                 Supabase par src/lib/offline/sync.js dès le retour réseau.
// v3 (Phase 3.5) — `profiles` : profil restaurant en cache, pour que
//   l'authentification survive à un rechargement hors-ligne.
// v4 (Phase 3.6) — `expenses` : miroir local des dépenses récentes.
// v5 (Phase 3.7) — `transactions` : miroir local des encaissements récents
//   (pour que la Caisse et les recettes du jour restent justes hors-ligne).
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

  _db.version(3).stores({
    dishes: "id, owner_email",
    restaurant_tables: "id, owner_email",
    meta: "key",
    orders: "id, owner_email, created_at, status",
    outbox: "opId, entity, entityId, status, ownerEmail, clientCreatedAt",
    // Profil restaurant en cache (clé = id du compte), pour l'auth hors-ligne.
    profiles: "id",
  });

  _db.version(4).stores({
    dishes: "id, owner_email",
    restaurant_tables: "id, owner_email",
    meta: "key",
    orders: "id, owner_email, created_at, status",
    outbox: "opId, entity, entityId, status, ownerEmail, clientCreatedAt",
    profiles: "id",
    expenses: "id, owner_email, created_at",
  });

  _db.version(5).stores({
    dishes: "id, owner_email",
    restaurant_tables: "id, owner_email",
    meta: "key",
    orders: "id, owner_email, created_at, status",
    outbox: "opId, entity, entityId, status, ownerEmail, clientCreatedAt",
    profiles: "id",
    expenses: "id, owner_email, created_at",
    transactions: "id, owner_email, created_at",
  });

  return _db;
}

export function canUseOfflineDb() {
  return getDb() !== null;
}
