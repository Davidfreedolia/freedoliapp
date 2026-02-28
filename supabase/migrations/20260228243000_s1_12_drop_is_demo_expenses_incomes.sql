-- ============================================
-- S1.12 — Drop is_demo from expenses + incomes
-- ============================================
-- Idempotent. RLS ja és org-based (S1.11).
-- ============================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'expenses' AND column_name = 'is_demo'
  ) THEN
    ALTER TABLE public.expenses DROP COLUMN is_demo;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'incomes' AND column_name = 'is_demo'
  ) THEN
    ALTER TABLE public.incomes DROP COLUMN is_demo;
  END IF;
END $$;
