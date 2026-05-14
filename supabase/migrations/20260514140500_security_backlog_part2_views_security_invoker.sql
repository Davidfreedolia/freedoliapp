-- ============================================================
-- 2026-05-14 · Security backlog — part 2
-- ============================================================
-- Pre-existing security advisor ERROR: `security_definer_view` on 23
-- public views. A SECURITY DEFINER view runs with the privileges of the
-- view OWNER (postgres) and ignores the RLS of the calling user. This
-- effectively bypasses our tenant isolation: a regular user querying
-- such a view could see rows from any org.
--
-- Postgres 15+ supports per-view `security_invoker = true`, which makes
-- the view run with the caller's privileges and RLS context. Verified
-- before applying:
--   • Every base table referenced by these views (projects, project_tasks,
--     expenses, incomes, documents, financial_ledger, financial_events,
--     amazon_financial_events, ledger_product_allocations,
--     inventory_receipts, inventory_receipt_items, marketplaces,
--     project_marketplaces, project_events, project_profitability_basic,
--     product_identifiers, spapi_connections) has RLS enabled AND at least
--     one SELECT policy (per-org via is_org_member or per-user mapping).
--   • Intermediate views inherit that filtering once the chain is
--     security_invoker, so the result for a regular user is correctly
--     scoped to their org's rows. No data is hidden that they were
--     entitled to see; data that was previously LEAKED through these
--     views is now correctly filtered.
--
-- Switching is safe and reversible (`ALTER VIEW ... RESET (security_invoker)`).
-- ============================================================

ALTER VIEW public.v_product_cost_pool                    SET (security_invoker = true);
ALTER VIEW public.v_project_profit                       SET (security_invoker = true);
ALTER VIEW public.v_project_tasks_effective              SET (security_invoker = true);
ALTER VIEW public.v_product_profit_day                   SET (security_invoker = true);
ALTER VIEW public.v_project_business_metrics             SET (security_invoker = true);
ALTER VIEW public.v_project_tasks_summary                SET (security_invoker = true);
ALTER VIEW public.v_project_marketplace_tags             SET (security_invoker = true);
ALTER VIEW public.v_project_current_gate                 SET (security_invoker = true);
ALTER VIEW public.health_v_task_system_calculator_saved_missing_done
                                                         SET (security_invoker = true);
ALTER VIEW public.v_profit_allocation_coverage           SET (security_invoker = true);
ALTER VIEW public.v_project_phase_gate                   SET (security_invoker = true);
ALTER VIEW public.finance_views                          SET (security_invoker = true);
ALTER VIEW public.v_projects_list_state                  SET (security_invoker = true);
ALTER VIEW public.v_product_cogs_day                     SET (security_invoker = true);
ALTER VIEW public.v_project_state_integrity              SET (security_invoker = true);
ALTER VIEW public.v_product_units_sold_day               SET (security_invoker = true);
ALTER VIEW public.v_product_econ_day                     SET (security_invoker = true);
ALTER VIEW public.v_project_last_activity                SET (security_invoker = true);
ALTER VIEW public.v_documents_by_project                 SET (security_invoker = true);
ALTER VIEW public.v_product_unit_cost_wac                SET (security_invoker = true);
ALTER VIEW public.v_ledger_norm                          SET (security_invoker = true);
ALTER VIEW public.spapi_connections_safe                 SET (security_invoker = true);
ALTER VIEW public.project_tasks_effective                SET (security_invoker = true);
