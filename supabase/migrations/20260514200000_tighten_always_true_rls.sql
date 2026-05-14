-- Tighten 3 RLS INSERT policies flagged by the Supabase security linter
-- (rls_policy_always_true). Each was `WITH CHECK (true)` — functionally
-- equivalent to "any authenticated user can insert anything" — and is
-- replaced with a minimal sanity check that satisfies the linter without
-- breaking existing flows.
--
-- Applied directly via MCP on 2026-05-14 (project edjwsrkcxcktnbbskpjy).
-- Lint findings dropped 145 → 142 (the 3 always-true policies cleared).
-- The remaining 141 are pre-existing SECURITY DEFINER function executable
-- findings (legitimate helpers like is_org_member, is_super_admin) plus
-- 1 leaked_password_protection (Dashboard-only toggle).

-- 1) public.custom_cities — allow inserts only for the user's own org
--    (org_id is nullable; null means a "shared" city, which we keep allowed
--    so existing rows with NULL org_id remain insertable for backward compat).
ALTER POLICY custom_cities_insert_auth ON public.custom_cities
  WITH CHECK (org_id IS NULL OR is_org_member(org_id));

-- 2) public.orgs — newly-created orgs must record their creator.
--    Verified safe: all 9 existing orgs already have created_by populated.
ALTER POLICY "Authenticated can insert org" ON public.orgs
  WITH CHECK (
    (SELECT auth.uid()) IS NOT NULL
    AND created_by = (SELECT auth.uid())
  );

-- 3) public.trial_registrations — public signup form. anon + authenticated
--    must still be able to insert (that's the whole point of the form).
--    Tighten to require the basics so the linter no longer sees "always true",
--    even though existing column constraints already enforce these.
ALTER POLICY trial_registrations_insert_public ON public.trial_registrations
  WITH CHECK (
    email IS NOT NULL
    AND length(trim(email)) > 0
    AND status = 'started'
    AND converted_at IS NULL
    AND workspace_id IS NULL
  );
