-- ============================================================
-- 2026-05-14 · Harden is_super_admin() — revoke anon EXECUTE
-- ============================================================
-- Follow-up to 20260514120000_super_admin_and_trial_rls.sql.
--
-- The initial migration granted EXECUTE on `is_super_admin()` to both
-- `anon` and `authenticated`. The `anon` grant is unnecessary because:
--   1) `anon` has no `auth.uid()`, so the function would always return
--      false for that role.
--   2) Every RLS policy that calls `is_super_admin()` is scoped
--      `TO authenticated`.
-- Revoking the anon grant removes the public RPC surface (no more
-- /rest/v1/rpc/is_super_admin reachable with the anon key) and silences
-- the Supabase security advisor warning
-- `anon_security_definer_function_executable`.
--
-- Also drops the duplicate INSERT policy on `trial_registrations`. A
-- pre-existing policy `anon_insert_only` and our new
-- `trial_registrations_insert_public` both allow the same public lead-form
-- INSERT. Permissive RLS policies are OR'd together, so the duplicate is
-- functionally harmless but noisy in `pg_policies` and confusing in audits.
-- ============================================================

REVOKE EXECUTE ON FUNCTION public.is_super_admin() FROM anon;

DROP POLICY IF EXISTS "anon_insert_only" ON public.trial_registrations;
