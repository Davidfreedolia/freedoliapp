-- F5.6 — Quarterly Export RPCs (P&L, Cashflow, Ledger, Reconciliation) + Finance Viewer Helpers

-----------------------------
-- 1) Helper functions
-----------------------------

-- Accountant role helper
CREATE OR REPLACE FUNCTION public.is_org_accountant(check_org uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.org_memberships
    WHERE org_id = check_org
      AND user_id = auth.uid()
      AND role = 'accountant'
  );
$$;

-- Finance viewer: owner OR admin OR accountant
CREATE OR REPLACE FUNCTION public.is_org_finance_viewer(check_org uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.is_org_owner_or_admin(check_org)
    OR public.is_org_accountant(check_org);
$$;

-----------------------------
-- 2) Utility: derive org_id for current user
-----------------------------

CREATE OR REPLACE FUNCTION public.get_current_org_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT om.org_id
  FROM public.org_memberships om
  WHERE om.user_id = auth.uid()
  ORDER BY om.created_at
  LIMIT 1;
$$;

-----------------------------
-- 3) RPC: pnl_quarterly
-----------------------------

CREATE OR REPLACE FUNCTION public.pnl_quarterly(p_year int, p_quarter int)
RETURNS TABLE (
  type public.financial_event_type,
  total_base_pnl numeric(18,2),
  period_status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
  v_status text;
BEGIN
  v_org_id := public.get_current_org_id();
  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'no_active_org';
  END IF;

  IF NOT public.is_org_finance_viewer(v_org_id) THEN
    RAISE EXCEPTION 'not_allowed';
  END IF;

  SELECT ap.status
  INTO v_status
  FROM public.accounting_periods ap
  WHERE ap.org_id = v_org_id
    AND ap.year = p_year
    AND ap.quarter = p_quarter;

  IF v_status IS NULL THEN
    v_status := 'open';
  END IF;

  RETURN QUERY
  WITH bounds AS (
    SELECT
      make_date(p_year::int, ((p_quarter::int - 1) * 3) + 1, 1) AS d0,
      (make_date(p_year::int, ((p_quarter::int - 1) * 3) + 1, 1) + interval '3 months')::date AS d1
  )
  SELECT
    l.type,
    SUM(l.amount_base_pnl)::numeric(18,2) AS total_base_pnl,
    v_status AS period_status
  FROM public.financial_ledger l
  JOIN bounds b ON true
  WHERE
    l.org_id = v_org_id
    AND l.scope = 'company'
    AND l.status IN ('posted','locked')
    AND l.occurred_at >= b.d0
    AND l.occurred_at <  b.d1
  GROUP BY l.type, v_status
  ORDER BY l.type;
END;
$$;

-----------------------------
-- 4) RPC: cashflow_quarterly
-----------------------------

CREATE OR REPLACE FUNCTION public.cashflow_quarterly(p_year int, p_quarter int)
RETURNS TABLE (
  type public.financial_event_type,
  total_base_cash numeric(18,2),
  period_status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
  v_status text;
BEGIN
  v_org_id := public.get_current_org_id();
  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'no_active_org';
  END IF;

  IF NOT public.is_org_finance_viewer(v_org_id) THEN
    RAISE EXCEPTION 'not_allowed';
  END IF;

  SELECT ap.status
  INTO v_status
  FROM public.accounting_periods ap
  WHERE ap.org_id = v_org_id
    AND ap.year = p_year
    AND ap.quarter = p_quarter;

  IF v_status IS NULL THEN
    v_status := 'open';
  END IF;

  RETURN QUERY
  WITH bounds AS (
    SELECT
      make_date(p_year::int, ((p_quarter::int - 1) * 3) + 1, 1) AS d0,
      (make_date(p_year::int, ((p_quarter::int - 1) * 3) + 1, 1) + interval '3 months')::date AS d1
  )
  SELECT
    l.type,
    SUM(l.amount_base_cash)::numeric(18,2) AS total_base_cash,
    v_status AS period_status
  FROM public.financial_ledger l
  JOIN bounds b ON true
  WHERE
    l.org_id = v_org_id
    AND l.scope = 'company'
    AND l.status IN ('posted','locked')
    AND l.cash_at IS NOT NULL
    AND l.cash_at >= b.d0
    AND l.cash_at <  b.d1
  GROUP BY l.type, v_status
  ORDER BY l.type;
END;
$$;

-----------------------------
-- 5) RPC: ledger_export_quarterly
-----------------------------

