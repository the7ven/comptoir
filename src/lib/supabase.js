import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Variables d\'environnement Supabase manquantes : vérifiez que NEXT_PUBLIC_SUPABASE_URL et ' +
    'NEXT_PUBLIC_SUPABASE_ANON_KEY sont bien définies (fichier .env.local en dev, variables du projet en prod).'
  );
}

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);