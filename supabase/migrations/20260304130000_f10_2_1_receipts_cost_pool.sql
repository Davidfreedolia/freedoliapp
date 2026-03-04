-- =============================================================================
-- F10.2.1 Receipts + Cost Pool (Beta)
-- =============================================================================
-- Objective:
--   - Provide a minimal cost pool via inventory receipts.
--   - Enable WAC-based unit cost per product using v_product_cost_pool.
--   - Keep org_id + RLS canonical.
-- Notes:
--   - Beta cost pool via receipts; no FIFO; WAC only.
--   - orders_count in v_product_units_sold_day is a placeholder until quantity is available.
-- =============================================================================

-------------------------------
-- 1) Tables
-------------------------------

-- 1.1 public.inventory_receipts
CREATE TABLE IF NOT EXISTS public.inventory_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  received_at date NOT NULL,
  source_type text NOT NULL DEFAULT 'MANUAL', -- PO|SHIPMENT|MANUAL
  source_id uuid NULL,
  currency text NOT NULL DEFAULT 'EUR',
  landed_cost_total numeric(18,2) NULL DEFAULT 0,
  note text NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inventory_receipts_org_project_received_at
  ON public.inventory_receipts(org_id, project_id, received_at);

-- 1.2 public.inventory_receipt_items
CREATE TABLE IF NOT EXISTS public.inventory_receipt_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  receipt_id uuid NOT NULL REFERENCES public.inventory_receipts(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE RESTRICT,
  marketplace text NULL,
  sku text NULL,
  asin text NULL,
  units_received integer NOT NULL CHECK (units_received > 0),
  unit_cost numeric(18,4) NOT NULL CHECK (unit_cost >= 0),
  line_cost numeric(18,4) GENERATED ALWAYS AS (units_received * unit_cost) STORED,
  landed_cost_allocated numeric(18,4) NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inventory_receipt_items_org_product
  ON public.inventory_receipt_items(org_id, product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_receipt_items_org_asin
  ON public.inventory_receipt_items(org_id, asin);
CREATE INDEX IF NOT EXISTS idx_inventory_receipt_items_org_sku
  ON public.inventory_receipt_items(org_id, sku);

-------------------------------
-- 2) RLS (canonical org_id-based)
-------------------------------

-- inventory_receipts
ALTER TABLE public.inventory_receipts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org members can select inventory_receipts" ON public.inventory_receipts;
DROP POLICY IF EXISTS "Org members can insert inventory_receipts" ON public.inventory_receipts;
DROP POLICY IF EXISTS "Org members can update inventory_receipts" ON public.inventory_receipts;
DROP POLICY IF EXISTS "Org members can delete inventory_receipts" ON public.inventory_receipts;

CREATE POLICY "Org members can select inventory_receipts" ON public.inventory_receipts
  FOR SELECT TO authenticated USING (public.is_org_member(org_id));
CREATE POLICY "Org members can insert inventory_receipts" ON public.inventory_receipts
  FOR INSERT TO authenticated WITH CHECK (public.is_org_member(org_id));
CREATE POLICY "Org members can update inventory_receipts" ON public.inventory_receipts
  FOR UPDATE TO authenticated USING (public.is_org_member(org_id)) WITH CHECK (public.is_org_member(org_id));
CREATE POLICY "Org members can delete inventory_receipts" ON public.inventory_receipts
  FOR DELETE TO authenticated USING (public.is_org_member(org_id));

-- inventory_receipt_items
ALTER TABLE public.inventory_receipt_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org members can select inventory_receipt_items" ON public.inventory_receipt_items;
DROP POLICY IF EXISTS "Org members can insert inventory_receipt_items" ON public.inventory_receipt_items;
DROP POLICY IF EXISTS "Org members can update inventory_receipt_items" ON public.inventory_receipt_items;
DROP POLICY IF EXISTS "Org members can delete inventory_receipt_items" ON public.inventory_receipt_items;

CREATE POLICY "Org members can select inventory_receipt_items" ON public.inventory_receipt_items
  FOR SELECT TO authenticated USING (public.is_org_member(org_id));
CREATE POLICY "Org members can insert inventory_receipt_items" ON public.inventory_receipt_items
  FOR INSERT TO authenticated WITH CHECK (public.is_org_member(org_id));
CREATE POLICY "Org members can update inventory_receipt_items" ON public.inventory_receipt_items
  FOR UPDATE TO authenticated USING (public.is_org_member(org_id)) WITH CHECK (public.is_org_member(org_id));
CREATE POLICY "Org members can delete inventory_receipt_items" ON public.inventory_receipt_items
  FOR DELETE TO authenticated USING (public.is_org_member(org_id));

-------------------------------
-- 3) Replace v_product_cost_pool
-------------------------------

-- Beta cost pool via receipts; no FIFO; WAC only.
CREATE OR REPLACE VIEW public.v_product_cost_pool AS
SELECT
  r.org_id,
  i.product_id,
  SUM(i.units_received)::numeric(18,4) AS units_in,
  SUM(i.line_cost + COALESCE(i.landed_cost_allocated, 0))::numeric(18,2) AS cost_in
FROM public.inventory_receipt_items i
JOIN public.inventory_receipts r
  ON r.id = i.receipt_id AND r.org_id = i.org_id
GROUP BY r.org_id, i.product_id;

-------------------------------
-- 4) Replace v_product_unit_cost_wac
-------------------------------

CREATE OR REPLACE VIEW public.v_product_unit_cost_wac AS
SELECT
  org_id,
  product_id,
  units_in,
  cost_in,
  CASE WHEN COALESCE(units_in, 0) > 0 THEN cost_in / units_in ELSE NULL END AS unit_cost_wac
FROM public.v_product_cost_pool;

-- Notes:
-- - Beta cost pool via receipts; no FIFO accounting; only weighted average cost (WAC) per product.
-- - orders_count in v_product_units_sold_day is a placeholder until true quantity data is available.

