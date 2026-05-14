-- ============================================================
-- 2026-05-14 · Super-admin model + trial_registrations RLS lockdown
-- ============================================================
-- Problem:
--   1) `trial_registrations` had NO row-level security, so any authenticated
--      user could SELECT every trial email + workspace_id (lead-list leak,
--      GDPR risk).
--   2) The Admin Console at /admin lists orgs + billing across tenants but
--      relied on `is_org_member()`, so the super-admin (david@freedolia.com)
--      only saw the orgs they were already a member of. Without an
--      `is_super_admin()` bypass, the console was effectively useless.
--
-- Fix:
--   • New `is_super_admin()` SECURITY DEFINER function — single source of
--     truth for "is this user the platform-wide super admin".
--   • Identity is matched against `auth.users.email` so the list cannot be
--     spoofed from the client and rotates if the email changes (rare).
--   • Lock down `trial_registrations` with RLS: anonymous/authenticated
--     INSERT allowed (lead form), SELECT/UPDATE only for super-admins.
--   • Add an OR-clause `is_super_admin()` to the SELECT policies of orgs,
--     org_memberships, and billing_* so the super-admin can read across
--     tenants while regular members keep their existing per-org access.
--   • Write/insert/update/delete policies on tenant tables are NOT relaxed
--     for the super-admin. Read-only cross-tenant access by design.
-- ============================================================

-- 1) is_super_admin() — single source of truth
--    Hard-coded list of platform super-admin emails. To add another super
--    admin, change the array literal here and ship a new migration.
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM auth.users u
    WHERE u.id = auth.uid()
      AND lower(u.email) = ANY (ARRAY['david@freedolia.com'])
  );
$$;

REVOKE ALL ON FUNCTION public.is_super_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated, anon;

COMMENT ON FUNCTION public.is_super_admin() IS
  'True when the current auth.uid() resolves to a platform-wide super admin email. Used by RLS policies to grant read-only cross-tenant access on a strict allowlist.';

-- 2) trial_registrations — enable RLS + scoped policies
ALTER TABLE public.trial_registrations ENABLE ROW LEVEL SECURITY;

-- Anonymous + authenticated INSERT (public lead form on /trial)
DROP POLICY IF EXISTS "trial_registrations_insert_public" ON public.trial_registrations;
CREATE POLICY "trial_registrations_insert_public"
ON public.trial_registrations
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- SELECT: only the super-admin OR the authenticated user whose email matches
-- the registration row (lets a user check their own pending trial).
DROP POLICY IF EXISTS "trial_registrations_select_owner_or_admin" ON public.trial_registrations;
CREATE POLICY "trial_registrations_select_owner_or_admin"
ON public.trial_registrations
FOR SELECT
TO authenticated
USING (
  public.is_super_admin()
  OR lower(email) = lower(coalesce(
    (SELECT u.email FROM auth.users u WHERE u.id = auth.uid()),
    ''
  ))
);

-- UPDATE: super-admin can amend (e.g., mark converted manually). The
-- workspace bootstrap code already updates via SECURITY DEFINER service code
-- paths; this UPDATE policy covers any future client-driven flow.
DROP POLICY IF EXISTS "trial_registrations_update_admin" ON public.trial_registrations;
CREATE POLICY "trial_registrations_update_admin"
ON public.trial_registrations
FOR UPDATE
TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

-- DELETE: super-admin only (right-to-be-forgotten cleanup etc.)
DROP POLICY IF EXISTS "trial_registrations_delete_admin" ON public.trial_registrations;
CREATE POLICY "trial_registrations_delete_admin"
ON public.trial_registrations
FOR DELETE
TO authenticated
USING (public.is_super_admin());

-- 3) Super-admin read-only bypass on tenant tables
--    Only SELECT is granted — never INSERT/UPDATE/DELETE — so the super
--    admin can audit cross-tenant data without mutating anything by mistake.

-- orgs
DROP POLICY IF EXISTS "Members can select org" ON public.orgs;
CREATE POLICY "Members can select org" ON public.orgs
  FOR SELECT TO authenticated
  USING (public.is_org_member(id) OR public.is_super_admin());

-- org_memberships
DROP POLICY IF EXISTS "Members can select org_memberships" ON public.org_memberships;
CREATE POLICY "Members can select org_memberships" ON public.org_memberships
  FOR SELECT TO authenticated
  USING (public.is_org_member(org_id) OR public.is_super_admin());

-- billing_org_entitlements
DROP POLICY IF EXISTS "billing_org_entitlements_select" ON public.billing_org_entitlements;
CREATE POLICY "billing_org_entitlements_select"
ON public.billing_org_entitlements
FOR SELECT
TO authenticated
USING (
  public.is_super_admin()
  OR org_id IN (
    SELECT org_id
    FROM public.org_memberships
    WHERE user_id = auth.uid() AND status = 'active'
  )
);

-- billing_subscriptions
DROP POLICY IF EXISTS "billing_subscriptions_select" ON public.billing_subscriptions;
CREATE POLICY "billing_subscriptions_select"
ON public.billing_subscriptions
FOR SELECT
TO authenticated
USING (
  public.is_super_admin()
  OR org_id IN (
    SELECT org_id
    FROM public.org_memberships
    WHERE user_id = auth.uid() AND status = 'active'
  )
);

-- billing_customers
DROP POLICY IF EXISTS "billing_customers_select" ON public.billing_customers;
CREATE POLICY "billing_customers_select"
ON public.billing_customers
FOR SELECT
TO authenticated
USING (
  public.is_super_admin()
  OR org_id IN (
    SELECT org_id
    FROM public.org_memberships
    WHERE user_id = auth.uid() AND status = 'active'
  )
);

-- billing_invoices
DROP POLICY IF EXISTS "billing_invoices_select" ON public.billing_invoices;
CREATE POLICY "billing_invoices_select"
ON public.billing_invoices
FOR SELECT
TO authenticated
USING (
  public.is_super_admin()
  OR org_id IN (
    SELECT org_id
    FROM public.org_memberships
    WHERE user_id = auth.uid() AND status = 'active'
  )
);

-- billing_plans is global reference data; left as-is.

COMMENT ON POLICY "Members can select org" ON public.orgs IS
  'Visible to active org members OR the platform super-admin (read-only cross-tenant access).';
