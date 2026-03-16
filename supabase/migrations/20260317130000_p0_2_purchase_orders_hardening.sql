-- P0.2 — Purchase Orders hardening
-- Minimal server-side contract for org-scoped POs, totals and status/immutability.

-- 1) Status change metadata (traceability)
ALTER TABLE public.purchase_orders
  ADD COLUMN IF NOT EXISTS status_changed_at timestamptz;

-- 2) Basic invariants for totals and items
ALTER TABLE public.purchase_orders
  ADD CONSTRAINT IF NOT EXISTS purchase_orders_total_non_negative
  CHECK (total_amount >= 0);

ALTER TABLE public.purchase_orders
  ADD CONSTRAINT IF NOT EXISTS purchase_orders_items_array
  CHECK (items IS NULL OR jsonb_typeof(items) = 'array');

-- 3) BEFORE INSERT/UPDATE trigger: normalize totals from items, enforce immutability after draft,
--    and keep status_changed_at updated.
CREATE OR REPLACE FUNCTION public.purchase_orders_before_write()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  item jsonb;
  qty numeric;
  price numeric;
  total numeric := 0;
BEGIN
  -- Normalize items to an array and recompute total_amount from qty * unit_price
  IF NEW.items IS NULL THEN
    NEW.items := '[]'::jsonb;
  END IF;

  IF jsonb_typeof(NEW.items) <> 'array' THEN
    RAISE EXCEPTION 'purchase_orders.items must be a JSON array';
  END IF;

  FOR item IN SELECT * FROM jsonb_array_elements(NEW.items)
  LOOP
    qty := COALESCE(NULLIF(trim((item->>'qty')), '')::numeric, 0);
    price := COALESCE(NULLIF(trim((item->>'unit_price')), '')::numeric, 0);
    total := total + COALESCE(qty, 0) * COALESCE(price, 0);
  END LOOP;

  NEW.total_amount := COALESCE(total, 0);

  -- Immutability: once a PO has left draft, core commercial fields are frozen.
  -- Allowed even after draft: status, logistics_status, tracking_number, notes and similar operational fields.
  IF TG_OP = 'UPDATE' AND OLD.status IS NOT NULL AND OLD.status <> 'draft' THEN
    IF NEW.project_id IS DISTINCT FROM OLD.project_id
       OR NEW.supplier_id IS DISTINCT FROM OLD.supplier_id
       OR NEW.po_number  IS DISTINCT FROM OLD.po_number
       OR NEW.order_date IS DISTINCT FROM OLD.order_date
       OR NEW.currency   IS DISTINCT FROM OLD.currency
       OR NEW.incoterm   IS DISTINCT FROM OLD.incoterm
       OR NEW.items      IS DISTINCT FROM OLD.items
    THEN
      RAISE EXCEPTION 'immutable_purchase_order_fields_after_draft';
    END IF;
  END IF;

  -- Status change timestamp
  IF TG_OP = 'UPDATE' AND (NEW.status IS DISTINCT FROM OLD.status) THEN
    NEW.status_changed_at := now();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS purchase_orders_before_write ON public.purchase_orders;

CREATE TRIGGER purchase_orders_before_write
BEFORE INSERT OR UPDATE ON public.purchase_orders
FOR EACH ROW
EXECUTE FUNCTION public.purchase_orders_before_write();

