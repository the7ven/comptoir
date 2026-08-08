-- ============================================================================
-- Migration de durcissement sécurité — RestoPay
-- Date : 2026-08-08
--
-- Contexte : audit du code + inspection des policies RLS existantes a révélé
-- que get_active_owner_email() / get_my_owner_email() résolvent l'appartenance
-- via la table `staff`, alors que l'application stocke réellement les comptes
-- caissier dans `restaurants` (role = 'cashier'). Résultat : tout compte
-- caissier voit des données vides (menu, commandes, transactions...).
-- Cette migration :
--   1. Corrige ces deux fonctions pour lire `restaurants` (source de vérité réelle).
--   2. Ajoute une policy UPDATE manquante sur `restaurants` pour que le owner
--      puisse modifier son propre profil (nom, localisation, logo...).
--   3. Verrouille les colonnes privilégiées (is_active, is_super_admin, role,
--      owner_email) via un trigger : seul le master admin peut les modifier,
--      même si un appel API brut essaie de les inclure dans un UPDATE/INSERT.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Fix des fonctions de résolution d'appartenance (staff -> restaurants)
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_active_owner_email()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  found_owner_email TEXT;
BEGIN
  -- Source de vérité unique : la table restaurants. Une ligne "owner" a
  -- owner_email = son propre email ; une ligne "cashier" a owner_email =
  -- l'email du restaurant auquel elle est rattachée.
  SELECT owner_email INTO found_owner_email
  FROM public.restaurants
  WHERE id = auth.uid();

  RETURN found_owner_email;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_my_owner_email()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN (SELECT owner_email FROM public.restaurants WHERE id = auth.uid());
END;
$function$;

-- ----------------------------------------------------------------------------
-- 2. Policy UPDATE manquante sur restaurants (le owner peut modifier SA ligne)
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Owner_Update_Own_Row" ON public.restaurants;
CREATE POLICY "Owner_Update_Own_Row"
ON public.restaurants
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- ----------------------------------------------------------------------------
-- 3. Verrouillage des colonnes privilégiées au niveau colonne (pas seulement
--    ligne) : is_active / is_super_admin / role / owner_email ne peuvent être
--    changées que par le master admin, quel que soit le chemin (UI, script,
--    appel API direct avec un JWT authentifié classique).
-- ----------------------------------------------------------------------------

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
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_protect_restaurant_privileged_columns ON public.restaurants;
CREATE TRIGGER trg_protect_restaurant_privileged_columns
BEFORE UPDATE ON public.restaurants
FOR EACH ROW
EXECUTE FUNCTION public.protect_restaurant_privileged_columns();

-- Même verrouillage sur INSERT : is_super_admin=false était déjà forcé, on
-- fige maintenant aussi is_active=false pour empêcher un appel API brut de
-- contourner le workflow de validation manuelle du Master Admin.
DROP POLICY IF EXISTS "Inscription_Securisee" ON public.restaurants;
CREATE POLICY "Inscription_Securisee"
ON public.restaurants
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = id
  AND is_super_admin = false
  AND is_active = false
);
