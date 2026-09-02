-- ============================================================================
-- orders.updated_at — support du pull delta hors-ligne (Phase 6)
-- Date : 2026-09-01
--
-- La synchro descendante des commandes (src/lib/offline/pull.js) veut ne
-- récupérer que les lignes changées depuis le dernier passage :
--   select * from orders where updated_at > <curseur>
-- La table n'avait pas de colonne de suivi de modification.
--
-- Cette migration :
--   1. ajoute updated_at (NOT NULL, défaut now()) ;
--   2. le back-fill sur created_at pour les lignes existantes ;
--   3. installe un trigger BEFORE UPDATE qui le rafraîchit à chaque écriture.
--
-- Aucun impact applicatif : le client n'envoie jamais updated_at, le défaut
-- et le trigger s'en chargent. RLS inchangée.
-- ============================================================================

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS updated_at timestamptz;

UPDATE public.orders
  SET updated_at = coalesce(updated_at, created_at, now())
  WHERE updated_at IS NULL;

ALTER TABLE public.orders
  ALTER COLUMN updated_at SET DEFAULT now(),
  ALTER COLUMN updated_at SET NOT NULL;

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_orders_touch_updated_at ON public.orders;
CREATE TRIGGER trg_orders_touch_updated_at
BEFORE UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.touch_updated_at();

-- Index pour le filtre du pull delta (updated_at > curseur, par restaurant).
CREATE INDEX IF NOT EXISTS idx_orders_owner_updated_at
  ON public.orders (owner_email, updated_at);
