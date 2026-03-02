-- ============================================
-- F2 CBA — PAS 4: Seat enforcement RPC
-- ============================================
-- org_add_member: només owner/admin pot afegir; comprova seat_limit; idempotent si ja és membre.
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
  v_seats_used integer;
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

  SELECT COUNT(*)::integer INTO v_seats_used
  FROM public.org_memberships
  WHERE org_id = p_org_id;

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

  IF v_seats_used >= v_seat_limit THEN
    RAISE EXCEPTION 'seat_limit_reached';
  END IF;

  INSERT INTO public.org_memberships (org_id, user_id, role)
  VALUES (p_org_id, p_user_id, p_role);

  RETURN 'ok';
END;
$$;

COMMENT ON FUNCTION public.org_add_member(uuid, uuid, text) IS
  'F2 CBA: Add member to org. Caller must be owner/admin. Enforces seat_limit. Idempotent: returns already_member if already in org.';

GRANT EXECUTE ON FUNCTION public.org_add_member(uuid, uuid, text) TO authenticated;

-- ============================================
-- Smoke test (manual, SQL Editor):
-- 1) As owner: SELECT org_add_member('<org_id>', '<user_id>', 'member'); => 'ok' or 'already_member'
-- 2) Set org seat_limit = 1, ensure 1 member already; call org_add_member for another user => expect error seat_limit_reached
-- 3) As non-owner: expect 'only owner or admin of the org can add members'
-- ============================================
