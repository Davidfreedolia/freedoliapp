-- F5 — Finance: Financial Ledger (scope) + Period Lock + RLS
-- F5.3 + F5.4

-----------------------------
-- 1) ENUMS
-----------------------------

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'financial_scope') THEN
    CREATE TYPE public.financial_scope AS ENUM ('company', 'project');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'financial_status') THEN
    CREATE TYPE public.financial_status AS ENUM ('draft', 'posted', 'locked');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'financial_event_type') THEN
    CREATE TYPE public.financial_event_type AS ENUM ('income', 'expense', 'transfer', 'adjustment');
  END IF;
END;
$$;

-----------------------------
-- 2) accounting_periods
-----------------------------

CREATE TABLE IF NOT EXISTS public.accounting_periods (
  org_id uuid NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  year int NOT NULL,
  quarter int NOT NULL CHECK (quarter BETWEEN 1 AND 4),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'locked')),
  locked_at timestamptz,
  locked_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT accounting_periods_pk PRIMARY KEY (org_id, year, quarter)
);

ALTER TABLE public.accounting_periods ENABLE ROW LEVEL SECURITY;

-- SELECT: org members
CREATE POLICY "Org members can select accounting_periods"
  ON public.accounting_periods
  FOR SELECT
  TO authenticated
  USING (public.is_org_member(org_id));

-- INSERT: owner/admin only
CREATE POLICY "Org owners/admins can insert accounting_periods"
  ON public.accounting_periods
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_org_owner_or_admin(org_id));

-- UPDATE: owner/admin only
CREATE POLICY "Org owners/admins can update accounting_periods"
  ON public.accounting_periods
  FOR UPDATE
  TO authenticated
  USING (public.is_org_owner_or_admin(org_id))
  WITH CHECK (public.is_org_owner_or_admin(org_id));

REVOKE ALL ON TABLE public.accounting_periods FROM PUBLIC;
REVOKE ALL ON TABLE public.accounting_periods FROM anon;
REVOKE ALL ON TABLE public.accounting_periods FROM authenticated;

-- updated_at trigger for accounting_periods

CREATE OR REPLACE FUNCTION public.set_accounting_periods_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS accounting_periods_set_updated_at ON public.accounting_periods;

CREATE TRIGGER accounting_periods_set_updated_at
BEFORE UPDATE ON public.accounting_periods
FOR EACH ROW
EXECUTE FUNCTION public.set_accounting_periods_updated_at();

-----------------------------
-- 3) financial_ledger
-----------------------------

CREATE TABLE IF NOT EXISTS public.financial_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  scope public.financial_scope NOT NULL,
  project_id uuid NULL REFERENCES public.projects(id) ON DELETE SET NULL,
  type public.financial_event_type NOT NULL,
  status public.financial_status NOT NULL DEFAULT 'draft',
  occurred_at date NOT NULL,
  cash_at date NULL,

  -- Original
  amount_original numeric(18,2) NOT NULL,
  currency_original text NOT NULL,

  -- Base (P&L)
  rate_pnl numeric(18,8) NOT NULL CHECK (rate_pnl > 0),
  amount_base_pnl numeric(18,2) NOT NULL,

  -- Base (Cash)
  rate_cash numeric(18,8) NULL CHECK (rate_cash > 0),
  amount_base_cash numeric(18,2) NULL,

  -- Refs / idempotència
  reference_type text NULL,
  reference_id uuid NULL,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  posted_by uuid NULL REFERENCES auth.users(id),
  locked_by uuid NULL REFERENCES auth.users(id),

  -- Meta
  note text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT financial_ledger_scope_project_coherence CHECK (
    (scope = 'company' AND project_id IS NULL)
    OR (scope = 'project' AND project_id IS NOT NULL)
  ),

  CONSTRAINT financial_ledger_reference_unique UNIQUE (org_id, reference_type, reference_id, type)
    DEFERRABLE INITIALLY IMMEDIATE
);

-- Unique constraint with partial semantics (reference_type/reference_id when present)
CREATE UNIQUE INDEX IF NOT EXISTS idx_financial_ledger_ref_unique
ON public.financial_ledger(org_id, reference_type, reference_id, type)
WHERE reference_type IS NOT NULL AND reference_id IS NOT NULL;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_financial_ledger_org_occurred_at
  ON public.financial_ledger(org_id, occurred_at);

CREATE INDEX IF NOT EXISTS idx_financial_ledger_org_cash_at
  ON public.financial_ledger(org_id, cash_at);

CREATE INDEX IF NOT EXISTS idx_financial_ledger_org_scope
  ON public.financial_ledger(org_id, scope);

CREATE INDEX IF NOT EXISTS idx_financial_ledger_project_id
  ON public.financial_ledger(project_id);

-- RLS for financial_ledger
ALTER TABLE public.financial_ledger ENABLE ROW LEVEL SECURITY;

-- SELECT:
-- - scope = 'company'  -> only org owners/admins (accountant roles can be included via helper later)
-- - scope = 'project'  -> any org member
CREATE POLICY "financial_ledger_select_scoped"
  ON public.financial_ledger
  FOR SELECT
  TO authenticated
  USING (
    (
      scope = 'company'
      AND public.is_org_owner_or_admin(org_id)
    ) OR (
      scope = 'project'
      AND public.is_org_member(org_id)
    )
  );

-- No INSERT/UPDATE/DELETE policies for authenticated: only service role / RPCs may modify

REVOKE ALL ON TABLE public.financial_ledger FROM PUBLIC;
REVOKE ALL ON TABLE public.financial_ledger FROM anon;
REVOKE ALL ON TABLE public.financial_ledger FROM authenticated;

-----------------------------
-- 4) Period lock guard (trigger)
-----------------------------

CREATE OR REPLACE FUNCTION public.financial_ledger_period_lock_guard()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_org_id uuid;
  v_date date;
  v_locked boolean;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    v_org_id := COALESCE(NEW.org_id, OLD.org_id);
    v_date := COALESCE(NEW.occurred_at, OLD.occurred_at);
  ELSE
    v_org_id := OLD.org_id;
    v_date := OLD.occurred_at;
  END IF;

  IF v_org_id IS NULL OR v_date IS NULL THEN
    IF TG_OP = 'UPDATE' THEN
      RETURN NEW;
    ELSE
      RETURN OLD;
    END IF;
  END IF;

  SELECT TRUE
  INTO v_locked
  FROM public.accounting_periods ap
  WHERE ap.org_id = v_org_id
    AND ap.status = 'locked'
    AND ap.year = EXTRACT(YEAR FROM v_date)::int
    AND ap.quarter = (( (EXTRACT(MONTH FROM v_date)::int - 1) / 3 ) + 1)
  LIMIT 1;

  IF FOUND THEN
    RAISE EXCEPTION 'period_locked';
  END IF;

  IF TG_OP = 'UPDATE' THEN
    RETURN NEW;
  ELSE
    RETURN OLD;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS financial_ledger_period_lock_guard_trg ON public.financial_ledger;

CREATE TRIGGER financial_ledger_period_lock_guard_trg
BEFORE UPDATE OR DELETE ON public.financial_ledger
FOR EACH ROW
EXECUTE FUNCTION public.financial_ledger_period_lock_guard();

