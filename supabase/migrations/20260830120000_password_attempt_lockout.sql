-- ============================================================================
-- Verrouillage anti-brute-force sur la connexion par mot de passe — Comptoir
-- Date : 2026-08-30
--
-- Règle : après 5 échecs de mot de passe pour un compte, toute nouvelle
-- tentative sur ce compte est refusée pendant 30 minutes. Un mot de passe
-- correct (ou 30 min sans tentative) remet le compteur à zéro.
--
-- Mécanisme : Auth Hook Supabase « Password Verification Attempt ». GoTrue
-- appelle cette fonction Postgres à CHAQUE vérification de mot de passe
-- (succès comme échec) avant de renvoyer sa réponse. Le hook tourne dans
-- l'infra Auth, pas dans l'app : impossible à contourner en tapant
-- directement l'endpoint /token avec la clé anon.
--
-- ⚠️  ÉTAPE MANUELLE REQUISE APRÈS APPLICATION DE CETTE MIGRATION :
--     Dashboard Supabase → Authentication → Hooks
--       → « Password Verification Attempt » → Enable
--       → Type: Postgres | Schema: public
--       → Function: hook_password_verification_attempt
--
-- Portée : ne concerne que signInWithPassword. Les emails inexistants ne
-- déclenchent pas le hook (aucun user_id) — ce cas reste couvert par le
-- rate-limit par IP de Supabase (Authentication → Rate Limits).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Table de suivi : une ligne par utilisateur ayant des échecs en cours
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.auth_failed_login_attempts (
  user_id        uuid        PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  failed_count   integer     NOT NULL DEFAULT 0,
  last_failed_at timestamptz NOT NULL DEFAULT now(),
  locked_until   timestamptz
);

-- RLS activé, aucune policy : ni anon ni authenticated ne doivent jamais
-- lire ou écrire cette table. Seul le hook y accède (SECURITY DEFINER).
ALTER TABLE public.auth_failed_login_attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.auth_failed_login_attempts FROM anon, authenticated;

-- ----------------------------------------------------------------------------
-- 2. Fonction hook appelée par GoTrue
--    Entrée  : { "user_id": "<uuid>", "valid": <bool> }
--    Sortie  : {}  -> on laisse GoTrue poursuivre normalement
--              { "decision": "reject", "message": "..." } -> connexion refusée
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.hook_password_verification_attempt(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  uid           uuid              := (event->>'user_id')::uuid;
  password_ok   boolean           := (event->>'valid')::boolean;
  max_attempts  constant integer  := 5;
  lock_duration constant interval := interval '30 minutes';
  lock_message  constant text     := 'Trop de tentatives de connexion. Compte bloqué, réessayez dans 30 minutes.';
  rec           public.auth_failed_login_attempts%ROWTYPE;
  new_count     integer;
BEGIN
  SELECT * INTO rec
  FROM public.auth_failed_login_attempts
  WHERE user_id = uid;

  -- a) Compte actuellement verrouillé : on refuse tout (même le bon mot de passe).
  IF rec.locked_until IS NOT NULL AND rec.locked_until > now() THEN
    RETURN jsonb_build_object('decision', 'reject', 'message', lock_message);
  END IF;

  -- b) Mot de passe correct : reset complet, on laisse passer.
  IF password_ok THEN
    DELETE FROM public.auth_failed_login_attempts WHERE user_id = uid;
    RETURN '{}'::jsonb;
  END IF;

  -- c) Mot de passe incorrect, aucune ligne existante : première tentative ratée.
  IF rec.user_id IS NULL THEN
    INSERT INTO public.auth_failed_login_attempts (user_id, failed_count, last_failed_at)
    VALUES (uid, 1, now());
    RETURN '{}'::jsonb;
  END IF;

  -- d) Mot de passe incorrect avec ligne existante : on repart de 1 si un
  --    ancien verrou a expiré ou si le dernier échec date de plus de 30 min,
  --    sinon on incrémente.
  IF rec.locked_until IS NOT NULL
     OR rec.last_failed_at < now() - lock_duration THEN
    new_count := 1;
  ELSE
    new_count := rec.failed_count + 1;
  END IF;

  IF new_count >= max_attempts THEN
    UPDATE public.auth_failed_login_attempts
    SET failed_count   = new_count,
        last_failed_at = now(),
        locked_until   = now() + lock_duration
    WHERE user_id = uid;

    RETURN jsonb_build_object('decision', 'reject', 'message', lock_message);
  END IF;

  UPDATE public.auth_failed_login_attempts
  SET failed_count   = new_count,
      last_failed_at = now(),
      locked_until   = NULL
  WHERE user_id = uid;

  -- Sous le seuil : GoTrue renverra son « identifiants invalides » habituel.
  RETURN '{}'::jsonb;
END;
$function$;

-- ----------------------------------------------------------------------------
-- 3. Permissions : seul le rôle interne de GoTrue peut exécuter le hook
-- ----------------------------------------------------------------------------

GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.hook_password_verification_attempt(jsonb) TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.hook_password_verification_attempt(jsonb) FROM anon, authenticated, public;
