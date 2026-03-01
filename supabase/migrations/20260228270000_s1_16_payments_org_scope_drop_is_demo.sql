-- ============================================
-- S1.16 — payments org-scoped, drop is_demo
-- ============================================

-- B1) Assegura org_id existeix (S1.2 ja el pot haver afegit)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'payments' AND column_name = 'org_id') THEN
    ALTER TABLE public.payments ADD COLUMN org_id uuid;
  END IF;
END $$;

-- B2) Backfill org_id

-- payments: expense_id -> expenses(org_id) (si la columna existeix)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'payments' AND column_name = 'expense_id') THEN
    UPDATE public.payments py
    SET org_id = e.org_id
    FROM public.expenses e
    WHERE py.expense_id = e.id AND e.org_id IS NOT NULL AND py.org_id IS NULL;
  END IF;
END $$;

-- payments: income_id -> incomes(org_id) (si la columna existeix)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'payments' AND column_name = 'income_id') THEN
    UPDATE public.payments py
    SET org_id = i.org_id
    FROM public.incomes i
    WHERE py.income_id = i.id AND i.org_id IS NOT NULL AND py.org_id IS NULL;
  END IF;
END $$;

-- payments: project_id -> projects(org_id)
UPDATE public.payments py
SET org_id = p.org_id
FROM public.projects p
WHERE py.project_id = p.id AND p.org_id IS NOT NULL AND py.org_id IS NULL;

-- payments: user_id -> org_memberships (fallback)
UPDATE public.payments py
SET org_id = (SELECT om.org_id FROM public.org_memberships om WHERE om.user_id = py.user_id ORDER BY om.created_at LIMIT 1)
WHERE py.org_id IS NULL AND py.user_id IS NOT NULL;

-- B3) NOT NULL condicional + index
DO $$
DECLARE
  v_nulls bigint;
BEGIN
  SELECT COUNT(*) INTO v_nulls FROM public.payments WHERE org_id IS NULL;
  IF v_nulls > 0 THEN
    RAISE WARNING 'S1.16: payments té % files amb org_id NULL', v_nulls;
  ELSE
    ALTER TABLE public.payments ALTER COLUMN org_id SET NOT NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_payments_org_id ON public.payments(org_id);

-- B4) DROP is_demo (idempotent)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'payments' AND column_name = 'is_demo') THEN
    ALTER TABLE public.payments DROP COLUMN is_demo;
  END IF;
END $$;

-- B5) RLS — drop user-based, create org-based
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own payments" ON public.payments;
DROP POLICY IF EXISTS "Users can insert own payments" ON public.payments;
DROP POLICY IF EXISTS "Users can update own payments" ON public.payments;
DROP POLICY IF EXISTS "Users can delete own payments" ON public.payments;

CREATE POLICY "Org members can manage payments"
ON public.payments
FOR ALL
TO authenticated
USING (public.is_org_member(org_id))
WITH CHECK (public.is_org_member(org_id));
