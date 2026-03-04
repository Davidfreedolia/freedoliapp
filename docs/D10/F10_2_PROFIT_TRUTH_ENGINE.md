# F10.2 Profit Truth Engine (Beta)

## Overview

The Profit Truth Engine adds a **product-level profit view** on top of the existing `financial_ledger` (book of record). It does not duplicate the ledger; it adds an **allocation layer** that links ledger lines to products, plus views for profit per product per day and data quality.

## Flow

1. **Ledger** — `financial_ledger` remains the single source of truth (org_id, occurred_at, amount_base_pnl, reference_type, reference_id).
2. **Allocation** — `ledger_product_allocations` links a ledger entry to a product (project_id), with optional marketplace/sku/asin and a weight for splits.
3. **Auto-allocation** — `rpc_profit_auto_allocate_by_identifier(p_org_id)` matches ledger rows that come from Amazon events (`reference_type = 'AMAZON_EVENT'`) to products via `amazon_financial_events.meta->>'asin'` and `product_identifiers.asin`.
4. **Normalisation** — `v_ledger_norm` exposes each ledger row with an economic type (revenue, refund, amazon_fee, ads, cogs, freight, duties, other) derived from ledger type and, when present, Amazon event_type.
5. **Product econ per day** — `v_product_econ_day` aggregates allocated ledger amounts by (org_id, product_id, d).
6. **Profit per day** — `v_product_profit_day` joins econ + COGS (when available) and computes net_revenue, units_sold, cogs, contribution_margin.
7. **Coverage** — `v_profit_allocation_coverage` reports per (org_id, d): ledger_entries_total, allocated_entries, unallocated_entries.

## Metric definitions

| Metric | Definition |
|--------|------------|
| **net_revenue** | gross_sales + refunds (signed) |
| **contribution_margin** | net_revenue − amazon_fees − ads − freight − duties − other_costs |
| **cogs** | units_sold × unit_cost_wac (when WAC and units_sold are available) |
| **signed_amount** | amount_base_pnl as stored: income positive, expense negative |

## Known limitations (Beta)

- **Unallocated fees** — Company-level ledger lines without an Amazon event (or without asin in meta) are not auto-allocated; they remain unallocated. Manual allocation or future rules can address this.
- **WAC / cost pool** — There is no `inventory_receipts` or shipment cost table yet. `v_product_cost_pool` is a placeholder (0 rows); `v_product_unit_cost_wac` and COGS in `v_product_profit_day` are therefore 0 until a cost pool is implemented.
- **Units sold** — `amazon_financial_events` has no quantity field. `v_product_units_sold_day` uses **event count** for order-like event_types as a proxy for “orders” per product per day; true units_sold would require quantity from Amazon or another source.
- **econ_type mapping** — Uses `financial_ledger.type` (income/expense) and `amazon_financial_events.event_type` (e.g. order, refund, fee). Event_type strings are matched with ILIKE; add new patterns in the migration if your settlement feed uses different labels.

## Tables and views

| Object | Type | Purpose |
|--------|------|---------|
| `ledger_product_allocations` | Table | Links ledger_entry_id → product_id (org_id, weight, method, confidence). |
| `v_ledger_norm` | View | Ledger rows with d, signed_amount, econ_type (revenue, refund, amazon_fee, …). |
| `v_product_cost_pool` | View | Placeholder: units_in, cost_in per product (0 rows until receipts model exists). |
| `v_product_unit_cost_wac` | View | unit_cost_wac = cost_in / units_in from cost pool. |
| `v_product_units_sold_day` | View | units_sold per (org_id, product_id, marketplace, d) from Amazon events + product_identifiers. |
| `v_product_cogs_day` | View | units_sold × unit_cost_wac per (org_id, product_id, marketplace, d). |
| `v_product_econ_day` | View | gross_sales, refunds, amazon_fees, ads, freight, duties, other_costs by (org_id, product_id, d). |
| `v_product_profit_day` | View | net_revenue, units_sold, cogs, contribution_margin by (org_id, product_id, d). |
| `v_profit_allocation_coverage` | View | ledger_entries_total, allocated_entries, unallocated_entries by (org_id, d). |

## RLS

- `ledger_product_allocations`: SELECT/INSERT/UPDATE/DELETE for `is_org_member(org_id)`.
- `product_identifiers`: unchanged (existing org-based policies).

## Migration

- `supabase/migrations/20260304120000_f10_2_profit_truth_engine.sql`

Run allocation for an org (e.g. from app or cron):

```sql
SELECT rpc_profit_auto_allocate_by_identifier('your-org-uuid');
```
