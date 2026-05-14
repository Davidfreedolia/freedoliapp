-- ============================================================
-- 2026-05-14 · Wave 2b — Dedupe redundant permissive RLS policies
-- ============================================================
-- The Supabase performance advisor flagged 305 (role, action) pairs with
-- multiple permissive policies. Postgres evaluates EVERY permissive
-- policy and ORs the result, so duplicates double the planner work and
-- raise the cost of every SELECT/UPDATE.
--
-- Cases addressed here:
--
-- 1) `service_role_all` paired with the tenant policy on the same table.
--    Supabase's `service_role` user has BYPASSRLS, so explicit policies
--    for it are pure noise. Dropping the explicit policy keeps service-
--    role access intact (still bypasses) and shrinks the planner cost.
--
-- 2) Legacy "Users can ..." policies that were superseded by p_-prefixed
--    ones on `briefings` and `signatures`. Identical USING/WITH CHECK
--    (auth.uid() = user_id) — safe to drop the older copies.
--
-- 3) Org-scoped policies on `custom_cities` that conflict with our
--    globally-shared catalog model (rows have org_id = NULL). The
--    permissive `custom_cities_*_auth` policies introduced in part 4 of
--    the security backlog already cover SELECT/INSERT for any
--    authenticated user; the `Org members can ...` set is unreachable
--    against NULL org_ids.
--
-- Cases deliberately NOT touched:
--   • audit_log INSERT — two policies with different scopes
--     (org_id-required vs user-only). Both serve a real path.
--   • alerts SELECT — `alerts_select_model_c` enforces stricter visibility
--     (owner_only / admin_owner scopes) while `alerts_select_org_member`
--     is the default org-member fallback. Needs separate semantic review
--     before merging.
-- ============================================================

-- 1) Drop redundant service_role_all policies. service_role has BYPASSRLS.
DROP POLICY IF EXISTS "service_role_all" ON public.alert_events;
DROP POLICY IF EXISTS "service_role_all" ON public.alert_rules;
DROP POLICY IF EXISTS "service_role_all" ON public.briefs;
DROP POLICY IF EXISTS "service_role_all" ON public.events;
DROP POLICY IF EXISTS "service_role_all" ON public.listings;
DROP POLICY IF EXISTS "service_role_all" ON public.stock;

-- 2) Drop legacy "Users can ..." duplicates that p_-prefixed policies cover.
DROP POLICY IF EXISTS "Users can view own briefings"    ON public.briefings;
DROP POLICY IF EXISTS "Users can update own briefings"  ON public.briefings;
DROP POLICY IF EXISTS "Users can delete own briefings"  ON public.briefings;

DROP POLICY IF EXISTS "Users can view own signatures"   ON public.signatures;
DROP POLICY IF EXISTS "Users can update own signatures" ON public.signatures;
DROP POLICY IF EXISTS "Users can delete own signatures" ON public.signatures;

-- 3) Drop org-scoped custom_cities policies; the global-catalog policies
--    (custom_cities_*_auth + custom_cities_*_admin) supersede them.
DROP POLICY IF EXISTS "Org members can select custom_cities" ON public.custom_cities;
DROP POLICY IF EXISTS "Org members can insert custom_cities" ON public.custom_cities;
DROP POLICY IF EXISTS "Org members can update custom_cities" ON public.custom_cities;
DROP POLICY IF EXISTS "Org members can delete custom_cities" ON public.custom_cities;

-- Also drop the "Users can manage own" ALL-policies on tables where we
-- already have explicit SELECT/UPDATE/DELETE/INSERT split (dashboard
-- preferences, decision_log, project_profitability_basic). The ALL one is
-- evaluated alongside each split policy on every action — pure overhead.
DROP POLICY IF EXISTS "Users can manage own dashboard preferences" ON public.dashboard_preferences;
DROP POLICY IF EXISTS "Users can manage own decision log"           ON public.decision_log;
DROP POLICY IF EXISTS "Users can manage own profitability"          ON public.project_profitability_basic;
