-- =============================================================================
-- F10.2.4 Concurrency lock + KPI view (Beta)
-- =============================================================================
-- 1) Advisory lock dins rpc_profit_recompute_org per evitar execucions paral·leles per org.
-- 2) RPC rpc_profit_kpi_range(p_org_id, p_from, p_to) per KPIs dashboard per rang.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) Advisory lock a rpc_profit_recompute_org
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rpc_profit_recompute_org(
  p_org_id uuid,
  p_from date,
  p_to date
)
RETURNS TABLE(
  allocated_inserts int,
  receipts_prorated int,
  days bigint,
  unallocated_entries bigint,
  allocated_entries bigint,
  ledger_entries_total bigint,
  is_profit_incomplete boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_allocated_inserts int := 0;
  v_receipts_prorated int := 0;
  v_days bigint := 0;
  v_unallocated bigint := 0;
  v_allocated bigint := 0;
  v_ledger_total bigint := 0;
  v_incomplete boolean := true;
  r RECORD;
BEGIN
  IF NOT public.is_org_member(p_org_id) THEN
    RAISE EXCEPTION 'org_access_denied';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('profit_recompute:' || p_org_id::text)::bigint);

  SELECT public.rpc_profit_auto_allocate_by_identifier(p_org_id) INTO v_allocated_inserts;

  FOR r IN
    SELECT id
    FROM public.inventory_receipts
    WHERE org_id = p_org_id
      AND received_at >= p_from
      AND received_at <= p_to
      AND COALESCE(landed_cost_total, 0) > 0
  LOOP
    PERFORM public.rpc_receipt_prorate_landed_cost(p_org_id, r.id);
    v_receipts_prorated := v_receipts_prorated + 1;
  END LOOP;

  SELECT
    COUNT(DISTINCT cov.d),
    COALESCE(SUM(cov.ledger_entries_total), 0),
    COALESCE(SUM(cov.allocated_entries), 0),
    COALESCE(SUM(cov.unallocated_entries), 0)
  INTO v_days, v_ledger_total, v_allocated, v_unallocated
  FROM public.v_profit_allocation_coverage cov
  WHERE cov.org_id = p_org_id
    AND cov.d >= p_from
    AND cov.d <= p_to;

  v_incomplete := (v_unallocated > 0)
    OR NOT EXISTS (
      SELECT 1 FROM public.v_product_cost_pool cp
      WHERE cp.org_id = p_org_id AND COALESCE(cp.units_in, 0) > 0
    );

  allocated_inserts     := v_allocated_inserts;
  receipts_prorated     := v_receipts_prorated;
  days                  := v_days;
  unallocated_entries   := v_unallocated;
  allocated_entries     := v_allocated;
  ledger_entries_total  := v_ledger_total;
  is_profit_incomplete  := v_incomplete;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.rpc_profit_recompute_org(uuid, date, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_profit_recompute_org(uuid, date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_profit_recompute_org(uuid, date, date) TO service_role;

-- -----------------------------------------------------------------------------
-- 2) RPC KPI per rang (dashboard-ready)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rpc_profit_kpi_range(
  p_org_id uuid,
  p_from date,
  p_to date
)
RETURNS TABLE(
  org_id uuid,
  d_from date,
  d_to date,
  ledger_entries_total bigint,
  allocated_entries bigint,
  unallocated_entries bigint,
  coverage_pct numeric(5,2),
  is_profit_incomplete boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ledger_total bigint := 0;
  v_allocated bigint := 0;
  v_unallocated bigint := 0;
  v_d_from date;
  v_d_to date;
  v_incomplete boolean := true;
BEGIN
  SELECT
    MIN(cov.d),
    MAX(cov.d),
    COALESCE(SUM(cov.ledger_entries_total), 0),
    COALESCE(SUM(cov.allocated_entries), 0),
    COALESCE(SUM(cov.unallocated_entries), 0)
  INTO v_d_from, v_d_to, v_ledger_total, v_allocated, v_unallocated
  FROM public.v_profit_allocation_coverage cov
  WHERE cov.org_id = p_org_id
    AND cov.d >= p_from
    AND cov.d <= p_to;

  v_incomplete := (COALESCE(v_unallocated, 0) > 0)
    OR NOT EXISTS (
      SELECT 1 FROM public.v_product_cost_pool cp
      WHERE cp.org_id = p_org_id AND COALESCE(cp.units_in, 0) > 0
    );

  org_id                 := p_org_id;
  d_from                 := v_d_from;
  d_to                   := v_d_to;
  ledger_entries_total   := COALESCE(v_ledger_total, 0);
  allocated_entries      := COALESCE(v_allocated, 0);
  unallocated_entries    := COALESCE(v_unallocated, 0);
  coverage_pct           := round((COALESCE(v_allocated, 0) * 100.0 / NULLIF(COALESCE(v_ledger_total, 0), 0))::numeric, 2);
  is_profit_incomplete   := v_incomplete;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.rpc_profit_kpi_range(uuid, date, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_profit_kpi_range(uuid, date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_profit_kpi_range(uuid, date, date) TO service_role;
