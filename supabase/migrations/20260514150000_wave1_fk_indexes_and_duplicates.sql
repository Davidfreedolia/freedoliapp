-- ============================================================
-- 2026-05-14 · Wave 1 — production-readiness · FK indexes + duplicates
-- ============================================================
-- Pre-existing Supabase performance advisor flagged 70 foreign keys
-- without a covering index and 2 strictly-duplicate indexes. At scale
-- (500+ tenants) an UPDATE or DELETE on a parent table without a child
-- FK index forces a full sequential scan of the child for every action.
-- This wave fixes both. ALL operations are additive (CREATE INDEX) or
-- strictly redundant (the duplicates) — no schema change, no data
-- mutation. Safe to run with an active session.
--
-- Notes:
--   • CREATE INDEX (non-concurrent) is used because the DB is only ~24 MB.
--     The lock window is sub-millisecond per table.
--   • IF NOT EXISTS is set on every statement — safe to re-apply.
--   • The two duplicates are constraint-backed: drop the redundant
--     UNIQUE constraint on project_viability and the duplicate index on
--     project_profitability_basic. The PRIMARY KEY / surviving index
--     continues to enforce uniqueness.
-- ============================================================

-- ──────────────────────────────────────────────────────────────
-- A. Covering indexes for foreign keys (70 statements)
-- ──────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_accounting_periods_locked_by                ON accounting_periods (locked_by);
CREATE INDEX IF NOT EXISTS idx_alert_events_alert_rule_id                  ON alert_events (alert_rule_id);
CREATE INDEX IF NOT EXISTS idx_alerts_alert_definition_id                  ON alerts (alert_definition_id);
CREATE INDEX IF NOT EXISTS idx_amazon_financial_events_job_id              ON amazon_financial_events (job_id);
CREATE INDEX IF NOT EXISTS idx_amazon_financial_events_ledger_entry_id     ON amazon_financial_events (ledger_entry_id);
CREATE INDEX IF NOT EXISTS idx_amazon_import_jobs_created_by               ON amazon_import_jobs (created_by);
CREATE INDEX IF NOT EXISTS idx_amazon_raw_rows_job_id                      ON amazon_raw_rows (job_id);
CREATE INDEX IF NOT EXISTS idx_automation_approvals_acted_by               ON automation_approvals (acted_by);
CREATE INDEX IF NOT EXISTS idx_automation_events_actor_id                  ON automation_events (actor_id);
CREATE INDEX IF NOT EXISTS idx_automation_executions_executed_by           ON automation_executions (executed_by);
CREATE INDEX IF NOT EXISTS idx_automation_proposals_approved_by            ON automation_proposals (approved_by);
CREATE INDEX IF NOT EXISTS idx_automation_proposals_rejected_by            ON automation_proposals (rejected_by);
CREATE INDEX IF NOT EXISTS idx_automation_rules_created_by                 ON automation_rules (created_by);
CREATE INDEX IF NOT EXISTS idx_automation_rules_updated_by                 ON automation_rules (updated_by);
CREATE INDEX IF NOT EXISTS idx_billing_invoices_org_id                     ON billing_invoices (org_id);
CREATE INDEX IF NOT EXISTS idx_billing_invoices_subscription_id            ON billing_invoices (subscription_id);
CREATE INDEX IF NOT EXISTS idx_billing_org_entitlements_plan_id            ON billing_org_entitlements (plan_id);
CREATE INDEX IF NOT EXISTS idx_billing_org_entitlements_subscription_id    ON billing_org_entitlements (subscription_id);
CREATE INDEX IF NOT EXISTS idx_billing_org_overrides_plan_id               ON billing_org_overrides (plan_id);
CREATE INDEX IF NOT EXISTS idx_billing_subscriptions_billing_customer_id   ON billing_subscriptions (billing_customer_id);
CREATE INDEX IF NOT EXISTS idx_billing_subscriptions_plan_id               ON billing_subscriptions (plan_id);
CREATE INDEX IF NOT EXISTS idx_briefs_project_id                           ON briefs (project_id);
CREATE INDEX IF NOT EXISTS idx_docs_entries_section_id                     ON docs_entries (section_id);
CREATE INDEX IF NOT EXISTS idx_documents_order_id                          ON documents (order_id);
CREATE INDEX IF NOT EXISTS idx_events_order_id                             ON events (order_id);
CREATE INDEX IF NOT EXISTS idx_events_project_id                           ON events (project_id);
CREATE INDEX IF NOT EXISTS idx_expenses_category_id                        ON expenses (category_id);
CREATE INDEX IF NOT EXISTS idx_expenses_supplier_id                        ON expenses (supplier_id);
CREATE INDEX IF NOT EXISTS idx_financial_ledger_created_by                 ON financial_ledger (created_by);
CREATE INDEX IF NOT EXISTS idx_financial_ledger_locked_by                  ON financial_ledger (locked_by);
CREATE INDEX IF NOT EXISTS idx_financial_ledger_posted_by                  ON financial_ledger (posted_by);
CREATE INDEX IF NOT EXISTS idx_health_run_results_check_id                 ON health_run_results (check_id);
CREATE INDEX IF NOT EXISTS idx_incomes_category_id                         ON incomes (category_id);
CREATE INDEX IF NOT EXISTS idx_inventory_receipt_items_product_id          ON inventory_receipt_items (product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_receipt_items_receipt_id          ON inventory_receipt_items (receipt_id);
CREATE INDEX IF NOT EXISTS idx_inventory_receipts_project_id               ON inventory_receipts (project_id);
CREATE INDEX IF NOT EXISTS idx_ledger_product_allocations_ledger_entry_id  ON ledger_product_allocations (ledger_entry_id);
CREATE INDEX IF NOT EXISTS idx_ledger_product_allocations_product_id       ON ledger_product_allocations (product_id);
CREATE INDEX IF NOT EXISTS idx_listings_project_id                         ON listings (project_id);
CREATE INDEX IF NOT EXISTS idx_membership_governance_audit_actor_user_id   ON membership_governance_audit (actor_user_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id                        ON order_items (order_id);
CREATE INDEX IF NOT EXISTS idx_orders_project_id                           ON orders (project_id);
CREATE INDEX IF NOT EXISTS idx_orders_supplier_id                          ON orders (supplier_id);
CREATE INDEX IF NOT EXISTS idx_org_invitations_invited_by                  ON org_invitations (invited_by);
CREATE INDEX IF NOT EXISTS idx_org_memberships_invited_by                  ON org_memberships (invited_by);
CREATE INDEX IF NOT EXISTS idx_orgs_created_by                             ON orgs (created_by);
CREATE INDEX IF NOT EXISTS idx_payments_order_id                           ON payments (order_id);
CREATE INDEX IF NOT EXISTS idx_payments_project_id                         ON payments (project_id);
CREATE INDEX IF NOT EXISTS idx_po_amazon_readiness_project_id              ON po_amazon_readiness (project_id);
CREATE INDEX IF NOT EXISTS idx_po_amazon_readiness_purchase_order_id       ON po_amazon_readiness (purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_project_marketplaces_marketplace_id         ON project_marketplaces (marketplace_id);
CREATE INDEX IF NOT EXISTS idx_project_phases_project_id                   ON project_phases (project_id);
CREATE INDEX IF NOT EXISTS idx_projects_supplier_id                        ON projects (supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_project_id                  ON purchase_orders (project_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier_id                 ON purchase_orders (supplier_id);
CREATE INDEX IF NOT EXISTS idx_quarterly_export_jobs_created_by            ON quarterly_export_jobs (created_by);
CREATE INDEX IF NOT EXISTS idx_recurring_expenses_project_id               ON recurring_expenses (project_id);
CREATE INDEX IF NOT EXISTS idx_recurring_expenses_supplier_id              ON recurring_expenses (supplier_id);
CREATE INDEX IF NOT EXISTS idx_research_reports_created_by                 ON research_reports (created_by);
CREATE INDEX IF NOT EXISTS idx_sales_listing_id                            ON sales (listing_id);
CREATE INDEX IF NOT EXISTS idx_sales_project_id                            ON sales (project_id);
CREATE INDEX IF NOT EXISTS idx_spapi_connections_created_by                ON spapi_connections (created_by);
CREATE INDEX IF NOT EXISTS idx_stock_project_id                            ON stock (project_id);
CREATE INDEX IF NOT EXISTS idx_supplier_origin_links_origin_id             ON supplier_origin_links (origin_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project_id                            ON tasks (project_id);
CREATE INDEX IF NOT EXISTS idx_warehouses_forwarder_id                     ON warehouses (forwarder_id);
CREATE INDEX IF NOT EXISTS idx_warehouses_supplier_id                      ON warehouses (supplier_id);

-- ──────────────────────────────────────────────────────────────
-- B. Drop strictly-duplicate indexes/constraints
-- ──────────────────────────────────────────────────────────────
-- project_profitability_basic: two btree indexes on (user_id), neither PK.
-- Keep the one with the canonical naming; drop the other.
DROP INDEX IF EXISTS public.profitability_user_id_idx;

-- project_viability: PRIMARY KEY on (project_id) already enforces uniqueness;
-- the additional UNIQUE constraint is redundant. Dropping the constraint
-- automatically drops its backing index.
ALTER TABLE public.project_viability DROP CONSTRAINT IF EXISTS project_viability_project_id_uk;
