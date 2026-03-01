-- ============================================
-- S1.14 — recurring_expenses + recurring_expense_occurrences org-scoped, drop is_demo
-- ============================================

-- B1) Assegura org_id existeix (S1.2 ja el pot haver afegit)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'recurring_expenses' AND column_name = 'org_id') THEN
    ALTER TABLE public.recurring_expenses ADD COLUMN org_id uuid;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'recurring_expense_occurrences' AND column_name = 'org_id') THEN
    ALTER TABLE public.recurring_expense_occurrences ADD COLUMN org_id uuid;
  END IF;
END $$;

-- B2) Backfill org_id
-- recurring_expenses: project_id -> projects.org_id, then user_id -> org_memberships
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'recurring_expenses' AND column_name = 'project_id') THEN
    UPDATE public.recurring_expenses r
    SET org_id = p.org_id
    FROM public.projects p
    WHERE r.project_id = p.id AND p.org_id IS NOT NULL AND r.org_id IS NULL;
  END IF;
END $$;

UPDATE public.recurring_expenses r
SET org_id = (SELECT om.org_id FROM public.org_memberships om WHERE om.user_id = r.user_id ORDER BY om.created_at LIMIT 1)
WHERE r.org_id IS NULL AND r.user_id IS NOT NULL;

-- recurring_expense_occurrences: recurring_expense_id -> recurring_expenses.org_id
UPDATE public.recurring_expense_occurrences ro
SET org_id = r.org_id
FROM public.recurring_expenses r
WHERE ro.recurring_expense_id = r.id AND r.org_id IS NOT NULL AND ro.org_id IS NULL;

-- recurring_expense_occurrences: expense_id -> expenses.org_id (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'recurring_expense_occurrences' AND column_name = 'expense_id') THEN
    UPDATE public.recurring_expense_occurrences ro
    SET org_id = e.org_id
    FROM public.expenses e
    WHERE ro.expense_id = e.id AND e.org_id IS NOT NULL AND ro.org_id IS NULL;
  END IF;
END $$;

-- Fallback: user_id -> org_memberships
UPDATE public.recurring_expense_occurrences ro
SET org_id = (SELECT om.org_id FROM public.org_memberships om WHERE om.user_id = ro.user_id ORDER BY om.created_at LIMIT 1)
WHERE ro.org_id IS NULL AND ro.user_id IS NOT NULL;

-- B3) NOT NULL condicional + index
DO $$
DECLARE
  r_nulls bigint;
  o_nulls bigint;
BEGIN
  SELECT COUNT(*) INTO r_nulls FROM public.recurring_expenses WHERE org_id IS NULL;
  SELECT COUNT(*) INTO o_nulls FROM public.recurring_expense_occurrences WHERE org_id IS NULL;
  IF r_nulls > 0 THEN
    RAISE WARNING 'S1.14: recurring_expenses té % files amb org_id NULL', r_nulls;
  ELSE
    ALTER TABLE public.recurring_expenses ALTER COLUMN org_id SET NOT NULL;
  END IF;
  IF o_nulls > 0 THEN
    RAISE WARNING 'S1.14: recurring_expense_occurrences té % files amb org_id NULL', o_nulls;
  ELSE
    ALTER TABLE public.recurring_expense_occurrences ALTER COLUMN org_id SET NOT NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_recurring_expenses_org_id ON public.recurring_expenses(org_id);
CREATE INDEX IF NOT EXISTS idx_recurring_expense_occurrences_org_id ON public.recurring_expense_occurrences(org_id);

-- B4) Reescriure generate_recurring_expenses() sense is_demo (expenses ja no té is_demo des de S1.12)
CREATE OR REPLACE FUNCTION public.generate_recurring_expenses()
RETURNS integer AS $$
DECLARE
  v_recurring RECORD;
  v_category_name text;
  v_current_date date := CURRENT_DATE;
  v_current_day integer := EXTRACT(DAY FROM v_current_date);
  v_target_month date;
  v_period text;
  v_expense_date date;
  v_generated_count integer := 0;
  v_existing_count integer;
