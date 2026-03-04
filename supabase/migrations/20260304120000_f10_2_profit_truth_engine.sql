-- =============================================================================
-- F10.2 Profit Truth Engine (Beta)
-- =============================================================================
-- Book of record: public.financial_ledger (id uuid). No duplicate ledger.
-- Allocation layer: ledger_product_allocations links ledger entries to products.
-- Views: v_ledger_norm, v_product_econ_day, v_product_profit_day, coverage.
-- =============================================================================

-- PAS 0 — Tables detected in repo:
--   - Ledger: public.financial_ledger (id uuid, org_id, scope, project_id, type financial_event_type,
--     status, occurred_at, amount_base_pnl, amount_base_cash, reference_type, reference_id).
--   - Amazon events: public.amazon_financial_events (id, org_id, event_type, event_date, amount, meta).
--     Ledger links via reference_type='AMAZON_EVENT' and reference_id=afe.id. No ledger_entry_id column yet.
--   - product_identifiers: exists (org_id, project_id, asin, fnsku). project_id = product in this app.
--   - Units sold: no quantity in amazon_financial_events; order_items has quantity but for internal orders.
--   - Receipts/cost pool: no inventory_receipts or shipment_items_received; placeholder views used.
-- signed_amount convention: revenue/income positive, costs/expenses negative (amount_base_pnl used as-is).
-- econ_type mapping: derived from ledger.type (income/expense) + afe.event_type when reference_type='AMAZON_EVENT'.
-- =============================================================================

-- PAS 1 — Tables

-- 1.1 product_identifiers: already exists. Add indexes for F10.2 if missing.
CREATE INDEX IF NOT EXISTS idx_product_identifiers_org_asin
  ON public.product_identifiers(org_id, asin) WHERE asin IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_product_identifiers_org_project
  ON public.product_identifiers(org_id, project_id);

