-- ============================================================================
-- Journal d'activité global — Phase 3.9 du chantier hors-ligne
-- Date : 2026-09-02
--
-- Une table `activity_log` alimentée par des triggers sur orders /
-- transactions / expenses / daily_closings. Chaque écriture métier — quel que
-- soit l'appareil, action en direct OU rejeu de l'outbox — y laisse une
-- entrée : qui, quoi, combien, en ligne / hors-ligne.
--
-- « en ligne / hors-ligne » : les 4 tables portent un `created_at` fixé par le
-- client au moment réel de l'action (conservé tel quel au rejeu). Le trigger
-- compare ce `created_at` à l'heure d'arrivée serveur : écart > 90 s => l'action
-- a dormi dans une outbox => hors-ligne.
--
-- Attribution de l'acteur : lecture de restaurants WHERE id = auth.uid(). Pour
-- une action rejouée, c'est le compte connecté au moment de la synchro
-- (en pratique le même — le caissier qui a travaillé hors-ligne est celui qui
-- reprend le service).
--
-- Visibilité (RLS) : gérant + caissiers de l'équipe. Les annulations de
-- commande et suppressions de dépense ne sont visibles que du gérant.
--
-- Conservation : illimitée (pas de purge).
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.activity_log (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_email   text NOT NULL,
  restaurant_id uuid,
  actor_name    text,
  actor_role    text,
  action        text NOT NULL,   -- order.create | order.cancel | payment.create
                                 -- | expense.create | expense.delete | closing.create
  entity_type   text,
  entity_id     text,
  label         text,
  amount        numeric,
  source        text NOT NULL DEFAULT 'online',  -- online | offline
  occurred_at   timestamptz NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_log_owner_occurred
  ON public.activity_log (owner_email, occurred_at DESC);

ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

-- Lecture : équipe ; annulations / suppressions réservées au gérant.
DROP POLICY IF EXISTS "Team_Read_Activity_Log" ON public.activity_log;
CREATE POLICY "Team_Read_Activity_Log"
ON public.activity_log
FOR SELECT
TO authenticated
USING (
  owner_email = public.get_my_owner_email()
  AND (
    action NOT IN ('order.cancel', 'expense.delete')
    OR EXISTS (SELECT 1 FROM public.restaurants WHERE id = auth.uid() AND role = 'owner')
  )
);
-- Aucune policy INSERT/UPDATE/DELETE : seuls les triggers (SECURITY DEFINER)
-- écrivent dans cette table.

-- ----------------------------------------------------------------------------
-- Helper : insère une entrée, classe online/offline, résout l'acteur.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.log_activity(
  p_owner_email   text,
  p_restaurant_id uuid,
  p_action        text,
  p_entity_type   text,
  p_entity_id     text,
  p_label         text,
  p_amount        numeric,
  p_occurred_at   timestamptz
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
    entity_type, entity_id, label, amount, source, occurred_at
  ) VALUES (
    lower(p_owner_email), p_restaurant_id, v_name, v_role, p_action,
    p_entity_type, p_entity_id, p_label, p_amount,
    CASE WHEN now() - coalesce(p_occurred_at, now()) > interval '90 seconds'
         THEN 'offline' ELSE 'online' END,
    coalesce(p_occurred_at, now())
  );
EXCEPTION WHEN OTHERS THEN
  -- Le journal ne doit JAMAIS faire échouer une écriture métier.
  RAISE WARNING 'log_activity(%): %', p_action, SQLERRM;
END;
$function$;

-- ----------------------------------------------------------------------------
-- Triggers
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_activity_order_ins() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
BEGIN
  PERFORM public.log_activity(NEW.owner_email, NEW.restaurant_id, 'order.create',
    'order', NEW.id, NEW.table_number, NEW.total_amount, NEW.created_at);
  RETURN NEW;
END; $function$;

CREATE OR REPLACE FUNCTION public.trg_activity_order_del() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
BEGIN
  PERFORM public.log_activity(OLD.owner_email, OLD.restaurant_id, 'order.cancel',
    'order', OLD.id, OLD.table_number, OLD.total_amount, now());
  RETURN OLD;
END; $function$;

CREATE OR REPLACE FUNCTION public.trg_activity_transaction_ins() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
BEGIN
  PERFORM public.log_activity(NEW.owner_email, NEW.restaurant_id, 'payment.create',
    'transaction', NEW.id::text, NEW.payment_method, NEW.amount, NEW.created_at);
  RETURN NEW;
END; $function$;

CREATE OR REPLACE FUNCTION public.trg_activity_expense_ins() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
BEGIN
  PERFORM public.log_activity(NEW.owner_email, NEW.restaurant_id, 'expense.create',
    'expense', NEW.id::text, NEW.label, NEW.amount, NEW.created_at);
  RETURN NEW;
END; $function$;

CREATE OR REPLACE FUNCTION public.trg_activity_expense_del() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
BEGIN
  PERFORM public.log_activity(OLD.owner_email, OLD.restaurant_id, 'expense.delete',
    'expense', OLD.id::text, OLD.label, OLD.amount, now());
  RETURN OLD;
END; $function$;

CREATE OR REPLACE FUNCTION public.trg_activity_closing_ins() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
BEGIN
  PERFORM public.log_activity(NEW.owner_email, NEW.restaurant_id, 'closing.create',
    'daily_closing', NEW.id::text, NEW.date::text, NEW.real_amount, NEW.created_at);
  RETURN NEW;
END; $function$;

DROP TRIGGER IF EXISTS trg_activity_order_ins ON public.orders;
CREATE TRIGGER trg_activity_order_ins AFTER INSERT ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.trg_activity_order_ins();

DROP TRIGGER IF EXISTS trg_activity_order_del ON public.orders;
CREATE TRIGGER trg_activity_order_del AFTER DELETE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.trg_activity_order_del();

DROP TRIGGER IF EXISTS trg_activity_transaction_ins ON public.transactions;
CREATE TRIGGER trg_activity_transaction_ins AFTER INSERT ON public.transactions
FOR EACH ROW EXECUTE FUNCTION public.trg_activity_transaction_ins();

DROP TRIGGER IF EXISTS trg_activity_expense_ins ON public.expenses;
CREATE TRIGGER trg_activity_expense_ins AFTER INSERT ON public.expenses
FOR EACH ROW EXECUTE FUNCTION public.trg_activity_expense_ins();

DROP TRIGGER IF EXISTS trg_activity_expense_del ON public.expenses;
CREATE TRIGGER trg_activity_expense_del AFTER DELETE ON public.expenses
FOR EACH ROW EXECUTE FUNCTION public.trg_activity_expense_del();

DROP TRIGGER IF EXISTS trg_activity_closing_ins ON public.daily_closings;
CREATE TRIGGER trg_activity_closing_ins AFTER INSERT ON public.daily_closings
FOR EACH ROW EXECUTE FUNCTION public.trg_activity_closing_ins();
