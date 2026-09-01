-- ============================================================================
-- Suppression du verrou de validation manuelle des nouveaux comptes restaurant
-- Date : 2026-09-01
--
-- CONTEXTE
-- Jusqu'ici, toute auto-inscription créait un restaurant is_active = false /
-- approved_at = NULL, en attente d'activation manuelle par le Master Admin
-- (God Mode). Pour une app jeune qui cherche encore à se faire connaître,
-- cette attente est un frein à l'activation : la personne s'inscrit motivée,
-- tombe sur l'écran d'attente, et ne revient pas.
--
-- NOUVEAU COMPORTEMENT
-- Un nouveau compte « owner » est actif immédiatement (is_active = true,
-- approved_at = now()). Le fondateur observe les nouveaux comptes via le
-- God Mode et suspend manuellement (is_active = false, suspended_at = now())
-- ceux qui posent problème. Le décompte des jours d'essai est suivi
-- manuellement pour l'instant — les vérifications automatiques (téléphone,
-- limites d'essai, fenêtre hors-ligne courte) viendront au fil de la croissance.
--
-- CE QUI NE CHANGE PAS
--   - La notif Telegram à chaque inscription (trigger notify_new_restaurant).
--   - Le blocage anti-forge de locataire : id = auth.uid(), role = 'owner',
--     owner_email = l'email du JWT. Le trigger fige toujours ces colonnes pour
--     toute écriture qui n'est ni service_role ni master admin.
--   - is_super_admin = false forcé à l'inscription.
--   - La suspension / réactivation / suppression par le Master Admin.
--   - L'écran « Compte suspendu » (dashboard) pour is_active = false après
--     approbation.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Trigger de protection : à l'INSERT d'auto-inscription, compte actif d'emblée
--    (le reste de la fonction est identique à la migration
--     20260830130000_fix_restaurant_tenant_isolation.sql)
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
    -- Auto-inscription : profil « owner, pour soi-même », actif immédiatement.
    -- L'observation et la suspension éventuelle se font a posteriori (God Mode).
    NEW.is_active      := true;
    NEW.is_super_admin := false;
    NEW.role           := 'owner';
    NEW.owner_email    := lower(auth.jwt() ->> 'email');
    NEW.approved_at    := now();
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

-- Le trigger lui-même (BEFORE INSERT OR UPDATE) est inchangé, pas besoin de le
-- recréer.

-- ----------------------------------------------------------------------------
-- 2. Policy INSERT : on retire la contrainte « is_active = false ».
--    Le trigger ci-dessus est désormais le seul maître de cette colonne ;
--    la policy ne garde que les garde-fous anti-forge de locataire.
--    (PostgreSQL évalue le WITH CHECK sur la ligne APRÈS passage des BEFORE
--     triggers : garder « is_active = false » ici casserait l'inscription.)
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Inscription_Securisee" ON public.restaurants;
CREATE POLICY "Inscription_Securisee"
ON public.restaurants
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = id
  AND is_super_admin = false
  AND role = 'owner'
  AND lower(owner_email) = lower(auth.jwt() ->> 'email')
);

-- ----------------------------------------------------------------------------
-- 3. Rattrapage du backlog : activer les comptes actuellement EN ATTENTE
--    (jamais approuvés). Ne touche PAS aux comptes suspendus
--    (is_active = false AND approved_at IS NOT NULL).
--
--    >>> Si tu préfères examiner ce backlog un par un dans le God Mode avant
--        de l'ouvrir, supprime ce bloc UPDATE avant d'appliquer la migration.
-- ----------------------------------------------------------------------------

UPDATE public.restaurants
SET is_active   = true,
    approved_at = now()
WHERE role = 'owner'
  AND is_active = false
  AND approved_at IS NULL;
