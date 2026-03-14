-- ============================================
-- S3.2.B.2 — Membership guards: active only
-- ============================================
-- is_org_member and is_org_owner_or_admin consider only status = 'active'.
-- Invited, suspended, removed do not grant workspace access.
-- ============================================

-- Helper: true if current user has an active membership in the org
CREATE OR REPLACE FUNCTION public.is_org_member(check_org uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.org_memberships
    WHERE org_id = check_org
      AND user_id = auth.uid()
      AND status = 'active'
  );
$$;

COMMENT ON FUNCTION public.is_org_member(uuid) IS 'S3.2.B.2: True if current user has active membership in org. Invited/suspended/removed do not grant access.';

-- Helper: true if current user is active owner or admin of the org
CREATE OR REPLACE FUNCTION public.is_org_owner_or_admin(check_org uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.org_memberships
    WHERE org_id = check_org
      AND user_id = auth.uid()
      AND role IN ('owner', 'admin')
      AND status = 'active'
  );
$$;

COMMENT ON FUNCTION public.is_org_owner_or_admin(uuid) IS 'S3.2.B.2: True if current user is active owner or admin. Suspended/removed do not grant admin access.';
