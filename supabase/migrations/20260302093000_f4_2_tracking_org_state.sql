-- =============================================================================
-- F4.2 — Tracking Org State (backoff/errors per org)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.tracking_org_state (
  org_id uuid PRIMARY KEY REFERENCES public.orgs(id) ON DELETE CASCADE,
  backoff_until timestamptz,
  error_count int NOT NULL DEFAULT 0,
  last_error_code text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tracking_org_state_backoff_until
  ON public.tracking_org_state(backoff_until);

ALTER TABLE public.tracking_org_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tracking_org_state_select_model_c" ON public.tracking_org_state;
CREATE POLICY "tracking_org_state_select_model_c"
  ON public.tracking_org_state
  FOR SELECT
  TO authenticated
  USING (public.is_org_member(org_id));

DROP POLICY IF EXISTS "tracking_org_state_insert_model_c" ON public.tracking_org_state;
CREATE POLICY "tracking_org_state_insert_model_c"
  ON public.tracking_org_state
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_org_owner_or_admin(org_id));

DROP POLICY IF EXISTS "tracking_org_state_update_model_c" ON public.tracking_org_state;
CREATE POLICY "tracking_org_state_update_model_c"
  ON public.tracking_org_state
  FOR UPDATE
  TO authenticated
  USING (public.is_org_owner_or_admin(org_id))
  WITH CHECK (public.is_org_owner_or_admin(org_id));

DROP POLICY IF EXISTS "tracking_org_state_delete_model_c" ON public.tracking_org_state;
CREATE POLICY "tracking_org_state_delete_model_c"
  ON public.tracking_org_state
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.org_memberships om
      WHERE om.org_id = public.tracking_org_state.org_id
        AND om.user_id = auth.uid()
        AND om.role = 'owner'
    )
  );

REVOKE ALL ON TABLE public.tracking_org_state FROM anon;
REVOKE ALL ON TABLE public.tracking_org_state FROM authenticated;

-- =============================================================================
-- RPC: tracking_sync_shipment(shipment_id uuid) -> json (owner/admin only)
-- Marks packages of the shipment as due for sync; next cron run will process them.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.tracking_sync_shipment(p_shipment_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_shipment record;
  v_org_id uuid;
  v_packages json;
BEGIN
  SELECT id, org_id INTO v_shipment
  FROM public.shipments
  WHERE id = p_shipment_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'shipment_not_found';
  END IF;

  v_org_id := v_shipment.org_id;

  IF NOT public.is_org_owner_or_admin(v_org_id) THEN
    RAISE EXCEPTION 'forbidden_org_admin_only';
  END IF;

  UPDATE public.packages
  SET next_sync_due_at = now(), updated_at = now()
  WHERE shipment_id = p_shipment_id
    AND tracking_number IS NOT NULL
    AND status <> 'delivered';

  SELECT json_agg(id) INTO v_packages
  FROM public.packages
  WHERE shipment_id = p_shipment_id
    AND tracking_number IS NOT NULL
    AND status <> 'delivered';

  RETURN json_build_object(
    'shipment_id', p_shipment_id,
    'org_id', v_org_id,
    'packages_marked', coalesce(v_packages, '[]'::json)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.tracking_sync_shipment(uuid) TO authenticated;

