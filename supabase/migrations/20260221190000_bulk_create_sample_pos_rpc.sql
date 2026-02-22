-- PAS M5: RPC bulk create sample POs (1 PO per supplier_id), link supplier_sample_requests.po_id

CREATE OR REPLACE FUNCTION public.bulk_create_sample_pos(sample_request_ids uuid[])
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid;
  rec record;
  proj_id uuid;
  sku text;
  is_demo_val boolean;
  to_skip uuid[];
  to_process uuid[] := '{}';
  by_supplier jsonb := '{}';
  sid uuid;
  ids_for_supplier uuid[];
  po_num text;
  next_num int := 1;
  new_po_id uuid;
  created_pos jsonb := '[]'::jsonb;
  linked jsonb := '[]'::jsonb;
  skipped jsonb := '[]'::jsonb;
  first_id uuid;
BEGIN
  uid := auth.uid();
  IF uid IS NULL THEN
    RETURN jsonb_build_object('created_pos', '[]'::jsonb, 'linked', '[]'::jsonb, 'skipped', '[]'::jsonb);
  END IF;

  -- Resolve all rows: same user, id in list
  FOR rec IN
    SELECT id, project_id, supplier_id, choice_status, po_id, is_demo
    FROM supplier_sample_requests
    WHERE user_id = uid AND id = ANY(sample_request_ids)
  LOOP
    IF rec.po_id IS NOT NULL THEN
      skipped := skipped || to_jsonb(rec.id::text);
      CONTINUE;
    END IF;
    IF rec.choice_status IS NULL OR rec.choice_status NOT IN ('SHORTLIST', 'WINNER') THEN
      skipped := skipped || to_jsonb(rec.id::text);
      CONTINUE;
    END IF;
    IF proj_id IS NULL THEN
      proj_id := rec.project_id;
      is_demo_val := rec.is_demo;
    ELSIF rec.project_id IS DISTINCT FROM proj_id THEN
      skipped := skipped || to_jsonb(rec.id::text);
      CONTINUE;
    END IF;
    to_process := array_append(to_process, rec.id);
  END LOOP;

  IF array_length(to_process, 1) IS NULL OR proj_id IS NULL THEN
    RETURN jsonb_build_object('created_pos', created_pos, 'linked', linked, 'skipped', skipped);
  END IF;

  SELECT p.sku INTO sku FROM projects p WHERE p.id = proj_id;
  IF sku IS NULL OR sku = '' THEN
    sku := 'SMP';
  END IF;

  -- Next PO number for PO-{sku}-S-01, PO-{sku}-S-02, ...
  SELECT COALESCE(MAX((regexp_match(po_number, '-S-(\d+)$'))[1]::int), 0) + 1 INTO next_num
  FROM purchase_orders
  WHERE po_number LIKE 'PO-' || replace(sku, '%', '\%') || '-S-%';

  -- Group by supplier_id and create one PO per supplier
  FOR sid IN
    SELECT DISTINCT supplier_id
    FROM supplier_sample_requests
    WHERE id = ANY(to_process)
  LOOP
    SELECT array_agg(id) INTO ids_for_supplier
    FROM supplier_sample_requests
    WHERE id = ANY(to_process) AND supplier_id = sid;

    po_num := 'PO-' || sku || '-S-' || lpad(next_num::text, 2, '0');
    next_num := next_num + 1;

    INSERT INTO purchase_orders (
      project_id, supplier_id, user_id, po_number, order_date,
      currency, status, total_amount, items, is_demo
    ) VALUES (
      proj_id, sid, uid, po_num, current_date,
      'USD', 'draft', 0, '[]'::jsonb, COALESCE(is_demo_val, false)
    )
    RETURNING id INTO new_po_id;

    UPDATE supplier_sample_requests
    SET po_id = new_po_id
    WHERE id = ANY(ids_for_supplier);

    created_pos := created_pos || jsonb_build_array(
      jsonb_build_object('id', new_po_id, 'po_number', po_num, 'supplier_id', sid)
    );
    FOR i IN 1 .. array_length(ids_for_supplier, 1) LOOP
      linked := linked || jsonb_build_array(
        jsonb_build_object('sample_request_id', ids_for_supplier[i], 'po_id', new_po_id)
      );
    END LOOP;
  END LOOP;

  RETURN jsonb_build_object('created_pos', created_pos, 'linked', linked, 'skipped', skipped);
END;
$$;

GRANT EXECUTE ON FUNCTION public.bulk_create_sample_pos(uuid[]) TO authenticated;
