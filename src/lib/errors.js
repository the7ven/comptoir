// lib/errors.js
//
// Les messages d'erreur bruts de Supabase/Postgres (error.message) peuvent
// révéler des détails internes (noms de tables, colonnes, contraintes) et
// ne doivent jamais être affichés tels quels à l'utilisateur final.
// Cette fonction logge le détail (utile en dev / dans les logs serveur) et
// renvoie un message générique — sauf pour une poignée de messages d'auth
// connus et sans risque, qu'on peut traduire pour l'UX.

const KNOWN_AUTH_MESSAGES = {
  'Invalid login credentials': 'Email ou mot de passe incorrect.',
  'User already registered': 'Un compte existe déjà avec cet email.',
  'Email not confirmed': "Veuillez confirmer votre email avant de vous connecter.",
  'Password should be at least 6 characters': 'Le mot de passe doit contenir au moins 6 caractères.',
};

export function toUserMessage(error, fallback = 'Une erreur est survenue. Veuillez réessayer.') {
  if (error) console.error(error);
  const msg = error?.message;
  if (msg && KNOWN_AUTH_MESSAGES[msg]) return KNOWN_AUTH_MESSAGES[msg];

  // Rejet renvoyé par le hook Supabase « Password Verification Attempt »
  // (verrouillage après 5 échecs — voir migration 20260830120000).
  if (msg && msg.includes('Trop de tentatives')) {
    return 'Trop de tentatives de connexion. Compte bloqué, réessayez dans 30 minutes.';
  }

  return fallback;
}
