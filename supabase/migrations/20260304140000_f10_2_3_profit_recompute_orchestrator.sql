-- =============================================================================
-- F10.2.3 Profit Recompute Orchestrator (Beta)
-- =============================================================================
-- Una sola RPC que executa: auto-allocate ledger → prorrateig receipts → KPIs coverage.
-- Idempotent; retorna una fila amb KPIs de qualitat.
-- =============================================================================

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
  -- 1) Validació org: només si és org member
  IF NOT public.is_org_member(p_org_id) THEN
    RAISE EXCEPTION 'org_access_denied';
  END IF;

  -- 2) Paso A: auto-allocate per identifier
  SELECT public.rpc_profit_auto_allocate_by_identifier(p_org_id) INTO v_allocated_inserts;

  -- 3) Paso B: prorrateig receipts (received_at entre p_from i p_to, landed_cost_total > 0)
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

  -- 4) Paso C: KPI coverage (v_profit_allocation_coverage filtrat per d en [p_from, p_to])
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

  -- is_profit_incomplete = (unallocated_entries > 0) OR (no hi ha cost pool amb units_in > 0 per org)
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
