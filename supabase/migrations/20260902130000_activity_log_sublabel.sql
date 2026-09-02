-- ============================================================================
-- Journal d'activité : sous-libellé + table encaissée
-- Date : 2026-09-02  (suite de 20260902120000)
--
--   - colonne `sub_label` : descripteur secondaire (moyen de paiement,
--     catégorie de dépense, résumé d'articles) ;
--   - encaissement : `label` devient la TABLE encaissée (au lieu du moyen de
--     paiement), qui passe en `sub_label`.
--
-- Objectif : dans le Journal, l'encaissement affiche « Table 04 » suivi du
-- moyen de paiement, et l'aperçu de facture est proposé.
-- ============================================================================

ALTER TABLE public.activity_log ADD COLUMN IF NOT EXISTS sub_label text;

CREATE OR REPLACE FUNCTION public.log_activity(
  p_owner_email   text,
  p_restaurant_id uuid,
  p_action        text,
  p_entity_type   text,
  p_entity_id     text,
  p_label         text,
  p_amount        numeric,
  p_occurred_at   timestamptz,
  p_sub_label     text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_name text;
  v_role text;
BEGIN
  SELECT name, role INTO v_name, v_role
  FROM public.restaurants WHERE id = auth.uid();

  INSERT INTO public.activity_log (
    owner_email, restaurant_id, actor_name, actor_role, action,
    entity_type, entity_id, label, sub_label, amount, source, occurred_at
  ) VALUES (
    lower(p_owner_email), p_restaurant_id, v_name, v_role, p_action,
    p_entity_type, p_entity_id, p_label, p_sub_label, p_amount,
    CASE WHEN now() - coalesce(p_occurred_at, now()) > interval '90 seconds'
         THEN 'offline' ELSE 'online' END,
    coalesce(p_occurred_at, now())
  );
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'log_activity(%): %', p_action, SQLERRM;
END;
$function$;

CREATE OR REPLACE FUNCTION public.trg_activity_order_ins() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
BEGIN
  PERFORM public.log_activity(NEW.owner_email, NEW.restaurant_id, 'order.create',
    'order', NEW.id, NEW.table_number, NEW.total_amount, NEW.created_at, NEW.items_summary);
  RETURN NEW;
END; $function$;

CREATE OR REPLACE FUNCTION public.trg_activity_order_del() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
BEGIN
  PERFORM public.log_activity(OLD.owner_email, OLD.restaurant_id, 'order.cancel',
    'order', OLD.id, OLD.table_number, OLD.total_amount, now(), OLD.items_summary);
  RETURN OLD;
END; $function$;

CREATE OR REPLACE FUNCTION public.trg_activity_transaction_ins() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
BEGIN
  -- label = la table encaissée ; sub_label = le moyen de paiement.
  PERFORM public.log_activity(NEW.owner_email, NEW.restaurant_id, 'payment.create',
    'transaction', NEW.id::text, NEW.table_number, NEW.amount, NEW.created_at, NEW.payment_method);
  RETURN NEW;
END; $function$;

CREATE OR REPLACE FUNCTION public.trg_activity_expense_ins() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
BEGIN
  PERFORM public.log_activity(NEW.owner_email, NEW.restaurant_id, 'expense.create',
    'expense', NEW.id::text, NEW.label, NEW.amount, NEW.created_at, NEW.category);
  RETURN NEW;
END; $function$;

CREATE OR REPLACE FUNCTION public.trg_activity_expense_del() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
BEGIN
  PERFORM public.log_activity(OLD.owner_email, OLD.restaurant_id, 'expense.delete',
    'expense', OLD.id::text, OLD.label, OLD.amount, now(), OLD.category);
  RETURN OLD;
END; $function$;
