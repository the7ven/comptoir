-- ============================================================================
-- CRITIQUE — Cloisonnement multi-restaurant : blocage de la forge d'owner_email
-- Date : 2026-08-30
--
-- FAILLE CORRIGÉE
-- La policy INSERT « Inscription_Securisee » sur public.restaurants ne
-- contraignait ni owner_email ni role, et le trigger de protection des
-- colonnes privilégiées ne se déclenchait qu'en BEFORE UPDATE.
--
-- => Tout utilisateur authentifié pouvait appeler directement PostgREST :
--      POST /rest/v1/restaurants
--      { "id": "<son auth.uid>", "owner_email": "<email d'une victime>",
--        "role": "cashier", "is_active": false }
--    Le CHECK passait. Ensuite get_my_owner_email() / get_active_owner_email()
--    (qui font juste SELECT owner_email FROM restaurants WHERE id = auth.uid(),
--    sans contrôle de is_active) renvoyaient l'email de la victime, ce qui
--    ouvrait en LECTURE ET ÉCRITURE toutes ses données via les policies
--    « Acces_Shared_* » / « Acces_Partage_* » / « Team_*_Daily_Closings » :
--      orders, transactions, expenses, inventory, dishes, restaurant_tables,
--      daily_closings.
--    => Rupture totale d'isolation entre locataires.
--
-- CE QUE FAIT CETTE MIGRATION
--   1. Policy INSERT durcie : on ne peut créer qu'une ligne « owner » pour
--      soi-même, owner_email = l'email de son propre JWT.
--   2. Trigger étendu à BEFORE INSERT OR UPDATE : normalise de force
--      is_active / is_super_admin / role / owner_email / approved_at /
--      suspended_at pour toute écriture qui n'est ni service_role (création
--      caissier par /api/staff/create) ni master admin. Défense en profondeur.
--   3. is_master_admin() : ajout de SET search_path (durcissement du
--      SECURITY DEFINER) + coalesce(false) au lieu de renvoyer NULL.
--
-- ----------------------------------------------------------------------------
-- ⚠️  AVANT D'APPLIQUER — auditer les données déjà présentes :
--
--   -- (a) lignes « owner » dont owner_email ne colle pas au compte auth :
--   select r.id, r.owner_email, u.email
--   from public.restaurants r
--   join auth.users u on u.id = r.id
--   where r.role = 'owner'
--     and lower(r.owner_email) <> lower(u.email);
--
--   -- (b) lignes « cashier » rattachées à un owner_email sans owner réel :
--   select r.*
--   from public.restaurants r
--   where r.role = 'cashier'
--     and not exists (
--       select 1 from public.restaurants o
--       where o.owner_email = r.owner_email and o.role = 'owner'
--     );
--
--   Toute ligne renvoyée par (a) ou (b) est potentiellement un compte forgé :
--   à examiner, supprimer, et prévenir le restaurant visé.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Policy INSERT : uniquement « owner, pour soi-même »
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Inscription_Securisee" ON public.restaurants;
CREATE POLICY "Inscription_Securisee"
ON public.restaurants
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = id
  AND is_super_admin = false
  AND is_active = false
  AND role = 'owner'
  AND lower(owner_email) = lower(auth.jwt() ->> 'email')
);

-- Rappel : le master admin continue de passer par « Master_Admin_Full_Access »
-- (FOR ALL USING is_master_admin()), et le service_role bypasse totalement RLS.
-- Cette policy ne concerne que l'auto-inscription depuis le navigateur.

-- ----------------------------------------------------------------------------
-- 2. Trigger de protection : BEFORE INSERT OR UPDATE
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.protect_restaurant_privileged_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- service_role (création caissier via /api/staff/create) et master admin :
  -- ces chemins sont déjà validés côté serveur, on ne modifie rien.
  IF (auth.jwt() ->> 'role') = 'service_role' OR public.is_master_admin() THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    -- Auto-inscription : profil « owner, pour soi, en attente de validation ».
    NEW.is_active      := false;
    NEW.is_super_admin := false;
    NEW.role           := 'owner';
    NEW.owner_email    := lower(auth.jwt() ->> 'email');
    NEW.approved_at    := NULL;
    NEW.suspended_at   := NULL;
  ELSE
    -- UPDATE : colonnes privilégiées figées sur l'ancienne valeur.
    NEW.is_active      := OLD.is_active;
    NEW.is_super_admin := OLD.is_super_admin;
    NEW.role           := OLD.role;
    NEW.owner_email    := OLD.owner_email;
    NEW.approved_at    := OLD.approved_at;
    NEW.suspended_at   := OLD.suspended_at;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_protect_restaurant_privileged_columns ON public.restaurants;
CREATE TRIGGER trg_protect_restaurant_privileged_columns
BEFORE INSERT OR UPDATE ON public.restaurants
FOR EACH ROW
EXECUTE FUNCTION public.protect_restaurant_privileged_columns();

-- ----------------------------------------------------------------------------
-- 3. Durcissement de is_master_admin()
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_master_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT coalesce(
    (SELECT is_super_admin FROM public.restaurants WHERE id = auth.uid()),
    false
  );
$function$;
