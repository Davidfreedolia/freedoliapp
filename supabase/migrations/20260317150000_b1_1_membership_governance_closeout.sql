-- ============================================
-- B1.1 — Membership lifecycle & governance backend closeout
-- ============================================
-- 1) Membership status contract enforced (enum already exists; RLS write policies)
-- 2) org_invitations table + create/accept/revoke RPCs
-- 3) membership_set_status RPC (suspend / reactivate / remove)
-- 4) membership_governance_audit table + writes from RPCs
-- No Amazon jobs, no assistant, minimal scope.
-- ============================================

-- ---------------------------------------------------------------------------
-- 1) RLS on org_memberships: enable + write policies (owner/admin only)
-- ---------------------------------------------------------------------------
ALTER TABLE public.org_memberships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owner or admin can insert org_memberships" ON public.org_memberships;
CREATE POLICY "Owner or admin can insert org_memberships" ON public.org_memberships
  FOR INSERT TO authenticated
  WITH CHECK (public.is_org_owner_or_admin(org_id));

DROP POLICY IF EXISTS "Owner or admin can update org_memberships" ON public.org_memberships;
CREATE POLICY "Owner or admin can update org_memberships" ON public.org_memberships
  FOR UPDATE TO authenticated
  USING (public.is_org_owner_or_admin(org_id))
  WITH CHECK (public.is_org_owner_or_admin(org_id));

DROP POLICY IF EXISTS "Owner or admin can delete org_memberships" ON public.org_memberships;
CREATE POLICY "Owner or admin can delete org_memberships" ON public.org_memberships
  FOR DELETE TO authenticated
  USING (public.is_org_owner_or_admin(org_id));

-- Trigger: set suspended_at when status becomes 'suspended'; clear when reactivated
CREATE OR REPLACE FUNCTION public.org_memberships_set_suspended_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'suspended' AND (OLD.status IS NULL OR OLD.status <> 'suspended') THEN
    NEW.suspended_at := now();
  ELSIF NEW.status = 'active' AND OLD.status = 'suspended' THEN
    NEW.suspended_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_org_memberships_set_suspended_at ON public.org_memberships;
CREATE TRIGGER trg_org_memberships_set_suspended_at
  BEFORE UPDATE ON public.org_memberships
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.org_memberships_set_suspended_at();

COMMENT ON FUNCTION public.org_memberships_set_suspended_at() IS 'B1.1: Set/clear suspended_at on status transition to/from suspended.';

-- ---------------------------------------------------------------------------
-- 2) Governance audit table (minimal operational trail)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.membership_governance_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text,
  actor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  old_value jsonb,
  new_value jsonb,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_membership_governance_audit_org_created
  ON public.membership_governance_audit(org_id, created_at DESC);

COMMENT ON TABLE public.membership_governance_audit IS 'B1.1: Operational audit trail for membership/invitation actions.';

ALTER TABLE public.membership_governance_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner or admin can select governance audit" ON public.membership_governance_audit
  FOR SELECT TO authenticated
  USING (public.is_org_owner_or_admin(org_id));

-- Insert only via SECURITY DEFINER RPCs (no client INSERT policy)

-- ---------------------------------------------------------------------------
-- 3) org_invitations table
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.org_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  token text NOT NULL UNIQUE,
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  expires_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_org_invitations_token ON public.org_invitations(token);
CREATE INDEX IF NOT EXISTS idx_org_invitations_org_status ON public.org_invitations(org_id, status);

COMMENT ON TABLE public.org_invitations IS 'B1.1: Pending invitations; accept creates org_memberships and marks accepted.';

ALTER TABLE public.org_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can select org_invitations" ON public.org_invitations
  FOR SELECT TO authenticated
  USING (public.is_org_member(org_id) OR public.is_org_owner_or_admin(org_id));

CREATE POLICY "Owner or admin can insert org_invitations" ON public.org_invitations
  FOR INSERT TO authenticated
  WITH CHECK (public.is_org_owner_or_admin(org_id));

CREATE POLICY "Owner or admin can update org_invitations" ON public.org_invitations
  FOR UPDATE TO authenticated
  USING (public.is_org_owner_or_admin(org_id))
  WITH CHECK (public.is_org_owner_or_admin(org_id));

