-- ============================================================================
-- Notification d'une nouvelle inscription restaurant — via relais Vercel
-- Date : 2026-08-31
--
-- Supabase ne peut pas joindre api.telegram.org depuis sa région (handshake
-- TLS filtré, timeout systématique). Le trigger appelle donc la route
--   POST https://<app>/api/webhooks/new-restaurant
-- hébergée sur Vercel, qui relaie vers Telegram.
--
-- Ne se déclenche que pour les comptes « owner » (auto-inscription). Les
-- créations de caissier (role = 'cashier', via /api/staff/create) sont
-- ignorées.
--
-- ⚠️  PRÉ-REQUIS (AVANT d'appliquer cette migration) :
--   1. Route déployée sur Vercel : src/app/api/webhooks/new-restaurant/route.js
--   2. Variables d'env Vercel : RESTAURANT_WEBHOOK_SECRET, TELEGRAM_BOT_TOKEN,
--      TELEGRAM_CHAT_ID
--   3. Extension pg_net activée
--   4. Secrets Vault :
--        select vault.create_secret('https://<app>/api/webhooks/new-restaurant',
--                                   'new_restaurant_webhook_url');
--        select vault.create_secret('<meme_valeur_que_RESTAURANT_WEBHOOK_SECRET>',
--                                   'new_restaurant_webhook_secret');
--
-- L'appel réseau est asynchrone (net.http_post met en file et rend la main) ;
-- toute erreur est avalée : une inscription ne doit jamais échouer à cause de
-- la notification.
-- ============================================================================

-- Les secrets Telegram directs de la première version ne servent plus.
-- (Sans effet s'ils n'existent pas.)
DELETE FROM vault.secrets WHERE name IN ('telegram_bot_token', 'telegram_chat_id');

CREATE OR REPLACE FUNCTION public.notify_new_restaurant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  hook_url    text;
  hook_secret text;
BEGIN
  IF new.role IS DISTINCT FROM 'owner' THEN
    RETURN new;
  END IF;

  BEGIN
    SELECT decrypted_secret INTO hook_url
    FROM vault.decrypted_secrets WHERE name = 'new_restaurant_webhook_url';

    SELECT decrypted_secret INTO hook_secret
    FROM vault.decrypted_secrets WHERE name = 'new_restaurant_webhook_secret';

    IF hook_url IS NULL OR hook_secret IS NULL THEN
      RAISE WARNING 'notify_new_restaurant : secrets webhook manquants dans le Vault';
      RETURN new;
    END IF;

    PERFORM net.http_post(
      url     := hook_url,
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || hook_secret
      ),
      body    := jsonb_build_object(
        'name',        new.name,
        'owner_email', new.owner_email,
        'location',    new.location,
        'created_at',  new.created_at
      ),
      timeout_milliseconds := 15000
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'notify_new_restaurant : échec appel webhook (%)', SQLERRM;
  END;

  RETURN new;
END;
$function$;

DROP TRIGGER IF EXISTS trg_notify_new_restaurant ON public.restaurants;
CREATE TRIGGER trg_notify_new_restaurant
AFTER INSERT ON public.restaurants
FOR EACH ROW
EXECUTE FUNCTION public.notify_new_restaurant();
