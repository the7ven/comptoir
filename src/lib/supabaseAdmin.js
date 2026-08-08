import { createClient } from '@supabase/supabase-js';

// Client "admin" — utilise la clé service_role, qui bypass RLS et peut
// gérer les comptes auth (auth.admin.*).
//
// RÈGLES ABSOLUES :
//  - Ne JAMAIS importer ce fichier depuis un composant "use client" ou tout
//    code exécuté dans le navigateur : la clé service_role donnerait un accès
//    total à toutes les données de tous les restaurants.
//  - Utiliser uniquement dans des route handlers (src/app/api/**/route.js)
//    ou des Server Actions, jamais dans une page/composant client.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    "Variables d'environnement Supabase manquantes côté serveur : " +
    'NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requises pour supabaseAdmin.'
  );
}

export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
