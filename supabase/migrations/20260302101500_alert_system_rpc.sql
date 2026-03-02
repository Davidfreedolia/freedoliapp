-- =============================================================================
-- Alert System — RPCs: alert_acknowledge, alert_resolve, alert_mute
-- SECURITY DEFINER; validen existència alerta + visibilitat (owner/admin) + estat; respecten trigger.
-- =============================================================================

-- RPC: acknowledge — només si status='open'
CREATE OR REPLACE FUNCTION public.alert_acknowledge(p_alert_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_alert record;
BEGIN
  SELECT id, org_id, visibility_scope, status INTO v_alert
  FROM public.alerts WHERE id = p_alert_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'alert_not_found';
  END IF;
  IF v_alert.status != 'open' THEN
    RAISE EXCEPTION 'alert_invalid_state_ack';
  END IF;
  IF v_alert.visibility_scope = 'owner_only' AND NOT EXISTS (
    SELECT 1 FROM public.org_memberships om
    WHERE om.org_id = v_alert.org_id AND om.user_id = auth.uid() AND om.role = 'owner'
  ) THEN
    RAISE EXCEPTION 'forbidden_owner_only';
  END IF;
  IF v_alert.visibility_scope = 'admin_owner' AND NOT public.is_org_owner_or_admin(v_alert.org_id) THEN
    RAISE EXCEPTION 'forbidden_admin_owner';
  END IF;
  UPDATE public.alerts
  SET status = 'acknowledged', acknowledged_at = now(), acknowledged_by = auth.uid()
  WHERE id = p_alert_id;
END;
$$;

-- RPC: resolve — només si status IN ('open','acknowledged')
CREATE OR REPLACE FUNCTION public.alert_resolve(p_alert_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_alert record;
BEGIN
  SELECT id, org_id, visibility_scope, status INTO v_alert
  FROM public.alerts WHERE id = p_alert_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'alert_not_found';
  END IF;
  IF v_alert.status NOT IN ('open', 'acknowledged') THEN
    RAISE EXCEPTION 'alert_invalid_state_resolve';
  END IF;
  IF v_alert.visibility_scope = 'owner_only' AND NOT EXISTS (
    SELECT 1 FROM public.org_memberships om
    WHERE om.org_id = v_alert.org_id AND om.user_id = auth.uid() AND om.role = 'owner'
  ) THEN
    RAISE EXCEPTION 'forbidden_owner_only';
  END IF;
  IF v_alert.visibility_scope = 'admin_owner' AND NOT public.is_org_owner_or_admin(v_alert.org_id) THEN
    RAISE EXCEPTION 'forbidden_admin_owner';
  END IF;
  UPDATE public.alerts
  SET status = 'resolved', resolved_at = now(), resolved_by = auth.uid()
  WHERE id = p_alert_id;
END;
$$;

-- RPC: mute — només si status IN ('open','acknowledged')
CREATE OR REPLACE FUNCTION public.alert_mute(p_alert_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_alert record;
BEGIN
  SELECT id, org_id, visibility_scope, status INTO v_alert
  FROM public.alerts WHERE id = p_alert_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'alert_not_found';
  END IF;
  IF v_alert.status NOT IN ('open', 'acknowledged') THEN
    RAISE EXCEPTION 'alert_invalid_state_mute';
  END IF;
  IF v_alert.visibility_scope = 'owner_only' AND NOT EXISTS (
    SELECT 1 FROM public.org_memberships om
    WHERE om.org_id = v_alert.org_id AND om.user_id = auth.uid() AND om.role = 'owner'
  ) THEN
    RAISE EXCEPTION 'forbidden_owner_only';
  END IF;
  IF v_alert.visibility_scope = 'admin_owner' AND NOT public.is_org_owner_or_admin(v_alert.org_id) THEN
    RAISE EXCEPTION 'forbidden_admin_owner';
  END IF;
  UPDATE public.alerts
  SET status = 'muted'
  WHERE id = p_alert_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.alert_acknowledge(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.alert_resolve(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.alert_mute(uuid) TO authenticated;