-- 1.2 ledger_product_allocations (ledger entry id = financial_ledger.id uuid)
CREATE TABLE IF NOT EXISTS public.ledger_product_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  ledger_entry_id uuid NOT NULL REFERENCES public.financial_ledger(id) ON DELETE CASCADE,
  product_id uuid NULL REFERENCES public.projects(id) ON DELETE SET NULL,
  marketplace text NULL,
  sku text NULL,
  asin text NULL,
  weight numeric(18,8) NOT NULL DEFAULT 1,
  method text NOT NULL DEFAULT 'direct',
  confidence text NOT NULL DEFAULT 'high',
  note text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_ledger_product_alloc_org_entry_product
    UNIQUE (org_id, ledger_entry_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_ledger_product_alloc_org_ledger
  ON public.ledger_product_allocations(org_id, ledger_entry_id);
CREATE INDEX IF NOT EXISTS idx_ledger_product_alloc_org_product
  ON public.ledger_product_allocations(org_id, product_id);

-- PAS 1b — Optional: add ledger_entry_id to amazon_financial_events for reverse lookup (no backfill)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'amazon_financial_events' AND column_name = 'ledger_entry_id'
  ) THEN
    ALTER TABLE public.amazon_financial_events
      ADD COLUMN ledger_entry_id uuid NULL REFERENCES public.financial_ledger(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_amazon_financial_events_ledger_entry_id
      ON public.amazon_financial_events(org_id, ledger_entry_id);
  END IF;
END $$;

-- =============================================================================
-- PAS 2 — v_ledger_norm (normalised economic view)
-- econ_type: revenue, refund, amazon_fee, ads, cogs, freight, duties, other
-- Mapping: ledger.type income/expense + afe.event_type (when AMAZON_EVENT) for finer grain.
-- =============================================================================
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
    WHEN l.reference_type = 'AMAZON_EVENT' AND afe.event_type IS NOT NULL THEN
      CASE
        WHEN afe.event_type ILIKE '%order%' OR afe.event_type ILIKE '%sale%' THEN 'revenue'
        WHEN afe.event_type ILIKE '%refund%' THEN 'refund'
        WHEN afe.event_type ILIKE '%fee%' OR afe.event_type ILIKE '%commission%' THEN 'amazon_fee'
        WHEN afe.event_type ILIKE '%ad%' OR afe.event_type ILIKE '%sponsored%' THEN 'ads'
        WHEN afe.event_type ILIKE '%fba%' AND afe.event_type ILIKE '%storage%' THEN 'cogs'
        WHEN afe.event_type ILIKE '%freight%' OR afe.event_type ILIKE '%shipping%' THEN 'freight'
        WHEN afe.event_type ILIKE '%duty%' OR afe.event_type ILIKE '%tax%' THEN 'duties'
        ELSE 'other'
      END
    WHEN l.type = 'income'::public.financial_event_type THEN 'revenue'
    ELSE 'other'
  END AS econ_type
FROM public.financial_ledger l
LEFT JOIN public.amazon_financial_events afe
  ON afe.org_id = l.org_id AND l.reference_type = 'AMAZON_EVENT' AND l.reference_id = afe.id
WHERE l.status IN ('posted', 'locked');

-- =============================================================================
-- PAS 3 — Auto allocation RPC: match ledger (AMAZON_EVENT) + afe.meta asin -> product_identifiers
-- =============================================================================
CREATE OR REPLACE FUNCTION public.rpc_profit_auto_allocate_by_identifier(p_org_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  row_count int := 0;
  r RECORD;
BEGIN
  FOR r IN
    SELECT DISTINCT l.id AS ledger_id, pi.project_id AS product_id, pi.asin, pi.org_id
    FROM public.financial_ledger l
    INNER JOIN public.amazon_financial_events afe
      ON afe.org_id = l.org_id AND l.reference_type = 'AMAZON_EVENT' AND l.reference_id = afe.id
    INNER JOIN public.product_identifiers pi
      ON pi.org_id = l.org_id
      AND trim(lower(coalesce(pi.asin, ''))) = trim(lower(coalesce(afe.meta->>'asin', afe.meta->>'ASIN', '')))
      AND pi.asin IS NOT NULL
    WHERE l.org_id = p_org_id
      AND l.status IN ('posted', 'locked')
  LOOP
    INSERT INTO public.ledger_product_allocations (
      org_id, ledger_entry_id, product_id, asin, method, confidence
    ) VALUES (
      r.org_id, r.ledger_id, r.product_id, r.asin, 'sku_map', 'high'
    )
    ON CONFLICT (org_id, ledger_entry_id, product_id) DO NOTHING;
    row_count := row_count + 1;
  END LOOP;
  RETURN row_count;
END;
$$;

REVOKE ALL ON FUNCTION public.rpc_profit_auto_allocate_by_identifier(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_profit_auto_allocate_by_identifier(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_profit_auto_allocate_by_identifier(uuid) TO service_role;

-- =============================================================================
-- PAS 4 — Cost pool & WAC (placeholder: no inventory_receipts / shipment cost table)
-- =============================================================================
-- 4.1 v_product_cost_pool: no reliable receipts table; view returns 0 rows.
-- TODO: Replace with real aggregation when inventory_receipts/shipment cost table exists.
CREATE OR REPLACE VIEW public.v_product_cost_pool AS
SELECT t.org_id, t.product_id, t.units_in, t.cost_in
FROM (
  SELECT null::uuid AS org_id, null::uuid AS product_id, 0::numeric(18,4) AS units_in, 0::numeric(18,2) AS cost_in
) t
WHERE false;

-- 4.2 v_product_unit_cost_wac
CREATE OR REPLACE VIEW public.v_product_unit_cost_wac AS
SELECT
  org_id,
  product_id,
  units_in,
  cost_in,
  CASE WHEN coalesce(units_in, 0) > 0 THEN cost_in / units_in ELSE NULL END AS unit_cost_wac
FROM public.v_product_cost_pool;

-- 4.3 v_product_units_sold_day: from amazon_financial_events + product_identifiers; no quantity in afe, use event count as proxy
CREATE OR REPLACE VIEW public.v_product_units_sold_day AS
SELECT
  afe.org_id,
  pi.project_id AS product_id,
  coalesce(trim(lower(afe.meta->>'marketplace')), 'default') AS marketplace,
  afe.event_date AS d,
  count(*)::numeric AS units_sold
FROM public.amazon_financial_events afe
INNER JOIN public.product_identifiers pi
  ON pi.org_id = afe.org_id
  AND trim(lower(coalesce(pi.asin, ''))) = trim(lower(coalesce(afe.meta->>'asin', afe.meta->>'ASIN', '')))
  AND pi.asin IS NOT NULL
WHERE afe.event_type ILIKE '%order%' OR afe.event_type ILIKE '%sale%'
GROUP BY afe.org_id, pi.project_id, coalesce(trim(lower(afe.meta->>'marketplace')), 'default'), afe.event_date;

-- 4.4 v_product_cogs_day: cogs_amount = units_sold * unit_cost_wac (join to WAC view)
CREATE OR REPLACE VIEW public.v_product_cogs_day AS
SELECT
  u.org_id,
  u.product_id,
  u.marketplace,
  u.d,
  u.units_sold,
  coalesce(w.unit_cost_wac, 0) AS unit_cost_wac,
  (u.units_sold * coalesce(w.unit_cost_wac, 0)) AS cogs_amount
FROM public.v_product_units_sold_day u
LEFT JOIN public.v_product_unit_cost_wac w ON w.org_id = u.org_id AND w.product_id = u.product_id;

-- =============================================================================
-- PAS 5 — Profit views
-- =============================================================================
-- 5.1 v_product_econ_day: aggregate v_ledger_norm + ledger_product_allocations by (org_id, product_id, d)
CREATE OR REPLACE VIEW public.v_product_econ_day AS
SELECT
  n.org_id,
  a.product_id,
  n.d,
  sum(CASE WHEN n.econ_type = 'revenue' THEN n.signed_amount * a.weight ELSE 0 END) AS gross_sales,
  sum(CASE WHEN n.econ_type = 'refund' THEN n.signed_amount * a.weight ELSE 0 END) AS refunds,
  sum(CASE WHEN n.econ_type = 'amazon_fee' THEN n.signed_amount * a.weight ELSE 0 END) AS amazon_fees,
  sum(CASE WHEN n.econ_type = 'ads' THEN n.signed_amount * a.weight ELSE 0 END) AS ads,
  sum(CASE WHEN n.econ_type = 'freight' THEN n.signed_amount * a.weight ELSE 0 END) AS freight,
  sum(CASE WHEN n.econ_type = 'duties' THEN n.signed_amount * a.weight ELSE 0 END) AS duties,
  sum(CASE WHEN n.econ_type IN ('cogs', 'other') THEN n.signed_amount * a.weight ELSE 0 END) AS other_costs
FROM public.v_ledger_norm n
INNER JOIN public.ledger_product_allocations a ON a.ledger_entry_id = n.ledger_entry_id AND a.org_id = n.org_id AND a.product_id IS NOT NULL
GROUP BY n.org_id, a.product_id, n.d;

-- 5.2 v_product_profit_day: join econ + cogs (aggregated per product per day), compute net_revenue, contribution_margin
CREATE OR REPLACE VIEW public.v_product_profit_day AS
SELECT
  e.org_id,
  e.product_id,
  e.d,
  e.gross_sales,
  e.refunds,
  (e.gross_sales + e.refunds) AS net_revenue,
  coalesce(c.units_sold, 0) AS units_sold,
  coalesce(c.cogs_amount, 0) AS cogs,
  (e.gross_sales + e.refunds - e.amazon_fees - e.ads - e.freight - e.duties - e.other_costs) AS contribution_margin
FROM public.v_product_econ_day e
LEFT JOIN (
  SELECT org_id, product_id, d,
    sum(units_sold) AS units_sold,
    sum(cogs_amount) AS cogs_amount
  FROM public.v_product_cogs_day
  GROUP BY org_id, product_id, d
) c ON c.org_id = e.org_id AND c.product_id = e.product_id AND c.d = e.d;

-- =============================================================================
-- PAS 6 — Data quality: allocation coverage per org per day
-- =============================================================================
CREATE OR REPLACE VIEW public.v_profit_allocation_coverage AS
SELECT
  l.org_id,
  l.occurred_at::date AS d,
  count(DISTINCT l.id)::bigint AS ledger_entries_total,
  count(DISTINCT CASE WHEN a.product_id IS NOT NULL THEN l.id END)::bigint AS allocated_entries,
  (count(DISTINCT l.id) - count(DISTINCT CASE WHEN a.product_id IS NOT NULL THEN l.id END))::bigint AS unallocated_entries
FROM public.financial_ledger l
LEFT JOIN public.ledger_product_allocations a ON a.ledger_entry_id = l.id AND a.org_id = l.org_id
WHERE l.status IN ('posted', 'locked')
GROUP BY l.org_id, l.occurred_at::date;

-- =============================================================================
-- PAS 7 — RLS
-- =============================================================================
ALTER TABLE public.ledger_product_allocations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ledger_product_allocations_select_org" ON public.ledger_product_allocations;
CREATE POLICY "ledger_product_allocations_select_org"
  ON public.ledger_product_allocations FOR SELECT TO authenticated
  USING (public.is_org_member(org_id));

DROP POLICY IF EXISTS "ledger_product_allocations_insert_org" ON public.ledger_product_allocations;
CREATE POLICY "ledger_product_allocations_insert_org"
  ON public.ledger_product_allocations FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(org_id));

DROP POLICY IF EXISTS "ledger_product_allocations_update_org" ON public.ledger_product_allocations;
CREATE POLICY "ledger_product_allocations_update_org"
  ON public.ledger_product_allocations FOR UPDATE TO authenticated
  USING (public.is_org_member(org_id)) WITH CHECK (public.is_org_member(org_id));

DROP POLICY IF EXISTS "ledger_product_allocations_delete_org" ON public.ledger_product_allocations;
CREATE POLICY "ledger_product_allocations_delete_org"
  ON public.ledger_product_allocations FOR DELETE TO authenticated
  USING (public.is_org_member(org_id));

-- product_identifiers: already has RLS (Org members can manage). No change.

-- =============================================================================
-- End of migration — Tables used (documented)
-- =============================================================================
-- Real tables: financial_ledger, amazon_financial_events, product_identifiers, projects, orgs.
-- New table: ledger_product_allocations.
-- Optional column added: amazon_financial_events.ledger_entry_id (nullable, no backfill).
-- econ_type mapping uses: financial_ledger.type (income/expense) and amazon_financial_events.event_type
--   (order/sale -> revenue, refund -> refund, fee/commission -> amazon_fee, ad/sponsored -> ads, etc.).
-- =============================================================================
