-- ============================================================================
-- Fix RLS sur daily_closings — clôture de caisse impossible
-- Date : 2026-08-10
--
-- Contexte : daily_closings a RLS activé mais ne possédait aucune policy
-- INSERT (ni SELECT), donc CashierTabContent.handleRegisterClosing() échouait
-- systématiquement avec "new row violates row-level security policy" — ce
-- n'est pas un bug du code applicatif, l'insert envoyé était déjà correct.
--
-- Reprend exactement le même modèle de sécurité que le reste de l'app
-- (cf. 20260808120000_security_hardening.sql) : owner_email =
-- get_my_owner_email() autorise le owner ET ses caissiers de la même équipe,
-- jamais un restaurant tiers.
-- ============================================================================

ALTER TABLE public.daily_closings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Team_Insert_Daily_Closings" ON public.daily_closings;
CREATE POLICY "Team_Insert_Daily_Closings"
ON public.daily_closings
FOR INSERT
TO authenticated
WITH CHECK (owner_email = public.get_my_owner_email());

-- Nécessaire pour l'indicateur "Caisse clôturée / non clôturée" de la Vue
-- d'ensemble (branche overview-dashboard-insights), qui relit cette table.
DROP POLICY IF EXISTS "Team_Select_Daily_Closings" ON public.daily_closings;
CREATE POLICY "Team_Select_Daily_Closings"
ON public.daily_closings
FOR SELECT
TO authenticated
USING (owner_email = public.get_my_owner_email());
