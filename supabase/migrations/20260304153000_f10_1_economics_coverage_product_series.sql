-- =============================================================================
-- F10.1 Economics patch: coverage per producte (no org-wide) + series ampliada
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) Coverage per producte (per rang) — truth: només entries amb allocation al producte
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rpc_product_allocation_coverage_range(
  p_org_id uuid,
  p_product_id uuid,
  p_from date,
  p_to date
)
RETURNS TABLE(
  org_id uuid,
  product_id uuid,
  d_from date,
  d_to date,
  ledger_entries_total bigint,
  allocated_entries bigint,
  unallocated_entries bigint,
  coverage_pct numeric(5,2)
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total bigint := 0;
  v_allocated bigint := 0;
  v_unallocated bigint := 0;
  v_pct numeric(5,2) := 0;
BEGIN
  IF NOT public.is_org_member(p_org_id) THEN
    RAISE EXCEPTION 'org_access_denied';
  END IF;

  SELECT COUNT(DISTINCT ln.ledger_entry_id)
  INTO v_total
  FROM public.v_ledger_norm ln
  INNER JOIN public.ledger_product_allocations lpa
    ON lpa.org_id = ln.org_id AND lpa.ledger_entry_id = ln.ledger_entry_id
  WHERE ln.org_id = p_org_id
    AND lpa.product_id = p_product_id
    AND ln.d >= p_from AND ln.d <= p_to;

  v_allocated := COALESCE(v_total, 0);
  v_unallocated := 0;

  IF COALESCE(v_total, 0) > 0 THEN
    v_pct := round((v_allocated * 100.0 / v_total)::numeric, 2);
  ELSE
    v_pct := 0;
  END IF;

  org_id                 := p_org_id;
  product_id             := p_product_id;
  d_from                 := p_from;
  d_to                   := p_to;
  ledger_entries_total   := v_total;
  allocated_entries      := v_allocated;
  unallocated_entries    := v_unallocated;
  coverage_pct           := v_pct;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.rpc_product_allocation_coverage_range(uuid, uuid, date, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_product_allocation_coverage_range(uuid, uuid, date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_product_allocation_coverage_range(uuid, uuid, date, date) TO service_role;

-- -----------------------------------------------------------------------------
-- 2) rpc_product_profit_kpi_range: coverage_pct i unallocated_entries des de coverage per producte
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rpc_product_profit_kpi_range(
  p_org_id uuid,
  p_product_id uuid,
  p_from date,
  p_to date
)
RETURNS TABLE(
  org_id uuid,
  product_id uuid,
  d_from date,
  d_to date,
  orders_count bigint,
  gross_sales numeric,
  refunds numeric,
  net_revenue numeric,
  amazon_fees numeric,
  ads numeric,
  freight numeric,
  duties numeric,
  other_costs numeric,
  cogs numeric,
  contribution_margin numeric,
  margin_pct numeric,
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
  v_orders_count bigint := 0;
  v_gross_sales numeric := 0;
  v_refunds numeric := 0;
  v_net_revenue numeric := 0;
  v_amazon_fees numeric := 0;
  v_ads numeric := 0;
  v_freight numeric := 0;
  v_duties numeric := 0;
  v_other_costs numeric := 0;
  v_cogs numeric := 0;
  v_contribution_margin numeric := 0;
  v_unallocated bigint := 0;
  v_coverage_pct numeric(5,2) := 0;
  v_d_from date;
  v_d_to date;
  v_incomplete boolean := true;
BEGIN
  IF NOT public.is_org_member(p_org_id) THEN
    RAISE EXCEPTION 'org_access_denied';
  END IF;

  v_d_from := p_from;
  v_d_to   := p_to;

  SELECT COALESCE(SUM(orders_count), 0) INTO v_orders_count
  FROM public.v_product_units_sold_day u
  WHERE u.org_id = p_org_id AND u.product_id = p_product_id
    AND u.d >= p_from AND u.d <= p_to;

  SELECT
    COALESCE(SUM(p.gross_sales), 0),
    COALESCE(SUM(p.refunds), 0),
    COALESCE(SUM(p.net_revenue), 0),
    COALESCE(SUM(p.cogs), 0),
    COALESCE(SUM(p.contribution_margin), 0)
  INTO v_gross_sales, v_refunds, v_net_revenue, v_cogs, v_contribution_margin
  FROM public.v_product_profit_day p
  WHERE p.org_id = p_org_id AND p.product_id = p_product_id
    AND p.d >= p_from AND p.d <= p_to;

  SELECT
    COALESCE(SUM(e.amazon_fees), 0),
    COALESCE(SUM(e.ads), 0),
    COALESCE(SUM(e.freight), 0),
    COALESCE(SUM(e.duties), 0),
    COALESCE(SUM(e.other_costs), 0)
  INTO v_amazon_fees, v_ads, v_freight, v_duties, v_other_costs
  FROM public.v_product_econ_day e
  WHERE e.org_id = p_org_id AND e.product_id = p_product_id
    AND e.d >= p_from AND e.d <= p_to;

  SELECT c.unallocated_entries, c.coverage_pct
  INTO v_unallocated, v_coverage_pct
  FROM public.rpc_product_allocation_coverage_range(p_org_id, p_product_id, p_from, p_to) c;

  v_incomplete := (COALESCE(v_coverage_pct, 0) < 100)
    OR (COALESCE(v_unallocated, 0) > 0)
    OR NOT EXISTS (
      SELECT 1 FROM public.v_product_cost_pool cp
      WHERE cp.org_id = p_org_id AND cp.product_id = p_product_id AND COALESCE(cp.units_in, 0) > 0
    );

  org_id                 := p_org_id;
  product_id             := p_product_id;
  d_from                 := v_d_from;
  d_to                   := v_d_to;
  orders_count           := v_orders_count;
  gross_sales             := v_gross_sales;
  refunds                := v_refunds;
  net_revenue            := v_net_revenue;
  amazon_fees            := v_amazon_fees;
  ads                    := v_ads;
  freight                := v_freight;
  duties                 := v_duties;
  other_costs            := v_other_costs;
  cogs                   := COALESCE(v_cogs, 0);
  contribution_margin    := v_contribution_margin;
  margin_pct             := round((v_contribution_margin * 100.0 / NULLIF(v_net_revenue, 0))::numeric, 2);
  unallocated_entries    := COALESCE(v_unallocated, 0);
  coverage_pct           := COALESCE(v_coverage_pct, 0);
  is_profit_incomplete   := v_incomplete;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.rpc_product_profit_kpi_range(uuid, uuid, date, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_product_profit_kpi_range(uuid, uuid, date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_product_profit_kpi_range(uuid, uuid, date, date) TO service_role;

-- -----------------------------------------------------------------------------
-- 3) rpc_product_profit_series: afegir refunds, ads, other_costs; is_profit_incomplete_day per cost_pool
-- (coverage per dia per producte no implementat; is_profit_incomplete_day = true si no cost_pool per product)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rpc_product_profit_series(
  p_org_id uuid,
  p_product_id uuid,
  p_from date,
  p_to date
)
RETURNS TABLE(
  d date,
  net_revenue numeric,
  amazon_fees numeric,
  contribution_margin numeric,
  refunds numeric,
  ads numeric,
  other_costs numeric,
  is_profit_incomplete_day boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.d,
    p.net_revenue,
    COALESCE(e.amazon_fees, 0),
    p.contribution_margin,
    COALESCE(e.refunds, 0),
    COALESCE(e.ads, 0),
    COALESCE(e.other_costs, 0),
    NOT EXISTS (
      SELECT 1 FROM public.v_product_cost_pool cp
      WHERE cp.org_id = p.org_id AND cp.product_id = p.product_id AND COALESCE(cp.units_in, 0) > 0
    ) AS is_profit_incomplete_day
  FROM public.v_product_profit_day p
  LEFT JOIN public.v_product_econ_day e
    ON e.org_id = p.org_id AND e.product_id = p.product_id AND e.d = p.d
  WHERE p.org_id = p_org_id AND p.product_id = p_product_id
    AND p.d >= p_from AND p.d <= p_to
  ORDER BY p.d;
$$;

REVOKE ALL ON FUNCTION public.rpc_product_profit_series(uuid, uuid, date, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_product_profit_series(uuid, uuid, date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_product_profit_series(uuid, uuid, date, date) TO service_role;
