-- =============================================================================
-- FASE 3.2 — Motor d'alertes de negoci (run_alert_engine)
-- =============================================================================
-- RPC invocable per org que avalua F2, O1, S1, O2 i escriu a alerts amb
-- dedupe_key prefix biz: (convenció FASE 3.1). Multi-tenant: només per org del caller.
-- Sense auto-resolve; invocació manual a V1.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.run_alert_engine(p_org_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_def_f2 uuid;
  v_def_o1 uuid;
  v_def_s1 uuid;
  v_def_o2 uuid;
  v_seats_used int;
  v_seat_limit int;
  v_plan text;
  v_processed int := 0;
  v_dedupe text;
  v_severity text;
  v_visibility text;
  v_def_id uuid;
  v_title text;
  v_message text;
  v_entity_type text;
  v_entity_id uuid;
  v_payload jsonb;
  v_row record;
BEGIN
  IF p_org_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'org_id_required');
  END IF;

  -- Caller must be member of the org (active membership via is_org_member)
  IF NOT public.is_org_member(p_org_id) THEN
    RAISE EXCEPTION 'forbidden: not a member of this org';
  END IF;

  -- Resolve alert definition ids (FASE 3.1 codes)
  SELECT id INTO v_def_f2 FROM public.alert_definitions WHERE code = 'F2_UNASSIGNED_EXPENSE' AND is_active = true LIMIT 1;
  SELECT id INTO v_def_o1 FROM public.alert_definitions WHERE code = 'O1_PROJECT_STUCK_PHASE' AND is_active = true LIMIT 1;
  SELECT id INTO v_def_s1 FROM public.alert_definitions WHERE code = 'S1_SEAT_USAGE_HIGH' AND is_active = true LIMIT 1;
  SELECT id INTO v_def_o2 FROM public.alert_definitions WHERE code = 'O2_PO_NO_LOGISTICS' AND is_active = true LIMIT 1;

  -- -------------------------------------------------------------------------
  -- F2: Unassigned expense (expenses with org_id and project_id IS NULL)
  -- -------------------------------------------------------------------------
  IF v_def_f2 IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.tables t WHERE t.table_schema = 'public' AND t.table_name = 'expenses') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns c WHERE c.table_schema = 'public' AND c.table_name = 'expenses' AND c.column_name = 'project_id') THEN
      FOR v_row IN
        SELECT e.id AS entity_id, e.amount, e.currency, e.description
        FROM public.expenses e
        WHERE e.org_id = p_org_id AND e.project_id IS NULL
        LIMIT 50
      LOOP
        v_dedupe := 'biz:F2_UNASSIGNED_EXPENSE:' || p_org_id::text || ':' || v_row.entity_id::text;
        v_severity := 'high';
        v_visibility := 'admin_owner';
        v_title := 'Unassigned expense';
        v_message := COALESCE(v_row.description, 'Expense not linked to a project') || ' (€' || COALESCE(v_row.amount::text, '0') || ')';
        v_entity_type := 'expense';
        v_entity_id := v_row.entity_id;
        v_payload := jsonb_build_object('expense_id', v_row.entity_id, 'amount', v_row.amount, 'currency', v_row.currency);

        INSERT INTO public.alerts (org_id, alert_definition_id, entity_type, entity_id, severity, visibility_scope, status, title, message, payload, dedupe_key)
        VALUES (p_org_id, v_def_f2, v_entity_type, v_entity_id, v_severity, v_visibility, 'open', v_title, v_message, v_payload, v_dedupe)
        ON CONFLICT (org_id, dedupe_key) WHERE (status IN ('open', 'acknowledged'))
        DO UPDATE SET last_seen_at = now();
        v_processed := v_processed + 1;
      END LOOP;
    END IF;
  END IF;

  -- -------------------------------------------------------------------------
  -- O1: Project stuck in phase (active project, no update in 30 days)
  -- -------------------------------------------------------------------------
  IF v_def_o1 IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.tables t WHERE t.table_schema = 'public' AND t.table_name = 'projects') THEN
    FOR v_row IN
      SELECT p.id AS entity_id, p.name, p.updated_at
      FROM public.projects p
      WHERE p.org_id = p_org_id
        AND (p.status IS NULL OR p.status = 'active')
        AND p.updated_at < (now() - interval '30 days')
      LIMIT 50
    LOOP
      v_dedupe := 'biz:O1_PROJECT_STUCK_PHASE:' || p_org_id::text || ':' || v_row.entity_id::text;
      v_severity := 'high';
      v_visibility := 'admin_owner';
      v_title := 'Project stuck in phase';
      v_message := COALESCE(v_row.name, 'Project') || ' — no activity in 30+ days';
      v_entity_type := 'project';
      v_entity_id := v_row.entity_id;
      v_payload := jsonb_build_object('project_id', v_row.entity_id, 'last_updated', v_row.updated_at);

      INSERT INTO public.alerts (org_id, alert_definition_id, entity_type, entity_id, severity, visibility_scope, status, title, message, payload, dedupe_key)
      VALUES (p_org_id, v_def_o1, v_entity_type, v_entity_id, v_severity, v_visibility, 'open', v_title, v_message, v_payload, v_dedupe)
      ON CONFLICT (org_id, dedupe_key) WHERE (status IN ('open', 'acknowledged'))
      DO UPDATE SET last_seen_at = now();
      v_processed := v_processed + 1;
    END LOOP;
  END IF;

  -- -------------------------------------------------------------------------
  -- S1: Seat usage > 90% (one alert per org)
  -- -------------------------------------------------------------------------
  IF v_def_s1 IS NOT NULL THEN
    SELECT COUNT(*)::int INTO v_seats_used
    FROM public.org_memberships
    WHERE org_id = p_org_id AND status = 'active';

    SELECT g.plan INTO v_plan FROM public.get_org_billing_state(p_org_id) g LIMIT 1;
    SELECT l.seats_limit INTO v_seat_limit FROM public.get_plan_limits(COALESCE(v_plan, 'growth')) l LIMIT 1;
    IF v_seat_limit IS NULL THEN
      SELECT o.seat_limit INTO v_seat_limit FROM public.orgs o WHERE o.id = p_org_id;
    END IF;
    IF v_seat_limit IS NULL OR v_seat_limit < 1 THEN
      v_seat_limit := 1;
    END IF;

    IF v_seats_used >= v_seat_limit * 0.9 THEN
      v_dedupe := 'biz:S1_SEAT_USAGE_HIGH:' || p_org_id::text;
      v_severity := CASE WHEN v_seats_used >= v_seat_limit THEN 'critical' ELSE 'high' END;
      v_visibility := 'admin_owner';
      v_title := 'Seat usage high';
      v_message := format('Seats used: %s / %s (%s%%)', v_seats_used, v_seat_limit, round((v_seats_used::numeric / NULLIF(v_seat_limit, 0) * 100)::numeric, 0));
      v_entity_type := 'org';
      v_entity_id := p_org_id;
      v_payload := jsonb_build_object('seats_used', v_seats_used, 'seats_limit', v_seat_limit);

      INSERT INTO public.alerts (org_id, alert_definition_id, entity_type, entity_id, severity, visibility_scope, status, title, message, payload, dedupe_key)
      VALUES (p_org_id, v_def_s1, v_entity_type, v_entity_id, v_severity, v_visibility, 'open', v_title, v_message, v_payload, v_dedupe)
      ON CONFLICT (org_id, dedupe_key) WHERE (status IN ('open', 'acknowledged'))
      DO UPDATE SET last_seen_at = now();
      v_processed := v_processed + 1;
    END IF;
  END IF;

  -- -------------------------------------------------------------------------
  -- O2: PO sent/confirmed without logistics record (no shipment)
  -- -------------------------------------------------------------------------
  IF v_def_o2 IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.tables t WHERE t.table_schema = 'public' AND t.table_name = 'purchase_orders') THEN
    IF EXISTS (SELECT 1 FROM information_schema.tables t WHERE t.table_schema = 'public' AND t.table_name = 'shipments') THEN
      FOR v_row IN
        SELECT po.id AS entity_id, po.po_number, po.status AS po_status
        FROM public.purchase_orders po
        WHERE po.org_id = p_org_id
          AND po.status IN ('sent', 'confirmed')
          AND NOT EXISTS (SELECT 1 FROM public.shipments s WHERE s.purchase_order_id = po.id)
        LIMIT 50
      LOOP
        v_dedupe := 'biz:O2_PO_NO_LOGISTICS:' || p_org_id::text || ':' || v_row.entity_id::text;
        v_severity := 'high';
        v_visibility := 'admin_owner';
        v_title := 'PO without logistics record';
        v_message := 'PO ' || COALESCE(v_row.po_number, v_row.entity_id::text) || ' is ' || COALESCE(v_row.po_status, '') || ' but has no shipment';
        v_entity_type := 'purchase_order';
        v_entity_id := v_row.entity_id;
        v_payload := jsonb_build_object('purchase_order_id', v_row.entity_id, 'po_number', v_row.po_number);

        INSERT INTO public.alerts (org_id, alert_definition_id, entity_type, entity_id, severity, visibility_scope, status, title, message, payload, dedupe_key)
        VALUES (p_org_id, v_def_o2, v_entity_type, v_entity_id, v_severity, v_visibility, 'open', v_title, v_message, v_payload, v_dedupe)
        ON CONFLICT (org_id, dedupe_key) WHERE (status IN ('open', 'acknowledged'))
        DO UPDATE SET last_seen_at = now();
        v_processed := v_processed + 1;
      END LOOP;
    END IF;
  END IF;

  RETURN jsonb_build_object('ok', true, 'processed', v_processed);
END;
$$;

COMMENT ON FUNCTION public.run_alert_engine(uuid) IS 'FASE 3.2: Business alert engine. Evaluates F2 (unassigned expense), O1 (project stuck), S1 (seat usage high), O2 (PO without logistics). Writes to alerts with dedupe_key prefix biz:. Caller must be org member. Manual invocation in V1.';

REVOKE ALL ON FUNCTION public.run_alert_engine(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.run_alert_engine(uuid) TO authenticated;
