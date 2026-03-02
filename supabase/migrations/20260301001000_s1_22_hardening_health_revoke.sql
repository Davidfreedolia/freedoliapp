-- ============================================
-- S1.22 — HARDENING: revoke API access to health tables
-- ============================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='health_check_definitions'
  ) THEN
    REVOKE ALL ON public.health_check_definitions FROM anon, authenticated;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='health_run_results'
  ) THEN
    REVOKE ALL ON public.health_run_results FROM anon, authenticated;
  END IF;
END $$;
