-- ============================================================================
-- Ajout du suivi de date de suspension des comptes restaurant
-- Date : 2026-08-08
--
-- Symétrique à approved_at : suspended_at est renseigné à chaque désactivation
-- par le Master Admin (bouton "Suspendre"). Ni l'un ni l'autre n'est jamais
-- effacé par l'action inverse — ce sont des horodatages "dernière fois que
-- X est arrivé", ce qui permet de distinguer :
--   - en attente de validation : is_active = false AND approved_at IS NULL
--   - suspendu (déjà approuvé un jour) : is_active = false AND approved_at IS NOT NULL
-- ============================================================================

ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS suspended_at timestamptz;

CREATE OR REPLACE FUNCTION public.protect_restaurant_privileged_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_master_admin() THEN
    NEW.is_active := OLD.is_active;
    NEW.is_super_admin := OLD.is_super_admin;
    NEW.role := OLD.role;
    NEW.owner_email := OLD.owner_email;
    NEW.approved_at := OLD.approved_at;
    NEW.suspended_at := OLD.suspended_at;
  END IF;
  RETURN NEW;
END;
$function$;
