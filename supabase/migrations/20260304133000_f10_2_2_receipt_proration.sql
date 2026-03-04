-- =============================================================================
-- F10.2.2 Landed Cost Proration (Beta)
-- =============================================================================
-- Repartir inventory_receipts.landed_cost_total a
-- inventory_receipt_items.landed_cost_allocated de forma idempotent i auditable.
-- Rounding: 4 decimals per línia; guardrail ajusta la diferència a la línia
-- amb major line_cost (o units_received) si sum(allocated) no quadra amb header.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpc_receipt_prorate_landed_cost(p_org_id uuid, p_receipt_id uuid)
RETURNS TABLE(updated_items int, total_allocated numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_receipt RECORD;
  v_header_landed numeric := 0;
  v_sum_line_cost numeric := 0;
  v_sum_units numeric := 0;
  v_updated int := 0;
  v_total_allocated numeric := 0;
  v_diff numeric;
  v_adj_id uuid;
BEGIN
  -- Només opera dins org: valida receipt
  SELECT id, org_id, landed_cost_total INTO v_receipt
  FROM public.inventory_receipts
  WHERE id = p_receipt_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'receipt_not_found';
  END IF;
  IF v_receipt.org_id IS DISTINCT FROM p_org_id THEN
    RAISE EXCEPTION 'receipt_org_mismatch';
  END IF;

  v_header_landed := COALESCE(v_receipt.landed_cost_total, 0);

  IF v_header_landed = 0 THEN
    UPDATE public.inventory_receipt_items
    SET landed_cost_allocated = 0
    WHERE receipt_id = p_receipt_id AND org_id = p_org_id;
    GET DIAGNOSTICS v_updated = ROW_COUNT;
    updated_items := v_updated;
    total_allocated := 0;
    RETURN NEXT;
    RETURN;
  END IF;

  SELECT COALESCE(SUM(line_cost), 0), COALESCE(SUM(units_received), 0)::numeric
  INTO v_sum_line_cost, v_sum_units
  FROM public.inventory_receipt_items
  WHERE receipt_id = p_receipt_id AND org_id = p_org_id;

  IF v_sum_line_cost > 0 THEN
    UPDATE public.inventory_receipt_items i
    SET landed_cost_allocated = ROUND((v_header_landed * (i.line_cost / v_sum_line_cost))::numeric, 4)
    WHERE i.receipt_id = p_receipt_id AND i.org_id = p_org_id;
  ELSIF v_sum_units > 0 THEN
    UPDATE public.inventory_receipt_items i
    SET landed_cost_allocated = ROUND((v_header_landed * (i.units_received::numeric / v_sum_units))::numeric, 4)
    WHERE i.receipt_id = p_receipt_id AND i.org_id = p_org_id;
  ELSE
    UPDATE public.inventory_receipt_items
    SET landed_cost_allocated = 0
    WHERE receipt_id = p_receipt_id AND org_id = p_org_id;
  END IF;

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  SELECT COALESCE(SUM(landed_cost_allocated), 0) INTO v_total_allocated
  FROM public.inventory_receipt_items
  WHERE receipt_id = p_receipt_id AND org_id = p_org_id;

  -- Guardrail: sum(landed_cost_allocated) ≈ header_landed (tolerància 0.01)
  v_diff := v_header_landed - v_total_allocated;
  IF ABS(v_diff) > 0.01 AND v_updated > 0 THEN
    IF v_sum_line_cost > 0 THEN
      SELECT id INTO v_adj_id
      FROM public.inventory_receipt_items
      WHERE receipt_id = p_receipt_id AND org_id = p_org_id
      ORDER BY line_cost DESC, units_received DESC
      LIMIT 1;
    ELSE
      SELECT id INTO v_adj_id
      FROM public.inventory_receipt_items
      WHERE receipt_id = p_receipt_id AND org_id = p_org_id
      ORDER BY units_received DESC
      LIMIT 1;
    END IF;
    IF v_adj_id IS NOT NULL THEN
      UPDATE public.inventory_receipt_items
      SET landed_cost_allocated = landed_cost_allocated + v_diff
      WHERE id = v_adj_id;
      v_total_allocated := v_header_landed;
    END IF;
  END IF;

  updated_items := v_updated;
  total_allocated := v_total_allocated;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.rpc_receipt_prorate_landed_cost(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_receipt_prorate_landed_cost(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_receipt_prorate_landed_cost(uuid, uuid) TO service_role;
