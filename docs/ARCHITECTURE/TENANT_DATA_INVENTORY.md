# Tenant Data Inventory

## Purpose

Defines which database tables are tenant-scoped in the FREEDOLIAPP multi-tenant architecture (Multi-Tenant Hardening phase S1).

**Canonical rule:** All operational data belonging to a company must be isolated by `org_id`. Reference tables do NOT require `org_id`.

This document is **documentation only**. It does not modify code, migrations, or schema.

---

## Classification

### Tenant Data Tables

Tables that store company-specific operational data and **must** contain `org_id`. Verified against `supabase/migrations/` and application usage in `src/`.

| Table | org_id present | Notes |
|-------|----------------|-------|
| orgs | N/A (identity) | Tenant root entity. |
| org_memberships | Yes | Links users to orgs. |
| org_settings | Yes | Per-org base currency and settings. |
| org_activation | Yes | Activation / onboarding state per org. |
| org_billing | Yes | Billing state per org. |
| org_billing_overrides | Yes | Billing overrides (D11). |
| org_plan_assignments | Yes | Plan assignments (D11). |
| company_settings | Yes | Company profile per org (S1.2 backfill). |
| projects | Yes | Core tenant entity (S1.2). |
| project_events | Yes | Timeline events; org from project (S1.8). |
| project_phases | Yes | Phase definitions per org. |
| project_viability | Yes | Viability data (restore + S1.5). |
| project_tasks | Yes | Tasks (S1.2, S1.13). |
| project_marketplaces | Yes | Marketplace links (S1.2). |
| project_profitability_basic | Yes | Profitability cache (S1.2 if exists). |
| suppliers | Yes | S1.2. |
| supplier_quotes | Yes | S1.2. |
| supplier_sample_requests | Yes | S1.2, backfill from project/supplier. |
| supplier_quote_price_breaks | Yes | Restore schema + org_id. |
| supplier_price_estimates | Yes | S1.2, S1.18. |
| purchase_orders | Yes | S1.2. |
| po_shipments | Yes | S1.17. |
| po_amazon_readiness | Yes | S1.17. |
| orders | Yes | Restore schema. |
| order_items | Yes | Restore schema. |
| sales | Yes | Restore schema. |
| documents | Yes | S1.2, S1.15b. |
| payments | Yes | S1.2, S1.16. |
| briefings | Yes | S1.2. |
| expenses | Yes | S1.2, S1.11. |
| expense_attachments | Yes | S1.2, S1.15b. |
| incomes | Yes | S1.2, S1.11. |
| recurring_expenses | Yes | S1.2, S1.14. |
| recurring_expense_occurrences | Yes | S1.14. |
| finance_categories | Yes | S1.2 backfill. |
| financial_ledger | Yes | F5. |
| accounting_periods | Yes | F5. |
| ledger_product_allocations | Yes | F10.2. |
| inventory | Yes | S1.2 (warehouse/user backfill). |
| inventory_movements | Yes | Restore + RLS. |
| inventory_snapshots | Yes | D31.4. |
| inventory_receipts | Yes | F10.2.1. |
| inventory_receipt_items | Yes | F10.2.1. |
| warehouses | Yes | S1.2, S1.15a. |
| product_identifiers | Yes | S1.2, S1.4. |
| product_variants | Yes | S1.2, S1.4. |
| variant_marketplace_asins | Yes | S1.3. |
| gtin_pool | Yes | S1.2, S1.20. |
| gtin_assignments | Yes | S1.2 if exists. |
| tasks | Yes | S1.2, S1.13. |
| sticky_notes | Yes | S1.2, S1.13. |
| signatures | Yes | S1.2 if exists. |
| decision_log | Yes | S1.2. |
| decisions | Yes | D32.4. |
| alerts | Yes | Alert system base. |
| lifecycle_events | Yes | V1 lifecycle. |
| logistics_flow | Yes | S1.2, S1.19. |
| shipments | Yes | F4.1. |
| shipment_legs | Yes | F4.1 (org_id). |
| packages | Yes | F4.1 (org_id). |
| tracking_events | Yes | F4.1 (org_id). |
| tracking_org_state | Yes | Per-org tracking state. |
| dashboard_preferences | Yes | S1.2. |
| automation_rules | Yes | D57.1. |
| automation_proposals | Yes | D57.1. |
| automation_approvals | Yes | D57.1. |
| automation_executions | Yes | D57.1. |
| automation_events | Yes | D57.1. |
| amazon_import_jobs | Yes | F7. |
| amazon_raw_rows | Yes | F7 (org_id). |
| amazon_financial_events | Yes | F7. |
| spapi_connections | Yes | F7. |
| spapi_reports | Yes | F7. |
| spapi_report_runs | Yes | F7. |
| quarterly_export_jobs | Yes | F5. |
| stripe_webhook_events | Yes | Optional org_id (F2 CBA). |
| ops_health_runs | Yes | Nullable org_id (org + global). |
| health_runs | Yes | S1.7 if exists. |
| supply_origins | Yes | D29.3. |
| supply_destinations | Yes | D29.3. |
| supply_routes | Yes | D29.3. |
| supplier_origin_links | Yes | D29.3. |
| ops_events | Yes | F6 (nullable org_id). |
| billing_org_entitlements | Yes | D11 / app. |

### Tenant Linked Tables

Tables that do not store `org_id` directly but are scoped by FK to a tenant entity. RLS typically enforced via parent (e.g. `decisions` or `shipments`).

| Table | Parent entity | Notes |
|-------|---------------|-------|
| decision_context | decisions | FK decision_id; RLS via parent org. |
| decision_sources | decisions | FK decision_id; RLS via parent org. |
| decision_events | decisions | FK decision_id; RLS via parent org. |

*(Other child tables such as shipment_legs, packages, tracking_events, and inventory_receipt_items carry `org_id` in this codebase and are classified as Tenant Data above.)*

### Global Tables

Tables that are global or shared across tenants. No `org_id` required.

| Table | Purpose |
|-------|---------|
| alert_definitions | Catalog of alert types (code, category, severity). Shared reference. |
| exchange_rates_daily | Daily FX rates; shared by all orgs. |
| ops_health_checks | Catalog of health check types (id, name). System reference. |

---

## Migration Candidates

Tables that **do not contain `org_id`** in the current schema but likely should for strict multi-tenant isolation. Consider adding `org_id` + backfill + RLS in a future S1 migration.

| Table | Current scoping | Recommendation |
|-------|-----------------|----------------|
| trial_registrations | workspace_id (optional), no org_id | Add `org_id` when workspace is converted to org; backfill from org_memberships or leave NULL for pre-conversion rows. |
| custom_cities | user_id only (bootstrap_dev) | If used as org-level data, add `org_id` and backfill from user → org_memberships; otherwise treat as legacy user-scoped. |

---

## Summary

- **Tenant Data tables:** 70+ tables with `org_id` (present in migrations and/or app).
- **Tenant Linked:** 3 tables (decision_context, decision_sources, decision_events) — access via parent `decisions.org_id`.
- **Global:** 3 tables (alert_definitions, exchange_rates_daily, ops_health_checks).
- **Migration candidates:** 2 tables (trial_registrations, custom_cities) — consider `org_id` for full S1 alignment.

No code, migrations, or schema changes are made by this document.