BEGIN
  -- Per cada recurring expense actiu amb categoria (filtrat per orgs de l'usuari)
  FOR v_recurring IN
    SELECT re.*, fc.name as category_name
    FROM public.recurring_expenses re
    LEFT JOIN public.finance_categories fc ON fc.id = re.category_id
    WHERE re.is_active = true
      AND re.org_id IN (SELECT om.org_id FROM public.org_memberships om WHERE om.user_id = auth.uid())
  LOOP
    IF v_recurring.category_id IS NULL OR v_recurring.category_name IS NULL THEN
      CONTINUE;
    END IF;
    IF v_recurring.day_of_month > v_current_day THEN
      CONTINUE;
    END IF;

    v_target_month := date_trunc('month', v_current_date);
    v_expense_date := LEAST(
      (v_target_month + (v_recurring.day_of_month - 1) * INTERVAL '1 day')::date,
      (v_target_month + INTERVAL '1 month' - INTERVAL '1 day')::date
    );
    v_period := to_char(v_expense_date, 'YYYY-MM');

    -- expenses ja no té is_demo (S1.12)
    SELECT COUNT(*) INTO v_existing_count
    FROM public.expenses e
    WHERE e.recurring_expense_id = v_recurring.id
      AND e.recurring_period = v_period;

    IF v_existing_count = 0 THEN
      INSERT INTO public.expenses (
        user_id,
        org_id,
        project_id,
        category_id,
        category,
        supplier_id,
        description,
        amount,
        currency,
        expense_date,
        payment_status,
        notes,
        is_recurring,
        recurring_expense_id,
        recurring_status,
        recurring_period
      ) VALUES (
        v_recurring.user_id,
        v_recurring.org_id,
        v_recurring.project_id,
        v_recurring.category_id,
        v_recurring.category_name,
        v_recurring.supplier_id,
        v_recurring.description,
        v_recurring.amount,
        v_recurring.currency,
        v_expense_date,
        'pending',
        v_recurring.notes,
        true,
        v_recurring.id,
        'expected',
        v_period
      );
      v_generated_count := v_generated_count + 1;
    END IF;

    UPDATE public.recurring_expenses
    SET
      next_generation_date = (v_target_month + INTERVAL '1 month')::date,
      last_generated_at = now()
    WHERE id = v_recurring.id;
  END LOOP;

  RETURN v_generated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- B5) DROP is_demo (idempotent)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'recurring_expenses' AND column_name = 'is_demo') THEN
    ALTER TABLE public.recurring_expenses DROP COLUMN is_demo;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'recurring_expense_occurrences' AND column_name = 'is_demo') THEN
    ALTER TABLE public.recurring_expense_occurrences DROP COLUMN is_demo;
  END IF;
END $$;

-- B6) RLS — drop user-based, create org-based
ALTER TABLE public.recurring_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_expense_occurrences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own recurring expenses" ON public.recurring_expenses;
DROP POLICY IF EXISTS "Users can view own recurring expenses" ON public.recurring_expenses;
DROP POLICY IF EXISTS "Users can insert own recurring expenses" ON public.recurring_expenses;
DROP POLICY IF EXISTS "Users can update own recurring expenses" ON public.recurring_expenses;
DROP POLICY IF EXISTS "Users can delete own recurring expenses" ON public.recurring_expenses;

DROP POLICY IF EXISTS "Users can view own recurring expense occurrences" ON public.recurring_expense_occurrences;
DROP POLICY IF EXISTS "Users can insert own recurring expense occurrences" ON public.recurring_expense_occurrences;
DROP POLICY IF EXISTS "Users can update own recurring expense occurrences" ON public.recurring_expense_occurrences;
DROP POLICY IF EXISTS "Users can delete own recurring expense occurrences" ON public.recurring_expense_occurrences;

CREATE POLICY "Org members can manage recurring expenses"
ON public.recurring_expenses
FOR ALL
TO authenticated
USING (public.is_org_member(org_id))
WITH CHECK (public.is_org_member(org_id));

CREATE POLICY "Org members can manage recurring expense occurrences"
ON public.recurring_expense_occurrences
FOR ALL
TO authenticated
USING (public.is_org_member(org_id))
WITH CHECK (public.is_org_member(org_id));
