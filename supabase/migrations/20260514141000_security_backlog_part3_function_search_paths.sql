-- ============================================================
-- 2026-05-14 · Security backlog — part 3
-- ============================================================
-- Pre-existing security advisor WARN: `function_search_path_mutable` on
-- 52 public functions. Without an explicit `SET search_path`, a function
-- inherits the caller's session search_path. A malicious user who can
-- create objects in another schema could shadow built-in names and have
-- the function call their version instead. Setting an explicit search_path
-- pins resolution to the trusted schemas and silences the warning.
--
-- Chosen path: `public, pg_catalog`. This matches every existing
-- helper function in the codebase and is the Supabase-recommended value.
--
-- Generated via:
--   SELECT 'ALTER FUNCTION public.' || proname || '(' || pg_get_function_identity_arguments(oid) || ') SET search_path = public, pg_catalog;'
--   FROM pg_proc p WHERE proconfig IS NULL OR NOT EXISTS (...)
-- so all 52 statements come straight from pg_catalog — no hand-typed
-- signatures (which is where this kind of migration usually breaks).
-- ============================================================

ALTER FUNCTION public._col_exists(p_table regclass, p_col text) SET search_path = public, pg_catalog;
ALTER FUNCTION public._health_task_table_variant() SET search_path = public, pg_catalog;
ALTER FUNCTION public._json_not_empty(p anyelement) SET search_path = public, pg_catalog;
ALTER FUNCTION public._tool_connections_touch_updated_at() SET search_path = public, pg_catalog;
ALTER FUNCTION public.alerts_safe_update_guard() SET search_path = public, pg_catalog;
ALTER FUNCTION public.auto_create_confirm_delivery_task() SET search_path = public, pg_catalog;
ALTER FUNCTION public.auto_create_send_pack_task() SET search_path = public, pg_catalog;
ALTER FUNCTION public.check_gtin_exempt_constraint() SET search_path = public, pg_catalog;
ALTER FUNCTION public.enforce_single_sample_winner() SET search_path = public, pg_catalog;
ALTER FUNCTION public.eval_system_rule(p_project_id uuid, p_rule text) SET search_path = public, pg_catalog;
ALTER FUNCTION public.financial_ledger_period_lock_guard() SET search_path = public, pg_catalog;
ALTER FUNCTION public.forbid_gtin_archived_status() SET search_path = public, pg_catalog;
ALTER FUNCTION public.generate_project_code() SET search_path = public, pg_catalog;
ALTER FUNCTION public.generate_recurring_expense_occurrence(p_recurring_expense_id uuid, p_month_date date) SET search_path = public, pg_catalog;
ALTER FUNCTION public.generate_recurring_expenses() SET search_path = public, pg_catalog;
ALTER FUNCTION public.import_gtins(p_codes text[], p_gtin_type text, p_notes text, p_is_demo boolean) SET search_path = public, pg_catalog;
ALTER FUNCTION public.import_gtins(p_codes text[], p_gtin_type text, p_notes text, p_org_id uuid) SET search_path = public, pg_catalog;
ALTER FUNCTION public.prevent_delete_assigned_gtin() SET search_path = public, pg_catalog;
ALTER FUNCTION public.purchase_orders_after_update_audit() SET search_path = public, pg_catalog;
ALTER FUNCTION public.purchase_orders_before_status_update() SET search_path = public, pg_catalog;
ALTER FUNCTION public.refresh_project_system_tasks(p_project_id uuid) SET search_path = public, pg_catalog;
ALTER FUNCTION public.require_auth_uid() SET search_path = public, pg_catalog;
ALTER FUNCTION public.run_project_alerts() SET search_path = public, pg_catalog;
ALTER FUNCTION public.seed_project_tasks(p_project_id uuid) SET search_path = public, pg_catalog;
ALTER FUNCTION public.set_accounting_periods_updated_at() SET search_path = public, pg_catalog;
ALTER FUNCTION public.set_amazon_import_jobs_updated_at() SET search_path = public, pg_catalog;
ALTER FUNCTION public.set_ops_health_checks_updated_at() SET search_path = public, pg_catalog;
ALTER FUNCTION public.set_org_settings_updated_at() SET search_path = public, pg_catalog;
ALTER FUNCTION public.set_quarterly_export_jobs_updated_at() SET search_path = public, pg_catalog;
ALTER FUNCTION public.set_spapi_connections_updated_at() SET search_path = public, pg_catalog;
ALTER FUNCTION public.set_spapi_reports_updated_at() SET search_path = public, pg_catalog;
ALTER FUNCTION public.set_updated_at() SET search_path = public, pg_catalog;
ALTER FUNCTION public.set_user_id_from_auth() SET search_path = public, pg_catalog;
ALTER FUNCTION public.start_trial_on_org_activation() SET search_path = public, pg_catalog;
ALTER FUNCTION public.sync_system_tasks(p_project_id uuid) SET search_path = public, pg_catalog;
ALTER FUNCTION public.task_override_clear(p_task_id uuid, p_reason text) SET search_path = public, pg_catalog;
ALTER FUNCTION public.task_override_done(p_task_id uuid, p_reason text) SET search_path = public, pg_catalog;
ALTER FUNCTION public.tg_set_updated_at() SET search_path = public, pg_catalog;
ALTER FUNCTION public.tg_sync_system_tasks_from_project_id() SET search_path = public, pg_catalog;
ALTER FUNCTION public.trg_project_viability_sync_tasks() SET search_path = public, pg_catalog;
ALTER FUNCTION public.update_dashboard_preferences_updated_at() SET search_path = public, pg_catalog;
ALTER FUNCTION public.update_gtin_pool_updated_at() SET search_path = public, pg_catalog;
ALTER FUNCTION public.update_logistics_updated_at() SET search_path = public, pg_catalog;
ALTER FUNCTION public.update_po_amazon_readiness_updated_at() SET search_path = public, pg_catalog;
ALTER FUNCTION public.update_po_shipments_updated_at() SET search_path = public, pg_catalog;
ALTER FUNCTION public.update_product_identifiers_updated_at() SET search_path = public, pg_catalog;
ALTER FUNCTION public.update_project_profitability_updated_at() SET search_path = public, pg_catalog;
ALTER FUNCTION public.update_recurring_expense_occurrences_updated_at() SET search_path = public, pg_catalog;
ALTER FUNCTION public.update_recurring_expenses_updated_at() SET search_path = public, pg_catalog;
ALTER FUNCTION public.update_sticky_notes_updated_at() SET search_path = public, pg_catalog;
ALTER FUNCTION public.update_supplier_price_estimates_updated_at() SET search_path = public, pg_catalog;
ALTER FUNCTION public.update_supplier_quotes_updated_at() SET search_path = public, pg_catalog;
ALTER FUNCTION public.update_tasks_updated_at() SET search_path = public, pg_catalog;
