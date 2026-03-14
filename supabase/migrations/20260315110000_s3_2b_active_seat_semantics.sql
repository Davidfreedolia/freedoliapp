-- ============================================
-- S3.2.B — Active seat semantics
-- ============================================
-- Seat usage = org_memberships.status = 'active' only.
-- Invited, suspended, removed do NOT count as seats.
-- ============================================

-- 1) enforce_seat_limit: count only active members; block only when adding an active would exceed limit
CREATE OR REPLACE FUNCTION public.enforce_seat_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan text;
  v_status text;
  v_seats_limit int;
  v_seats_active int;
  v_new_is_active boolean;
BEGIN
  SELECT g.plan, g.status INTO v_plan, v_status
  FROM public.get_org_billing_state(NEW.org_id) g;

  IF v_status IN ('past_due', 'canceled') THEN
    RAISE EXCEPTION 'BILLING_INACTIVE';
  END IF;

  SELECT l.seats_limit INTO v_seats_limit
  FROM public.get_plan_limits(v_plan) l;

  -- S3.2.B: only active memberships count as seats
  SELECT COUNT(*)::int INTO v_seats_active
  FROM public.org_memberships
  WHERE org_id = NEW.org_id
    AND status = 'active';

  -- New row consumes a seat only when status is active (or default)
  v_new_is_active := (COALESCE(NEW.status::text, 'active') = 'active');

  IF v_new_is_active AND (v_seats_active >= v_seats_limit) THEN
    RAISE EXCEPTION 'SEAT_LIMIT_REACHED';
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.enforce_seat_limit() IS 'S3.2.B: Enforces seat limit using active memberships only. Invited/suspended/removed do not count.';

-- 2) org_add_member: seat check uses active count only; insert adds active member (default)
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

  SELECT o.seat_limit INTO v_seat_limit
  FROM public.orgs o
  WHERE o.id = p_org_id;

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
  'F2 CBA / S3.2.B: Add member to org (as active). Caller must be owner/admin. Seat limit uses active members only.';
