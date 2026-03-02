-- =============================================================================
-- Alert System — RLS policies (Model C) + seed alert_definitions (F2, O1, S1, O2)
-- ENABLE RLS ja a alerts (migració 01). Cap INSERT/DELETE policy (motor via service role/RPC).
-- =============================================================================

-- 1) Seed alert_definitions (codes canònics F2, O1, S1, O2)
INSERT INTO public.alert_definitions (code, category, default_severity, default_visibility_scope, is_active)
VALUES
  ('F2_UNASSIGNED_EXPENSE', 'finance', 'high', 'admin_owner', true),
  ('O1_PROJECT_STUCK_PHASE', 'operations', 'high', 'admin_owner', true),
  ('S1_SEAT_USAGE_HIGH', 'billing', 'high', 'admin_owner', true),
  ('O2_PO_NO_LOGISTICS', 'operations', 'high', 'admin_owner', true)
ON CONFLICT (code) DO UPDATE SET
  category = EXCLUDED.category,
  default_severity = EXCLUDED.default_severity,
  default_visibility_scope = EXCLUDED.default_visibility_scope,
  is_active = EXCLUDED.is_active;

-- 2) RLS policies per alerts — Model C (owner_only / admin_owner)

-- SELECT: owner_only → només owner; admin_owner → owner o admin
DROP POLICY IF EXISTS "alerts_select_model_c" ON public.alerts;
CREATE POLICY "alerts_select_model_c"
  ON public.alerts
  FOR SELECT
  TO authenticated
  USING (
    public.is_org_member(org_id)
    AND (
      (visibility_scope = 'owner_only' AND EXISTS (
        SELECT 1 FROM public.org_memberships om
        WHERE om.org_id = public.alerts.org_id AND om.user_id = auth.uid() AND om.role = 'owner'
      ))
      OR
      (visibility_scope = 'admin_owner' AND public.is_org_owner_or_admin(org_id))
    )
  );

-- (Cap policy UPDATE: acknowledge/resolve es farà via RPC; el trigger queda com a protecció addicional.)

-- 3) Trigger: només es poden modificar status (ack/resolve/mute) + timestamps/by; la resta → EXCEPTION
CREATE OR REPLACE FUNCTION public.alerts_safe_update_guard()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- si es canvia status, només es permet a acknowledged, resolved o muted (no tornar a open)
  IF (NEW.status IS DISTINCT FROM OLD.status) AND (NEW.status IS NULL OR NEW.status NOT IN ('acknowledged', 'resolved', 'muted')) THEN
    RAISE EXCEPTION 'alerts_safe_update_guard: status must be acknowledged, resolved or muted (not %)', NEW.status;
  END IF;

  -- Whitelist: status, acknowledged_at, acknowledged_by, resolved_at, resolved_by, last_seen_at
  IF OLD.id IS DISTINCT FROM NEW.id OR OLD.org_id IS DISTINCT FROM NEW.org_id
     OR OLD.alert_definition_id IS DISTINCT FROM NEW.alert_definition_id
     OR OLD.entity_type IS DISTINCT FROM NEW.entity_type OR OLD.entity_id IS DISTINCT FROM NEW.entity_id
     OR OLD.severity IS DISTINCT FROM NEW.severity OR OLD.visibility_scope IS DISTINCT FROM NEW.visibility_scope
     OR OLD.title IS DISTINCT FROM NEW.title OR OLD.message IS DISTINCT FROM NEW.message
     OR OLD.payload IS DISTINCT FROM NEW.payload OR OLD.dedupe_key IS DISTINCT FROM NEW.dedupe_key
     OR OLD.first_seen_at IS DISTINCT FROM NEW.first_seen_at OR OLD.created_at IS DISTINCT FROM NEW.created_at
  THEN
    RAISE EXCEPTION 'alerts_safe_update_guard: only status, acknowledged_at/by, resolved_at/by, last_seen_at can be updated';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_alerts_safe_update ON public.alerts;
CREATE TRIGGER trg_alerts_safe_update
  BEFORE UPDATE ON public.alerts
  FOR EACH ROW
  EXECUTE FUNCTION public.alerts_safe_update_guard();

-- Cap policy INSERT ni DELETE (el motor crida via service role / RPC).
