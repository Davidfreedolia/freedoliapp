-- ============================================
-- S3.3.F — Seat limit DB enforcement alignment
-- ============================================
-- org_add_member: derive seat limit from same source as trigger
-- (get_org_billing_state + get_plan_limits); fallback to orgs.seat_limit.
-- ============================================

CREATE OR REPLACE FUNCTION public.org_add_member(
  p_org_id uuid,
  p_user_id uuid,
  p_role text DEFAULT 'member'
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_ok boolean;
  v_plan text;
  v_seats_active integer;
  v_seat_limit integer;
  v_exists boolean;
BEGIN
  IF p_org_id IS NULL OR p_user_id IS NULL THEN
    RAISE EXCEPTION 'org_id and user_id are required';
  END IF;

  IF p_role IS NULL OR p_role NOT IN ('owner', 'admin', 'member') THEN
    RAISE EXCEPTION 'role must be one of: owner, admin, member';
  END IF;

  v_caller_ok := public.is_org_owner_or_admin(p_org_id);
  IF NOT v_caller_ok THEN
    RAISE EXCEPTION 'only owner or admin of the org can add members';
  END IF;

  -- S3.2.B: only active memberships count toward seat limit
  SELECT COUNT(*)::integer INTO v_seats_active
  FROM public.org_memberships
  WHERE org_id = p_org_id
    AND status = 'active';

  -- S3.3.F: same source as trigger (get_org_billing_state + get_plan_limits); fallback to orgs.seat_limit
  SELECT g.plan INTO v_plan FROM public.get_org_billing_state(p_org_id) g LIMIT 1;
  SELECT l.seats_limit INTO v_seat_limit FROM public.get_plan_limits(v_plan) l LIMIT 1;
  IF v_seat_limit IS NULL THEN
    SELECT o.seat_limit INTO v_seat_limit FROM public.orgs o WHERE o.id = p_org_id;
  END IF;
  IF v_seat_limit IS NULL THEN
    v_seat_limit := 1;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.org_memberships
    WHERE org_id = p_org_id AND user_id = p_user_id
  ) INTO v_exists;

  IF v_exists THEN
    RETURN 'already_member';
  END IF;

  -- Adding one active member; block if already at or over limit
  IF v_seats_active >= v_seat_limit THEN
    RAISE EXCEPTION 'seat_limit_reached';
  END IF;

  INSERT INTO public.org_memberships (org_id, user_id, role)
  VALUES (p_org_id, p_user_id, p_role);

  RETURN 'ok';
END;
$$;

COMMENT ON FUNCTION public.org_add_member(uuid, uuid, text) IS
  'F2 CBA / S3.2.B / S3.3.F: Add member to org (as active). Caller must be owner/admin. Seat limit from get_org_billing_state+get_plan_limits; fallback orgs.seat_limit.';
