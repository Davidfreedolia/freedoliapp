-- ============================================
-- S1.9 — Drop is_demo from project_events
-- ============================================
-- El trigger ja no fa servir is_demo (S1.8). Columna redundant.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'project_events' AND column_name = 'is_demo'
  ) THEN
    ALTER TABLE public.project_events DROP COLUMN is_demo;
  END IF;
END $$;
