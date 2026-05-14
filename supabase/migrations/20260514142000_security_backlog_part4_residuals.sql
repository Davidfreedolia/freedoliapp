-- ============================================================
-- 2026-05-14 · Security backlog — part 4 (residuals)
-- ============================================================
-- Cleans up the last security advisor findings under our control:
--
--  1) Three helper functions in the `app` schema (mirror the public.*
--     search_path fix from part 3 — different schema, same issue).
--
--  2) `public.custom_cities` had a single `FOR ALL` policy with
--     USING(true) WITH CHECK(true). The table is a globally-shared
--     catalog of cities users can add when the country dropdown is
--     missing one (org_id is always NULL — 2 rows in production, both
--     NULL). The all-true policy let any authenticated user DELETE
--     entries another user contributed. Split into:
--       • SELECT + INSERT to authenticated (unchanged behaviour for
--         the app — see Suppliers.jsx / Forwarders.jsx which write
--         without org_id).
--       • UPDATE + DELETE restricted to the super-admin (catalog
--         curation).
--
-- Leftover advisor noise NOT addressed here (won't block beta):
--  • ~141 `*_security_definer_function_executable` warnings — these
--    are triggers + RPCs in the `public` schema which PostgREST
--    auto-exposes. Each needs a case-by-case decision (revoke EXECUTE
--    from anon, or convert to SECURITY INVOKER) and would be a much
--    larger surgical task.
--  • `auth_leaked_password_protection` — Supabase dashboard setting
--    (Authentication → Policies → Enable leaked-password protection).
--    Cannot be flipped from a migration.
--  • Permissive INSERT on `orgs` + `trial_registrations` — intentional
--    so anonymous/authenticated users can sign up.
-- ============================================================

-- 1) app.* functions: pin search_path
ALTER FUNCTION app.is_migration_context() SET search_path = public, pg_catalog;
ALTER FUNCTION app.set_user_id_from_auth() SET search_path = public, pg_catalog;
ALTER FUNCTION app.backfill_user_id(target_user uuid) SET search_path = public, pg_catalog;

-- 2) custom_cities: replace all-true catch-all with split policies
DROP POLICY IF EXISTS "custom_cities_policy" ON public.custom_cities;

DROP POLICY IF EXISTS "custom_cities_select_auth" ON public.custom_cities;
CREATE POLICY "custom_cities_select_auth"
ON public.custom_cities
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "custom_cities_insert_auth" ON public.custom_cities;
CREATE POLICY "custom_cities_insert_auth"
ON public.custom_cities
FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "custom_cities_update_admin" ON public.custom_cities;
CREATE POLICY "custom_cities_update_admin"
ON public.custom_cities
FOR UPDATE
TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "custom_cities_delete_admin" ON public.custom_cities;
CREATE POLICY "custom_cities_delete_admin"
ON public.custom_cities
FOR DELETE
TO authenticated
USING (public.is_super_admin());