CREATE OR REPLACE FUNCTION public.ledger_export_quarterly(p_year int, p_quarter int)
RETURNS TABLE (
  id uuid,
  occurred_at date,
  cash_at date,
  type public.financial_event_type,
  status public.financial_status,
  amount_original numeric(18,2),
  currency_original text,
  rate_pnl numeric(18,8),
  amount_base_pnl numeric(18,2),
  rate_cash numeric(18,8),
  amount_base_cash numeric(18,2),
  reference_type text,
  reference_id uuid,
  note text,
  created_at timestamptz,
  period_status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
  v_status text;
BEGIN
  v_org_id := public.get_current_org_id();
  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'no_active_org';
  END IF;

  IF NOT public.is_org_finance_viewer(v_org_id) THEN
    RAISE EXCEPTION 'not_allowed';
  END IF;

  SELECT ap.status
  INTO v_status
  FROM public.accounting_periods ap
  WHERE ap.org_id = v_org_id
    AND ap.year = p_year
    AND ap.quarter = p_quarter;

  IF v_status IS NULL THEN
    v_status := 'open';
  END IF;

  RETURN QUERY
  WITH bounds AS (
    SELECT
      make_date(p_year::int, ((p_quarter::int - 1) * 3) + 1, 1) AS d0,
      (make_date(p_year::int, ((p_quarter::int - 1) * 3) + 1, 1) + interval '3 months')::date AS d1
  )
  SELECT
    l.id,
    l.occurred_at,
    l.cash_at,
    l.type,
    l.status,
    l.amount_original,
    l.currency_original,
    l.rate_pnl,
    l.amount_base_pnl,
    l.rate_cash,
    l.amount_base_cash,
    l.reference_type,
    l.reference_id,
    l.note,
    l.created_at,
    v_status AS period_status
  FROM public.financial_ledger l
  JOIN bounds b ON true
  WHERE
    l.org_id = v_org_id
    AND l.scope = 'company'
    AND l.status IN ('posted','locked')
    AND (
      (l.occurred_at >= b.d0 AND l.occurred_at < b.d1)
      OR
      (l.cash_at IS NOT NULL AND l.cash_at >= b.d0 AND l.cash_at < b.d1)
    )
  ORDER BY l.occurred_at ASC, l.created_at ASC;
END;
$$;

-----------------------------
-- 6) RPC: ledger_reconciliation_quarterly
-----------------------------

CREATE OR REPLACE FUNCTION public.ledger_reconciliation_quarterly(p_year int, p_quarter int)
RETURNS TABLE (
  reference_type text,
  rows bigint,
  total_base_pnl numeric(18,2),
  total_base_cash numeric(18,2),
  rows_in_base_ccy bigint,
  period_status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
  v_status text;
BEGIN
  v_org_id := public.get_current_org_id();
  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'no_active_org';
  END IF;

  IF NOT public.is_org_finance_viewer(v_org_id) THEN
    RAISE EXCEPTION 'not_allowed';
  END IF;

  SELECT ap.status
  INTO v_status
  FROM public.accounting_periods ap
  WHERE ap.org_id = v_org_id
    AND ap.year = p_year
    AND ap.quarter = p_quarter;

  IF v_status IS NULL THEN
    v_status := 'open';
  END IF;

  RETURN QUERY
  WITH bounds AS (
    SELECT
      make_date(p_year::int, ((p_quarter::int - 1) * 3) + 1, 1) AS d0,
      (make_date(p_year::int, ((p_quarter::int - 1) * 3) + 1, 1) + interval '3 months')::date AS d1
  ),
  base AS (
    SELECT l.*
    FROM public.financial_ledger l
    JOIN bounds b ON true
    WHERE
      l.org_id = v_org_id
      AND l.scope = 'company'
      AND l.status IN ('posted','locked')
      AND l.occurred_at >= b.d0
      AND l.occurred_at <  b.d1
  )
  SELECT
    COALESCE(reference_type, 'UNSPECIFIED') AS reference_type,
    COUNT(*) AS rows,
    SUM(amount_base_pnl)::numeric(18,2) AS total_base_pnl,
    SUM(CASE WHEN cash_at IS NOT NULL THEN amount_base_cash ELSE 0 END)::numeric(18,2) AS total_base_cash,
    SUM(
      CASE
        WHEN currency_original = (
          SELECT os.base_currency
          FROM public.org_settings os
          WHERE os.org_id = v_org_id
        )
        THEN 1 ELSE 0
      END
    ) AS rows_in_base_ccy,
    v_status AS period_status
  FROM base
  GROUP BY COALESCE(reference_type, 'UNSPECIFIED'), v_status
  ORDER BY COALESCE(reference_type, 'UNSPECIFIED');
END;
$$;

-----------------------------
-- 7) Grants
-----------------------------

REVOKE ALL ON FUNCTION public.pnl_quarterly(int, int) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cashflow_quarterly(int, int) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ledger_export_quarterly(int, int) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ledger_reconciliation_quarterly(int, int) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.pnl_quarterly(int, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cashflow_quarterly(int, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ledger_export_quarterly(int, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ledger_reconciliation_quarterly(int, int) TO authenticated;

