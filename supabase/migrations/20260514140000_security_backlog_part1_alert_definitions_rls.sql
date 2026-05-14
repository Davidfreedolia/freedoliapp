-- ============================================================
-- 2026-05-14 · Security backlog — part 1
-- ============================================================
-- Pre-existing security advisor ERROR: rls_disabled_in_public on
-- `public.alert_definitions`. The table is a global catalog of alert
-- codes (code, category, default_severity, default_visibility_scope,
-- is_active) — no org_id, no PII. It is read-only reference data and
-- should be SELECTable by every authenticated user.
--
-- Fix: enable RLS, allow SELECT to authenticated, restrict mutations to
-- the platform super-admin.
-- ============================================================

ALTER TABLE public.alert_definitions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "alert_definitions_select_all_auth" ON public.alert_definitions;
CREATE POLICY "alert_definitions_select_all_auth"
ON public.alert_definitions
FOR SELECT
TO authenticated
USING (true);

-- Mutations: only the platform super-admin (rare — schema-managed catalog).
DROP POLICY IF EXISTS "alert_definitions_modify_admin" ON public.alert_definitions;
CREATE POLICY "alert_definitions_modify_admin"
ON public.alert_definitions
FOR ALL
TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());