-- No DELETE policy; revoke = status cancelled via RPC

-- ---------------------------------------------------------------------------
-- 4) RPC: create_org_invitation
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_org_invitation(
  p_org_id uuid,
  p_email text,
  p_role text DEFAULT 'member'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_ok boolean;
  v_token text;
  v_expires_at timestamptz;
  v_inv_id uuid;
BEGIN
  IF p_org_id IS NULL OR p_email IS NULL OR trim(p_email) = '' THEN
    RAISE EXCEPTION 'org_id and email are required';
  END IF;

  IF p_role IS NULL OR p_role NOT IN ('admin', 'member') THEN
    RAISE EXCEPTION 'role must be admin or member';
  END IF;

  v_caller_ok := public.is_org_owner_or_admin(p_org_id);
  IF NOT v_caller_ok THEN
    RAISE EXCEPTION 'only owner or admin can create invitations';
  END IF;

  v_token := encode(gen_random_bytes(32), 'base64url');
  v_expires_at := now() + interval '7 days';

  INSERT INTO public.org_invitations (org_id, email, role, token, invited_by, expires_at, status)
  VALUES (p_org_id, trim(lower(p_email)), p_role, v_token, auth.uid(), v_expires_at, 'pending')
  RETURNING id INTO v_inv_id;

  INSERT INTO public.membership_governance_audit (org_id, action, entity_type, entity_id, actor_user_id, new_value)
  VALUES (p_org_id, 'invitation_created', 'org_invitation', v_inv_id::text, auth.uid(),
          jsonb_build_object('invitation_id', v_inv_id, 'email', trim(lower(p_email)), 'role', p_role, 'expires_at', v_expires_at));

  RETURN jsonb_build_object('id', v_inv_id, 'token', v_token, 'expires_at', v_expires_at);
END;
$$;

COMMENT ON FUNCTION public.create_org_invitation(uuid, text, text) IS 'B1.1: Create invitation; returns token for accept link. Owner/admin only.';

GRANT EXECUTE ON FUNCTION public.create_org_invitation(uuid, text, text) TO authenticated;

-- ---------------------------------------------------------------------------
-- 5) RPC: accept_org_invitation (caller = accepter; must match invitation email if we had it)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.accept_org_invitation(p_token text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inv record;
  v_plan text;
  v_seats_active int;
  v_seat_limit int;
  v_accepter_email text;
BEGIN
  IF p_token IS NULL OR trim(p_token) = '' THEN
    RAISE EXCEPTION 'token is required';
  END IF;

  SELECT id, org_id, email, role, invited_by, created_at, status, expires_at
  INTO v_inv
  FROM public.org_invitations
  WHERE token = trim(p_token);

  IF v_inv.id IS NULL THEN
    RAISE EXCEPTION 'invitation_not_found';
  END IF;

  IF v_inv.status <> 'pending' THEN
    RAISE EXCEPTION 'invitation_not_pending';
  END IF;

  IF v_inv.expires_at < now() THEN
    UPDATE public.org_invitations SET status = 'expired' WHERE id = v_inv.id;
    INSERT INTO public.membership_governance_audit (org_id, action, entity_type, entity_id, actor_user_id, new_value)
    VALUES (v_inv.org_id, 'invitation_expired', 'org_invitation', v_inv.id::text, auth.uid(), jsonb_build_object('invitation_id', v_inv.id));
    RAISE EXCEPTION 'invitation_expired';
  END IF;

  SELECT email INTO v_accepter_email FROM auth.users WHERE id = auth.uid();
  IF v_accepter_email IS NULL OR lower(trim(v_accepter_email)) <> lower(trim(v_inv.email)) THEN
    RAISE EXCEPTION 'invitation_email_mismatch';
  END IF;

  IF EXISTS (SELECT 1 FROM public.org_memberships WHERE org_id = v_inv.org_id AND user_id = auth.uid()) THEN
    RAISE EXCEPTION 'already_member';
  END IF;

  SELECT g.plan INTO v_plan FROM public.get_org_billing_state(v_inv.org_id) g LIMIT 1;
  SELECT l.seats_limit INTO v_seat_limit FROM public.get_plan_limits(v_plan) l LIMIT 1;
  IF v_seat_limit IS NULL THEN
    SELECT o.seat_limit INTO v_seat_limit FROM public.orgs o WHERE o.id = v_inv.org_id;
  END IF;
  IF v_seat_limit IS NULL THEN
    v_seat_limit := 1;
  END IF;

  SELECT COUNT(*)::int INTO v_seats_active
  FROM public.org_memberships
  WHERE org_id = v_inv.org_id AND status = 'active';

  IF v_seats_active >= v_seat_limit THEN
    RAISE EXCEPTION 'seat_limit_reached';
  END IF;

  INSERT INTO public.org_memberships (org_id, user_id, role, status, invited_by, invited_at, accepted_at)
  VALUES (v_inv.org_id, auth.uid(), v_inv.role, 'active', v_inv.invited_by, v_inv.created_at, now());

  UPDATE public.org_invitations SET status = 'accepted' WHERE id = v_inv.id;

  INSERT INTO public.membership_governance_audit (org_id, action, entity_type, entity_id, actor_user_id, new_value)
  VALUES (v_inv.org_id, 'invitation_accepted', 'org_invitation', v_inv.id::text, auth.uid(),
          jsonb_build_object('invitation_id', v_inv.id, 'user_id', auth.uid(), 'role', v_inv.role));

  RETURN 'ok';
END;
$$;

COMMENT ON FUNCTION public.accept_org_invitation(text) IS 'B1.1: Accept invitation by token. Caller must be authenticated; email must match invitation.';

GRANT EXECUTE ON FUNCTION public.accept_org_invitation(text) TO authenticated;

-- ---------------------------------------------------------------------------
-- 6) RPC: revoke_org_invitation (by id; owner/admin only)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.revoke_org_invitation(p_invitation_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
  v_caller_ok boolean;
BEGIN
  IF p_invitation_id IS NULL THEN
    RAISE EXCEPTION 'invitation_id is required';
  END IF;

  SELECT org_id INTO v_org_id FROM public.org_invitations WHERE id = p_invitation_id;
  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'invitation_not_found';
  END IF;

  v_caller_ok := public.is_org_owner_or_admin(v_org_id);
  IF NOT v_caller_ok THEN
    RAISE EXCEPTION 'only owner or admin can revoke invitations';
  END IF;

  UPDATE public.org_invitations SET status = 'cancelled' WHERE id = p_invitation_id AND status = 'pending';

  INSERT INTO public.membership_governance_audit (org_id, action, entity_type, entity_id, actor_user_id, new_value)
  VALUES (v_org_id, 'invitation_cancelled', 'org_invitation', p_invitation_id::text, auth.uid(), jsonb_build_object('invitation_id', p_invitation_id));

  RETURN 'ok';
END;
$$;

COMMENT ON FUNCTION public.revoke_org_invitation(uuid) IS 'B1.1: Cancel pending invitation. Owner/admin only.';

GRANT EXECUTE ON FUNCTION public.revoke_org_invitation(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- 7) RPC: membership_set_status (suspend / reactivate / remove)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.membership_set_status(
  p_org_id uuid,
  p_user_id uuid,
  p_new_status text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_ok boolean;
  v_old record;
  v_allowed boolean := false;
BEGIN
  IF p_org_id IS NULL OR p_user_id IS NULL OR p_new_status IS NULL THEN
    RAISE EXCEPTION 'org_id, user_id and new_status are required';
  END IF;

  IF p_new_status NOT IN ('active', 'suspended', 'removed') THEN
    RAISE EXCEPTION 'new_status must be active, suspended or removed';
  END IF;

  v_caller_ok := public.is_org_owner_or_admin(p_org_id);
  IF NOT v_caller_ok THEN
    RAISE EXCEPTION 'only owner or admin can change member status';
  END IF;

  SELECT status, role INTO v_old
  FROM public.org_memberships
  WHERE org_id = p_org_id AND user_id = p_user_id;

  IF v_old.status IS NULL THEN
    RAISE EXCEPTION 'member_not_found';
  END IF;

  IF p_user_id = auth.uid() AND p_new_status IN ('suspended', 'removed') THEN
    RAISE EXCEPTION 'cannot_suspend_or_remove_self';
  END IF;

  -- Allowed transitions: active <-> suspended; active -> removed; suspended -> removed
  v_allowed := (v_old.status = 'active' AND p_new_status IN ('suspended', 'removed'))
    OR (v_old.status = 'suspended' AND p_new_status IN ('active', 'removed'))
    OR (v_old.status = 'removed' AND p_new_status = 'active');
  IF NOT v_allowed THEN
    RAISE EXCEPTION 'invalid_status_transition';
  END IF;

  UPDATE public.org_memberships
  SET status = p_new_status::public.membership_status
  WHERE org_id = p_org_id AND user_id = p_user_id;

  IF p_new_status = 'suspended' THEN
    INSERT INTO public.membership_governance_audit (org_id, action, entity_type, entity_id, actor_user_id, old_value, new_value)
    VALUES (p_org_id, 'member_suspended', 'org_membership', p_org_id::text || ',' || p_user_id::text, auth.uid(),
            jsonb_build_object('user_id', p_user_id, 'previous_status', v_old.status), jsonb_build_object('user_id', p_user_id, 'status', 'suspended'));
  ELSIF p_new_status = 'active' AND v_old.status = 'suspended' THEN
    INSERT INTO public.membership_governance_audit (org_id, action, entity_type, entity_id, actor_user_id, old_value, new_value)
    VALUES (p_org_id, 'member_reactivated', 'org_membership', p_org_id::text || ',' || p_user_id::text, auth.uid(),
            jsonb_build_object('user_id', p_user_id, 'previous_status', v_old.status), jsonb_build_object('user_id', p_user_id, 'status', 'active'));
  ELSIF p_new_status = 'removed' THEN
    INSERT INTO public.membership_governance_audit (org_id, action, entity_type, entity_id, actor_user_id, old_value, new_value)
    VALUES (p_org_id, 'member_removed', 'org_membership', p_org_id::text || ',' || p_user_id::text, auth.uid(),
            jsonb_build_object('user_id', p_user_id, 'previous_status', v_old.status), jsonb_build_object('user_id', p_user_id, 'status', 'removed'));
  END IF;

  RETURN 'ok';
END;
$$;

COMMENT ON FUNCTION public.membership_set_status(uuid, uuid, text) IS 'B1.1: Set membership status (suspend/reactivate/remove). Owner/admin only; cannot suspend/remove self.';

GRANT EXECUTE ON FUNCTION public.membership_set_status(uuid, uuid, text) TO authenticated;

-- ---------------------------------------------------------------------------
-- 8) Optional: audit when org_add_member is used (direct add, no invite)
-- ---------------------------------------------------------------------------
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

  SELECT COUNT(*)::integer INTO v_seats_active
  FROM public.org_memberships
  WHERE org_id = p_org_id
    AND status = 'active';

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

  IF v_seats_active >= v_seat_limit THEN
    RAISE EXCEPTION 'seat_limit_reached';
  END IF;

  INSERT INTO public.org_memberships (org_id, user_id, role, status, accepted_at)
  VALUES (p_org_id, p_user_id, p_role, 'active', now());

  INSERT INTO public.membership_governance_audit (org_id, action, entity_type, entity_id, actor_user_id, new_value)
  VALUES (p_org_id, 'member_added_direct', 'org_membership', p_org_id::text || ',' || p_user_id::text, auth.uid(),
          jsonb_build_object('user_id', p_user_id, 'role', p_role));

  RETURN 'ok';
END;
$$;

COMMENT ON FUNCTION public.org_add_member(uuid, uuid, text) IS 'F2 CBA / S3.2.B / S3.3.F / B1.1: Add member directly (active). Owner/admin only. Seat limit from get_org_billing_state+get_plan_limits. Audit: member_added_direct.';

GRANT EXECUTE ON FUNCTION public.org_add_member(uuid, uuid, text) TO authenticated;
