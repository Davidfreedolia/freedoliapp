-- ============================================
-- MULTI-TENANT PAS 1: orgs + org_memberships + helper
-- ============================================
-- Foundation: workspace (org) and membership. No RLS on orgs yet (after backfill).

CREATE TABLE IF NOT EXISTS public.orgs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.org_memberships (
  org_id uuid NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner', 'admin', 'member')),
  created_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (org_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_org_memberships_user_id ON public.org_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_org_memberships_org_id ON public.org_memberships(org_id);

-- Helper: true if current user is member of the org
CREATE OR REPLACE FUNCTION public.is_org_member(check_org uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.org_memberships
    WHERE org_id = check_org AND user_id = auth.uid()
  );
$$;

-- Helper: true if current user is owner or admin (for managing members)
CREATE OR REPLACE FUNCTION public.is_org_owner_or_admin(check_org uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.org_memberships
    WHERE org_id = check_org AND user_id = auth.uid() AND role IN ('owner', 'admin')
  );
$$;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.orgs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.org_memberships TO authenticated;
