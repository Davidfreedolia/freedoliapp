-- =============================================================================
-- F4.3 — Tracking alert definitions (SHIPMENT_*) + RLS org-visible SELECT
-- =============================================================================

-- 1) Alert definitions per tracking (org-wide visible)
INSERT INTO public.alert_definitions (code, category, default_severity, default_visibility_scope, is_active)
VALUES
  ('SHIPMENT_EXCEPTION', 'logistics', 'high', 'admin_owner', true),
  ('SHIPMENT_DELIVERED', 'logistics', 'low', 'admin_owner', true),
  ('SHIPMENT_STALLED', 'logistics', 'high', 'admin_owner', true),
  ('SHIPMENT_DELAYED', 'logistics', 'medium', 'admin_owner', true)
ON CONFLICT (code) DO UPDATE SET
  category = EXCLUDED.category,
  default_severity = EXCLUDED.default_severity,
  default_visibility_scope = EXCLUDED.default_visibility_scope,
  is_active = EXCLUDED.is_active;

-- 2) RLS: allow all org members to SELECT alerts (F4.3 org-visible)
DROP POLICY IF EXISTS "alerts_select_org_member" ON public.alerts;
CREATE POLICY "alerts_select_org_member"
  ON public.alerts
  FOR SELECT
  TO authenticated
  USING (public.is_org_member(org_id));
