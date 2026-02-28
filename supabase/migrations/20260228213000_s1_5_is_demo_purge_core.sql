-- ============================================
-- S1.5 — is_demo PURGE CORE (Fase 1)
-- ============================================
-- Elimina columna is_demo de taules org-scoped: projects, suppliers, supplier_quotes, purchase_orders.
-- Idempotent: si la columna no existeix, no es llança error.
-- ============================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'projects' AND column_name = 'is_demo'
  ) THEN
    ALTER TABLE public.projects DROP COLUMN is_demo;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'suppliers' AND column_name = 'is_demo'
  ) THEN
    ALTER TABLE public.suppliers DROP COLUMN is_demo;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'supplier_quotes' AND column_name = 'is_demo'
  ) THEN
    ALTER TABLE public.supplier_quotes DROP COLUMN is_demo;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'purchase_orders' AND column_name = 'is_demo'
  ) THEN
    ALTER TABLE public.purchase_orders DROP COLUMN is_demo;
  END IF;
END $$;
