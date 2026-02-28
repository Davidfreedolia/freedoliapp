-- ============================================
-- S1.11 — expenses + incomes ORG-SCOPE READY (no drop is_demo encara)
-- ============================================
-- org_id ja afegit a S1.2. Backfill, NOT NULL condicional, RLS org-based.
-- ============================================

-- B1) Assegura org_id existeix (S1.2 ja el pot haver afegit)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'expenses' AND column_name = 'org_id') THEN
    ALTER TABLE public.expenses ADD COLUMN org_id uuid;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'incomes' AND column_name = 'org_id') THEN
    ALTER TABLE public.incomes ADD COLUMN org_id uuid;
  END IF;
END $$;

-- B2) Backfill: project_id primer, després user_id via org_memberships
UPDATE public.expenses e
SET org_id = p.org_id
FROM public.projects p
WHERE e.project_id = p.id AND p.org_id IS NOT NULL AND e.org_id IS NULL;

UPDATE public.incomes i
SET org_id = p.org_id
FROM public.projects p
WHERE i.project_id = p.id AND p.org_id IS NOT NULL AND i.org_id IS NULL;

UPDATE public.expenses e
SET org_id = (SELECT om.org_id FROM public.org_memberships om WHERE om.user_id = e.user_id ORDER BY om.created_at LIMIT 1)
WHERE e.org_id IS NULL AND e.user_id IS NOT NULL;

UPDATE public.incomes i
SET org_id = (SELECT om.org_id FROM public.org_memberships om WHERE om.user_id = i.user_id ORDER BY om.created_at LIMIT 1)
WHERE i.org_id IS NULL AND i.user_id IS NOT NULL;

-- B3) Enforce NOT NULL només si nulls = 0
DO $$
DECLARE
  exp_nulls bigint;
  inc_nulls bigint;
BEGIN
  SELECT COUNT(*) INTO exp_nulls FROM public.expenses WHERE org_id IS NULL;
  SELECT COUNT(*) INTO inc_nulls FROM public.incomes WHERE org_id IS NULL;
  IF exp_nulls > 0 THEN
    RAISE WARNING 'S1.11: expenses té % files amb org_id NULL; no es força NOT NULL', exp_nulls;
  ELSE
    ALTER TABLE public.expenses ALTER COLUMN org_id SET NOT NULL;
  END IF;
  IF inc_nulls > 0 THEN
    RAISE WARNING 'S1.11: incomes té % files amb org_id NULL; no es força NOT NULL', inc_nulls;
  ELSE
    ALTER TABLE public.incomes ALTER COLUMN org_id SET NOT NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_expenses_org_id ON public.expenses(org_id);
CREATE INDEX IF NOT EXISTS idx_incomes_org_id ON public.incomes(org_id);

-- B4) RLS — drop user-based, create org-based
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incomes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own expenses" ON public.expenses;
DROP POLICY IF EXISTS "Users can insert own expenses" ON public.expenses;
DROP POLICY IF EXISTS "Users can update own expenses" ON public.expenses;
DROP POLICY IF EXISTS "Users can delete own expenses" ON public.expenses;

DROP POLICY IF EXISTS "Users can view own incomes" ON public.incomes;
DROP POLICY IF EXISTS "Users can insert own incomes" ON public.incomes;
DROP POLICY IF EXISTS "Users can update own incomes" ON public.incomes;
DROP POLICY IF EXISTS "Users can delete own incomes" ON public.incomes;

CREATE POLICY "Org members can manage expenses"
ON public.expenses
FOR ALL
TO authenticated
USING (public.is_org_member(org_id))
WITH CHECK (public.is_org_member(org_id));

CREATE POLICY "Org members can manage incomes"
ON public.incomes
FOR ALL
TO authenticated
USING (public.is_org_member(org_id))
WITH CHECK (public.is_org_member(org_id));
