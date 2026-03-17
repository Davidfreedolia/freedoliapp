-- B1.3 — PO / Inventory immutability & audit closeout
-- Minimal, safe backend hardening on top of existing schema.

-- ============================================================================
-- 1) Status transition guard for purchase_orders
--    - Prevent nonsense backward transitions from final / advanced states.
--    - Do NOT change existing status domain or core immutability logic.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.purchase_orders_before_status_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_old text;
  v_new text;
BEGIN
  -- Only care about real status changes
  IF TG_OP <> 'UPDATE' THEN
    RETURN NEW;
  END IF;

  v_old := COALESCE(OLD.status, 'draft');
  v_new := COALESCE(NEW.status, v_old);

  -- If status did not change, nothing to do here
  IF v_old = v_new THEN
    RETURN NEW;
  END IF;

  -- Minimal, defensive rules:
  -- 1) "delivered" and "cancelled" are terminal: cannot leave these states.
  IF v_old IN ('delivered', 'cancelled') AND v_new <> v_old THEN
    RAISE EXCEPTION 'invalid_status_transition_from_terminal'
      USING DETAIL = format('Cannot change status from %s to %s for purchase_order %s', v_old, v_new, NEW.id);
  END IF;

  -- 2) For other cases we accept transitions (existing app-level rules apply).
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS purchase_orders_before_status_update ON public.purchase_orders;
CREATE TRIGGER purchase_orders_before_status_update
BEFORE UPDATE ON public.purchase_orders
FOR EACH ROW
EXECUTE FUNCTION public.purchase_orders_before_status_update();


-- ============================================================================
-- 2) PO audit trail (minimal)
--    - Append-only table capturing key changes on purchase_orders.
--    - Focused on status, totals and basic commercial fields.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.purchase_order_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),

  po_id uuid NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  org_id uuid NULL,

  -- Snapshot of selected fields before/after change
  old_snapshot jsonb NOT NULL,
  new_snapshot jsonb NOT NULL,

  -- Optional: actor information when available (may be null when called via service_role)
  actor_user_id uuid NULL
);

CREATE INDEX IF NOT EXISTS idx_purchase_order_audit_po_id_created_at
  ON public.purchase_order_audit(po_id, created_at DESC);

COMMENT ON TABLE public.purchase_order_audit IS 'Append-only audit log for important purchase_orders changes (status, totals, key commercial fields).';


CREATE OR REPLACE FUNCTION public.purchase_orders_after_update_audit()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_old jsonb;
  v_new jsonb;
BEGIN
  IF TG_OP <> 'UPDATE' THEN
    RETURN NEW;
  END IF;

  -- Only log when relevant fields actually change.
  IF OLD.status        IS NOT DISTINCT FROM NEW.status
     AND OLD.total_amount IS NOT DISTINCT FROM NEW.total_amount
     AND OLD.supplier_id  IS NOT DISTINCT FROM NEW.supplier_id
     AND OLD.order_date   IS NOT DISTINCT FROM NEW.order_date
     AND OLD.currency     IS NOT DISTINCT FROM NEW.currency
  THEN
    RETURN NEW;
  END IF;

  v_old := jsonb_build_object(
    'status',       OLD.status,
    'total_amount', OLD.total_amount,
    'supplier_id',  OLD.supplier_id,
    'order_date',   OLD.order_date,
    'currency',     OLD.currency
  );

  v_new := jsonb_build_object(
    'status',       NEW.status,
    'total_amount', NEW.total_amount,
    'supplier_id',  NEW.supplier_id,
    'order_date',   NEW.order_date,
    'currency',     NEW.currency
  );

  INSERT INTO public.purchase_order_audit (po_id, org_id, old_snapshot, new_snapshot, actor_user_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.org_id, OLD.org_id),
    v_old,
    v_new,
    auth.uid()
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS purchase_orders_after_update_audit ON public.purchase_orders;
CREATE TRIGGER purchase_orders_after_update_audit
AFTER UPDATE ON public.purchase_orders
FOR EACH ROW
EXECUTE FUNCTION public.purchase_orders_after_update_audit();


-- ============================================================================
-- 3) Inventory entry contract reflection (receipts as canonical path)
--    - No behavior change; only explicit comments to fix the contract in schema.
-- ============================================================================

COMMENT ON TABLE public.inventory_receipts IS
  'Canonical entry point for inventory receipts (units & landed cost) per project/org. Source_type indicates PO/SHIPMENT/MANUAL.';

COMMENT ON TABLE public.inventory_receipt_items IS
  'Line-level items for inventory_receipts. Each row represents units received and cost per product for a given receipt.';

