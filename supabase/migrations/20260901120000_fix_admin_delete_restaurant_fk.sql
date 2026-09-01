-- ============================================================================
-- Fix admin_delete_restaurant : gestion des FK restaurant_id -> auth.users
-- Date : 2026-09-01
--
-- La v1 supprimait le compte auth avant de traiter les lignes filles qui
-- pointent vers cet id via restaurant_id (transactions, orders, expenses,
-- dishes, inventory, restaurant_tables, staff — toutes en NO ACTION), d'où
-- « violates foreign key constraint transactions_restaurant_id_fkey ».
--
-- Nouvelle logique :
--   * cible = 'cashier' -> on RÉATTRIBUE au gérant les données financières
--     (transactions, orders, expenses) pour ne pas perdre l'historique du CA,
--     on SUPPRIME le reste (daily_closings, dishes, inventory,
--     restaurant_tables, staff — config, doublons possibles), puis on
--     supprime le profil + le compte auth du caissier.
--   * cible = 'owner'   -> suppression complète de l'équipe, par restaurant_id
--     ∈ équipe (clé réelle des FK) + owner_email en filet.
--
-- Transactionnel : toute erreur (contrainte d'unicité sur une réattribution,
-- FK oubliée...) annule l'ensemble, rien n'est supprimé à moitié.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.admin_delete_restaurant(target_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  target    public.restaurants%ROWTYPE;
  owner_id  uuid;
  team_ids  uuid[];
BEGIN
  IF NOT public.is_master_admin() THEN
    RAISE EXCEPTION 'Action réservée au Master Admin.' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO target FROM public.restaurants WHERE id = target_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Restaurant introuvable.';
  END IF;

  IF target.is_super_admin THEN
    RAISE EXCEPTION 'Suppression d''un compte super admin interdite.';
  END IF;

  -- --------------------------------------------------------------------------
  -- CAS 1 : caissier
  -- --------------------------------------------------------------------------
  IF target.role IS DISTINCT FROM 'owner' THEN
    SELECT id INTO owner_id
    FROM public.restaurants
    WHERE owner_email = target.owner_email AND role = 'owner'
    LIMIT 1;

    IF owner_id IS NULL THEN
      RAISE EXCEPTION 'Gérant introuvable pour ce caissier. Supprimez le restaurant entier depuis la ligne du gérant.';
    END IF;

    -- Données financières : réattribuées au gérant.
    UPDATE public.transactions SET restaurant_id = owner_id WHERE restaurant_id = target.id;
    UPDATE public.orders       SET restaurant_id = owner_id WHERE restaurant_id = target.id;
    UPDATE public.expenses     SET restaurant_id = owner_id WHERE restaurant_id = target.id;

    -- Config / reconciliation : supprimées.
    DELETE FROM public.daily_closings    WHERE restaurant_id = target.id;
    DELETE FROM public.dishes            WHERE restaurant_id = target.id;
    DELETE FROM public.inventory         WHERE restaurant_id = target.id;
    DELETE FROM public.restaurant_tables WHERE restaurant_id = target.id;
    DELETE FROM public.staff             WHERE restaurant_id = target.id;

    DELETE FROM public.restaurants WHERE id = target.id;
    DELETE FROM auth.users WHERE id = target.id;

    RETURN jsonb_build_object(
      'scope', 'cashier',
      'owner_email', target.owner_email,
      'accounts_deleted', 1
    );
  END IF;

  -- --------------------------------------------------------------------------
  -- CAS 2 : gérant (efface toute l'équipe et toutes les données)
  -- --------------------------------------------------------------------------
  SELECT array_agg(id) INTO team_ids
  FROM public.restaurants
  WHERE owner_email = target.owner_email;

  DELETE FROM public.daily_closings    WHERE restaurant_id = ANY(team_ids) OR owner_email = target.owner_email;
  DELETE FROM public.transactions      WHERE restaurant_id = ANY(team_ids) OR owner_email = target.owner_email;
  DELETE FROM public.orders            WHERE restaurant_id = ANY(team_ids) OR owner_email = target.owner_email;
  DELETE FROM public.expenses          WHERE restaurant_id = ANY(team_ids) OR owner_email = target.owner_email;
  DELETE FROM public.inventory         WHERE restaurant_id = ANY(team_ids) OR owner_email = target.owner_email;
  DELETE FROM public.dishes            WHERE restaurant_id = ANY(team_ids) OR owner_email = target.owner_email;
  DELETE FROM public.restaurant_tables WHERE restaurant_id = ANY(team_ids) OR owner_email = target.owner_email;
  DELETE FROM public.staff             WHERE restaurant_id = ANY(team_ids);

  DELETE FROM public.restaurants WHERE owner_email = target.owner_email;
  DELETE FROM auth.users WHERE id = ANY(team_ids);

  RETURN jsonb_build_object(
    'scope', 'owner',
    'owner_email', target.owner_email,
    'accounts_deleted', coalesce(array_length(team_ids, 1), 0)
  );
END;
$function$;
