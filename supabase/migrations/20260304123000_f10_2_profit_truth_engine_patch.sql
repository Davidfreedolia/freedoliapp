-- =============================================================================
-- F10.2 Profit Truth Engine — PATCH (incremental)
-- =============================================================================
-- 1) RPC returns actual inserted row count
-- 2) v_ledger_norm: econ_type from ledger only (income=>revenue, expense=>other)
-- 3) Units views: orders_count placeholder; v_product_profit_day: cogs/units_sold safe, is_profit_incomplete
-- 4) ledger_product_allocations: CHECK weight, index (org_id, marketplace, asin)
-- 5) RLS unchanged
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) RPC: return actual inserted row count (GET DIAGNOSTICS ROW_COUNT)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rpc_profit_auto_allocate_by_identifier(p_org_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inserted int;
BEGIN
  INSERT INTO public.ledger_product_allocations (
    org_id, ledger_entry_id, product_id, asin, method, confidence
  )
  SELECT DISTINCT
    l.org_id,
    l.id,
    pi.project_id,
    pi.asin,
    'sku_map',
    'high'
  FROM public.financial_ledger l
  INNER JOIN public.amazon_financial_events afe
    ON afe.org_id = l.org_id AND l.reference_type = 'AMAZON_EVENT' AND l.reference_id = afe.id
  INNER JOIN public.product_identifiers pi
    ON pi.org_id = l.org_id
    AND trim(lower(coalesce(pi.asin, ''))) = trim(lower(coalesce(afe.meta->>'asin', afe.meta->>'ASIN', '')))
    AND pi.asin IS NOT NULL
  WHERE l.org_id = p_org_id
    AND l.status IN ('posted', 'locked')
  ON CONFLICT (org_id, ledger_entry_id, product_id) DO NOTHING;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  RETURN v_inserted;
END;
$$;

REVOKE ALL ON FUNCTION public.rpc_profit_auto_allocate_by_identifier(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_profit_auto_allocate_by_identifier(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_profit_auto_allocate_by_identifier(uuid) TO service_role;

-- -----------------------------------------------------------------------------
-- 2) v_ledger_norm: econ_type derived ONLY from ledger (no amazon_financial_events)
-- TODO: map chart-of-accounts to econ_type when account_code/category exist.
-- Ledger has type: financial_event_type (income, expense, transfer, adjustment).
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_ledger_norm AS
SELECT
  l.id AS ledger_entry_id,
  l.org_id,
  l.occurred_at::date AS d,
  l.occurred_at AS posted_at,
  l.currency_original AS currency,
  l.amount_base_pnl AS signed_amount,
  l.reference_type AS source_type,
  l.reference_id AS source_id,
  CASE
    WHEN l.type = 'income'::public.financial_event_type THEN 'revenue'
    ELSE 'other'
  END AS econ_type
FROM public.financial_ledger l
WHERE l.status IN ('posted', 'locked');
-- TODO: map chart-of-accounts to econ_type when account_code/category exist (ledger has type: income, expense, transfer, adjustment).

-- -----------------------------------------------------------------------------
-- 3a) v_product_units_sold_day: rename units_sold -> orders_count (placeholder)
--     (PostgreSQL does not allow changing column names via REPLACE; drop first.)
-- -----------------------------------------------------------------------------
DROP VIEW IF EXISTS public.v_product_profit_day CASCADE;
DROP VIEW IF EXISTS public.v_product_cogs_day CASCADE;
DROP VIEW IF EXISTS public.v_product_units_sold_day CASCADE;

CREATE VIEW public.v_product_units_sold_day AS
SELECT
  afe.org_id,
  pi.project_id AS product_id,
  coalesce(trim(lower(afe.meta->>'marketplace')), 'default') AS marketplace,
  afe.event_date AS d,
  count(*)::bigint AS orders_count
FROM public.amazon_financial_events afe
INNER JOIN public.product_identifiers pi
  ON pi.org_id = afe.org_id
  AND trim(lower(coalesce(pi.asin, ''))) = trim(lower(coalesce(afe.meta->>'asin', afe.meta->>'ASIN', '')))
  AND pi.asin IS NOT NULL
WHERE afe.event_type ILIKE '%order%' OR afe.event_type ILIKE '%sale%'
GROUP BY afe.org_id, pi.project_id, coalesce(trim(lower(afe.meta->>'marketplace')), 'default'), afe.event_date;

-- 3b) v_product_cogs_day: placeholder — no real WAC; return NULL cogs_amount / unit_cost_wac
CREATE VIEW public.v_product_cogs_day AS
SELECT
  u.org_id,
  u.product_id,
  u.marketplace,
  u.d,
  u.orders_count,
  cast(null as numeric(18,8)) AS unit_cost_wac,
  cast(null as numeric(18,2)) AS cogs_amount
FROM public.v_product_units_sold_day u;

-- 3c) v_product_profit_day: cogs = 0, units_sold removed (NULL); is_profit_incomplete
CREATE VIEW public.v_product_profit_day AS
SELECT
  e.org_id,
  e.product_id,
  e.d,
  e.gross_sales,
  e.refunds,
  (e.gross_sales + e.refunds) AS net_revenue,
  cast(null as numeric(18,2)) AS cogs,
  (e.gross_sales + e.refunds - e.amazon_fees - e.ads - e.freight - e.duties - e.other_costs) AS contribution_margin,
  (
    coalesce(cov.unallocated_entries, 0) > 0
    OR NOT EXISTS (
      SELECT 1 FROM public.v_product_cost_pool cp
      WHERE cp.org_id = e.org_id AND cp.product_id = e.product_id AND coalesce(cp.units_in, 0) > 0
    )
  ) AS is_profit_incomplete
FROM public.v_product_econ_day e
LEFT JOIN public.v_profit_allocation_coverage cov
  ON cov.org_id = e.org_id AND cov.d = e.d;

-- -----------------------------------------------------------------------------
-- 4) ledger_product_allocations: CHECK weight, index (org_id, marketplace, asin)
-- FK product_id -> projects(id) ON DELETE SET NULL already in base migration.
-- -----------------------------------------------------------------------------
ALTER TABLE public.ledger_product_allocations
  DROP CONSTRAINT IF EXISTS ledger_product_allocations_weight_range;

ALTER TABLE public.ledger_product_allocations
  ADD CONSTRAINT ledger_product_allocations_weight_range
  CHECK (weight > 0 AND weight <= 1);

CREATE INDEX IF NOT EXISTS idx_ledger_product_alloc_org_marketplace_asin
  ON public.ledger_product_allocations(org_id, marketplace, asin);
