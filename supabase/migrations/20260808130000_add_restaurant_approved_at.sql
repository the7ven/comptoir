-- ============================================================================
-- Ajout du suivi de date/heure de création + approbation des comptes restaurant
-- Date : 2026-08-08
--
-- `created_at` existe déjà (rempli automatiquement à l'inscription).
-- `approved_at` est nouveau : renseigné uniquement quand le Master Admin
-- active un restaurant (bouton "Activer" dans le God Mode). NULL tant que
-- le compte est en attente de validation.
-- ============================================================================

ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS approved_at timestamptz;

-- On ajoute approved_at à la liste des colonnes verrouillées par le trigger
-- de la migration précédente : seul le master admin peut la modifier
-- (même logique que is_active/is_super_admin/role/owner_email).
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
  END IF;
  RETURN NEW;
END;
$function$;
