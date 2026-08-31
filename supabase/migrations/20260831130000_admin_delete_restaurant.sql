-- ============================================================================
-- God Mode : suppression définitive d'un compte restaurant
-- Date : 2026-08-31
--
-- RPC appelée depuis la page /admin/master. Gardée par is_master_admin() :
-- un appel par un compte non super-admin lève une exception.
--
-- Portée :
--   * cible = 'owner'   -> supprime le compte propriétaire, TOUS ses comptes
--                          caissier, et toutes les données rattachées à son
--                          owner_email (menu, commandes, transactions,
--                          dépenses, stock, tables, clôtures).
--   * cible = 'cashier' -> supprime uniquement ce compte caissier. Les
--                          données du restaurant (propriété de l'owner) ne
--                          sont pas touchées.
--
-- Tout se fait dans la transaction de la fonction : si une suppression
-- échoue (contrainte FK oubliée...), l'ensemble est annulé, rien n'est
-- supprimé à moitié.
--
-- Garde-fou : refuse de supprimer une ligne is_super_admin = true.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.admin_delete_restaurant(target_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  target    public.restaurants%ROWTYPE;
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

  IF target.role = 'owner' THEN
    SELECT array_agg(id) INTO team_ids
    FROM public.restaurants
    WHERE owner_email = target.owner_email;

    -- Données rattachées à l'équipe (enfants avant parents).
    DELETE FROM public.daily_closings   WHERE owner_email = target.owner_email;
    DELETE FROM public.transactions      WHERE owner_email = target.owner_email;
    DELETE FROM public.orders            WHERE owner_email = target.owner_email;
    DELETE FROM public.expenses          WHERE owner_email = target.owner_email;
    DELETE FROM public.inventory         WHERE owner_email = target.owner_email;
    DELETE FROM public.dishes            WHERE owner_email = target.owner_email;
    DELETE FROM public.restaurant_tables WHERE owner_email = target.owner_email;

    -- Profils (owner + caissiers) puis comptes auth.
    DELETE FROM public.restaurants WHERE owner_email = target.owner_email;
    DELETE FROM auth.users WHERE id = ANY(team_ids);

    RETURN jsonb_build_object(
      'scope', 'owner',
      'owner_email', target.owner_email,
      'accounts_deleted', coalesce(array_length(team_ids, 1), 0)
    );
  ELSE
    DELETE FROM public.restaurants WHERE id = target.id;
    DELETE FROM auth.users WHERE id = target.id;

    RETURN jsonb_build_object(
      'scope', 'cashier',
      'owner_email', target.owner_email,
      'accounts_deleted', 1
    );
  END IF;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.admin_delete_restaurant(uuid) FROM anon, public;
GRANT  EXECUTE ON FUNCTION public.admin_delete_restaurant(uuid) TO authenticated;
