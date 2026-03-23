# FASE 5.2 — CANONICAL P&L CONTRACT

## A. Purpose / scope

This document fixes the **canonical P&L contract** of FREEDOLIAPP **as implemented today**, grounded strictly in the current repo:

- Defines **what counts as canonical P&L data**.
- Enumerates the **canonical tables, views and helpers** that participate in P&L.
- Describes the **minimum P&L line mapping** that the existing model can support.
- Clarifies the **relationship between ledger, profit engine, FX and inventory cost**.
- Explicitly lists **legacy / non-canonical sources** that must not be treated as P&L truth.

Out of scope for this document:

- Designing a full double-entry chart-of-accounts or external accounting integration.
- Implementing new UI, RPCs, or DB changes.
- Redesigning Finances legacy UI (`Finances.jsx`) or dashboards.
- Defining the canonical **cashflow** contract (this is reserved for a later F5.x subphase).

This is a **descriptive contract** of the current system, **not** a speculative future design.

---

## B. Canonical P&L definition

**Canonical P&L** in FREEDOLIAPP is defined as:

- An **aggregation of `financial_ledger` entries** for a given organisation (`org_id`) and period.
- All amounts are interpreted in the **org’s base currency**, not in original transaction currencies.

Canonical monetary fields and FX:

- **Original capture** (for audit and reconciliation):
  - `financial_ledger.amount_original`
  - `financial_ledger.currency_original`
- **Canonical P&L value**:
  - `financial_ledger.amount_base_pnl` (numeric(18,2))
  - derived from `amount_original` and `currency_original` using **FX**.
- **Base currency per org**:
  - `org_settings.base_currency` (default `'EUR'`, 3-letter uppercase ISO; enforced by constraint).
- **FX source-of-truth**:
  - `exchange_rates_daily` (`rate_to_base` per `(rate_date, base_currency, currency)`), with:
    - ISO checks on `base_currency` and `currency`.
    - uniqueness per `(rate_date, base_currency, currency)`.

Implications:

- P&L **must be read in base currency** via `amount_base_pnl`; `amount_original`/`currency_original` are kept for traceability and reconciliation but are **not** the canonical P&L measure.
- Any future P&L surface (UI, exports, reports) must:
  - use `amount_base_pnl` for monetary lines, and
  - respect `org_settings.base_currency` and the FX history in `exchange_rates_daily`.

---

## C. Canonical source tables / views

### 1. `financial_ledger` — book of record

- **Type**: table (migration `20260303091000_f5_financial_ledger_and_period_lock.sql`).
- **Role**: **book of record** for all financial movements relevant to P&L and cash.
- **Key fields for P&L**:
  - `org_id` — tenant boundary.
  - `scope` (`'company'|'project'`) — distinguishes company-level vs project-level entries.
  - `type` (`financial_event_type`) — `income | expense | transfer | adjustment`.
  - `status` (`financial_status`) — `draft | posted | locked`.
  - `occurred_at` — accrual date for P&L.
  - `amount_original`, `currency_original`.
  - `rate_pnl`, `amount_base_pnl` — canonical P&L value.
  - `rate_cash`, `amount_base_cash` — canonical cash value (for future cashflow contract).
  - `reference_type`, `reference_id` — linkage to upstream events (e.g. `AMAZON_EVENT`).
  - `project_id` (when `scope='project'`) — linkage to product/project-level P&L.
- **Semantics**:
  - All ledger-based P&L is computed by aggregating `amount_base_pnl` over subsets of rows, grouped by `org_id`, period and (optionally) project/product or econ_type.

### 2. `org_settings` — base currency per org

- **Type**: table (migration `20260303090000_f5_finance_base_currency_and_exchange_rates.sql`).
- **Role**: **source-of-truth for base currency per org**.
- **Key fields**:
  - `org_id` (PK).
  - `base_currency` (ISO 3-letter, uppercase).
- **Guards**:
  - `org_settings_base_currency_guard` prevents changing `base_currency` once an org has `financial_ledger` rows in `status IN ('posted','locked')`.

### 3. `exchange_rates_daily` — FX source-of-truth

- **Type**: table (same migration as above + helper migration `20260303141000_f5_10_exchange_rate_helper.sql`).
- **Role**: **canonical FX history** used to derive base-currency amounts for P&L and cashflow.
- **Key fields**:
  - `rate_date`, `base_currency`, `currency`, `rate_to_base`, `source`.
- **Usage**:
  - Ledger and export RPCs use `get_exchange_rate_to_base(...)` to convert `amount_original`/`currency_original` into `amount_base_pnl` / `amount_base_cash` consistently.

### 4. `ledger_product_allocations` — allocation layer

- **Type**: table (migration `20260304120000_f10_2_profit_truth_engine.sql`).
- **Role**: **allocation layer** between ledger entries and products / projects.
- **Key fields**:
  - `ledger_entry_id` → `financial_ledger.id`.
  - `product_id` (project/product identifier).
  - `weight`, `method`, `confidence`.
- **Purpose**:
  - Enables splitting company-level or multi-product ledger entries across products/projects for **product-level P&L** (profit per ASIN / per project).

### 5. `v_ledger_norm` — normalisation layer

- **Type**: view (migration `20260304120000_f10_2_profit_truth_engine.sql`, documented in `docs/D10/F10_2_PROFIT_TRUTH_ENGINE.md`).
- **Role**: **normalised ledger view** with economic type classification.
- **Key fields** (conceptual):
  - `org_id`, `d` (date), `signed_amount` (based on `amount_base_pnl`), `econ_type`.
  - `econ_type` ∈ { `revenue`, `refund`, `amazon_fee`, `ads`, `cogs`, `freight`, `duties`, `other` } (current mapping may be partially collapsed; see docs).
- **Purpose**:
  - Provides a **chart-of-accounts-like econ_type** for each ledger row, used downstream by product and P&L views.

### 6. `v_product_econ_day` — product economics per day

- **Type**: view (migration `20260304120000_f10_2_profit_truth_engine.sql`).
- **Role**: **per-(org_id, product_id, d) aggregation** of economic amounts from `v_ledger_norm` + allocations.
- **Key fields**:
  - `org_id`, `product_id`, `d` (date).
  - `gross_sales`, `refunds`, `amazon_fees`, `ads`, `freight`, `duties`, `other_costs`.
- **Purpose**:
  - Input into:
    - `getCashflowForecast` (net revenue history),
    - `getAsinProfitData`,
    - `getProfitTimeseries`,
    - widgets and alerts that depend on product economics.

### 7. `v_product_profit_day` — product profit per day

- **Type**: view (same migration; documented in `F10_2_PROFIT_TRUTH_ENGINE.md`).
- **Role**: **product-level P&L per day** after combining econ and COGS.
- **Key fields**:
  - `org_id`, `product_id`, `d`.
  - `net_revenue`, `units_sold`, `cogs`, `contribution_margin`.
- **Purpose**:
  - Read model for product profitability per day; used by:
    - `getAsinProfitData`,
    - `getProfitTimeseries`,
    - product-level analytics.

---

## D. P&L line mapping (current model)

This section describes how **P&L lines** map to the current data model, **only where the repo provides enough information**. Any line that is partial or unclear is marked explicitly.

### 1. Revenue

- **Source**:
  - Ledger rows in `financial_ledger` classified via `v_ledger_norm` as `econ_type = 'revenue'`.
  - Upstream events come primarily from `amazon_financial_events` via ingest and posting RPCs.
- **Canonical measure**:
  - Sum of `signed_amount` (i.e. `amount_base_pnl` with sign) where `econ_type = 'revenue'`.
- **Status**: **canonical** at ledger level; product split via allocations is **beta but grounded**.

### 2. COGS (Cost of Goods Sold)

- **Source**:
  - Intended via `v_product_cogs_day` (from `v_product_unit_cost_wac` × `v_product_units_sold_day`).
  - Underlying tables: `ledger_product_allocations`, `inventory_receipts`, `inventory_receipt_items`, `inventory_movements` (cost pool), but **docs explicitly state** that the cost pool is incomplete / placeholder in current beta.
- **Canonicality today**:
  - `F10_2_PROFIT_TRUTH_ENGINE.md` documents that **COGS is 0** until a receipts-based cost pool is fully implemented.
- **Status**: **partial / unclear** — the schema is in place, but **COGS in P&L must be treated as 0 / incomplete** until the cost pool is wired and populated.

### 3. Gross Profit

- **Intended definition**:
  - `gross_profit = revenue − COGS`.
- **Given current implementation**:
  - Since COGS is effectively 0 in the current beta, gross profit **collapses to net_revenue**.
- **Status**: **derived but currently degenerate**; any P&L presentation should either:
  - display gross profit as **equal to net_revenue**, or
  - explicitly label COGS as “0 / not implemented” and treat gross profit as not meaningful yet.

### 4. Amazon fees

- **Source**:
  - `econ_type = 'amazon_fee'` in `v_ledger_norm`, aggregated into `v_product_econ_day.amazon_fees`.
- **Status**:
  - Mapping exists and is documented, but `F10_2_PROFIT_TRUTH_ENGINE.md` notes that after F10.2 patch some econ types may be collapsed until mapping is restored.
  - Treat as **canonical where non-zero**, but expect zeros where mapping is not yet wired.

### 5. Ads

- **Source**:
  - `econ_type = 'ads'` in `v_ledger_norm`, aggregated into `v_product_econ_day.ads`.
- **Status**:
  - Same as Amazon fees: **canonical conceptually**, but zeros are possible until mapping is fully wired.

### 6. Freight / logistics, duties, other costs

- **Source**:
  - `econ_type` values `freight`, `duties`, `other` in `v_ledger_norm`, aggregated into:
    - `v_product_econ_day.freight`,
    - `v_product_econ_day.duties`,
    - `v_product_econ_day.other_costs`.
- **Status**:
  - **Present in model**, but coverage may be partial; some logistics costs may still live only in `purchase_orders` / logistics tables without ledger posting.

### 7. Operating expenses

- **Current state**:
  - There is **no dedicated Econ type or view** that groups “operating expenses” separately from other expenses.
  - Any non-Amazon, non-COGS, non-logistics expenses are currently classified as generic `other` in `v_ledger_norm`.
- **Status**:
  - **Unclear / not separated** — the system does not provide a clean “Operating expenses” P&L line yet; all non-specialised expenses are effectively part of “other costs”.

### 8. Net Profit

- **Source**:
  - Product-level: `v_product_profit_day` exposes `net_revenue` and `contribution_margin`; net profit at product/day is effectively `contribution_margin` given COGS=0.
  - Workspace-level: helpers like `getAsinProfitData`, `getWorkspaceProfit`, `getProfitTimeseries` compute:
    - `netProfit`, `margin`, `roi` using aggregated data from `v_product_econ_day` + `v_product_profit_day`.
- **Status**:
  - **Canonical for product / workspace profit views**, within the documented limitations (COGS=0, econ_type mapping simplifications).

Summary:

- **Canonical P&L lines with clear backing**:
  - Revenue (ledger / econ_type).
  - Amazon fees, ads, freight, duties, other costs (where mapped).
  - Net profit (product/workspace-level, limited by current COGS=0).
- **Partial / unclear**:
  - COGS, Gross profit, explicit Operating expenses — schema exists, but data and mappings are not fully wired.

---

## E. Scope and granularity

Granularity levels supported by the current canonical model:

- **Org-level P&L**:
  - Aggregation of `financial_ledger.amount_base_pnl` by `org_id` and period (`occurred_at` / accounting periods).
  - Used by quarterly P&L RPCs in the export pipeline.

- **Project / product-level P&L**:
  - Product/project-level P&L is derived via:
    - `ledger_product_allocations` (ledger_entry_id → product_id / project_id),
    - `v_product_econ_day` and `v_product_profit_day`.
  - This supports **“product profit”** and **workspace-level profit views** (Profit page, widgets).

- **Period granularity**:
  - **Minimal canonical period** for exports: **quarter**, governed by `accounting_periods` (`year`, `quarter`, `status`).
  - Internally, views operate at **day-level** (`d`); quarter/month/year views aggregate days.

Naming:

- **“Workspace P&L”**:
  - Any per-org P&L view that aggregates ledger in base currency, scoped by `org_id` and period (e.g. quarterly P&L RPCs).
- **“Product profit”**:
  - Per-product/per-ASIN/per-project metrics coming from `v_product_econ_day` and `v_product_profit_day` via helpers (`getWorkspaceProfit`, `getProfitTimeseries`, `getMarginCompressionAlerts`).
- **Read models vs source**:
  - **Source-of-truth**: `financial_ledger` (+ `org_settings`, `exchange_rates_daily`, `ledger_product_allocations`).
  - **Read models**: views (`v_ledger_norm`, `v_product_econ_day`, `v_product_profit_day`, coverage views) and JS helpers that project/reformat these for UI/exports.

---

## F. Relationship with product/inventory cost

Relevant objects:

- `ledger_product_allocations`
- `inventory_receipts`
- `inventory_receipt_items`
- `inventory_movements`
- Views: `v_product_cost_pool`, `v_product_unit_cost_wac`, `v_product_units_sold_day`, `v_product_cogs_day`.

Current state (per `F10_2_PROFIT_TRUTH_ENGINE.md` and migrations):

- **Allocations**:
  - `ledger_product_allocations` links ledger entries to products/projects; this part is **implemented**.
- **Cost pool and WAC**:
  - `v_product_cost_pool` and `v_product_unit_cost_wac` exist as views but **are documented as placeholder / 0 rows** until a receipts-based model is fully implemented.
  - As a consequence, `v_product_cogs_day` and `cogs` fields in `v_product_profit_day` are effectively **0**.
- **Units sold**:
  - `v_product_units_sold_day` uses **event count in `amazon_financial_events`** as a proxy for “units sold”; there is no quantity column in the events table.

Contract today:

- **Canonical**:
  - Product-level profit views are grounded in ledger and allocations.
  - Inventory receipts and movements are **supporting schema** ready to host a cost pool.
- **Support / complement**:
  - `inventory_receipts`, `inventory_receipt_items`, `inventory_movements` currently serve primarily observability and future cost coverage; they are **not yet fully wired into COGS**.
- **Gaps (controlled debt)**:
  - No true **landed cost / WAC** model in production; COGS remains effectively zero in P&L.
  - Any future work that wants to expose COGS must first wire the receipts/cost pool into ledger or profit views.

---

## G. Explicit non-canonical sources

The following tables, helpers and surfaces **do not form part of the canonical P&L contract** and must **not** be treated as authoritative for P&L, even if they show financial-looking numbers:

- **Legacy finance tables**:
  - `expenses`
  - `incomes`
  - `recurring_expenses`
  - `finance_categories`
- **Legacy Finances UI**:
  - `src/pages/Finances.jsx` — legacy ledger-like UI over `expenses`/`incomes`; user-scoped, no org_id, no FX, no link to `financial_ledger`.
- **Payments as P&L**:
  - `payments` is **not** the canonical P&L source.
  - It is an operational cash movement table used for dashboards and some flows, but **cannot substitute ledger** for P&L.
- **Orders / sales as P&L**:
  - `orders`, `order_items`, `sales` are **operational sales data**, not P&L truth.
  - Revenue for P&L comes from ledger via `amazon_financial_events`, not directly from these tables.
- **Heuristic dashboard stats**:
  - `getDashboardStats` in `src/lib/supabase.js`:
    - sums `payments.amount` and applies hardcoded EUR/USD logic.
    - this is a **KPI heuristic**, **not** canonical P&L.
- **Any UI or helper that aggregates monetary values without going through**:
  - `financial_ledger` + `org_settings` + `exchange_rates_daily` (for currency),
  - or the profit views based on ledger,
  must be treated as **non-canonical** for P&L.

---

## H. Relation with cashflow

This document fixes **P&L only**.

Important distinctions:

- **Canonical cash fields in ledger**:
  - `financial_ledger.amount_base_cash`
  - `financial_ledger.cash_at`
  - These are the basis for a **canonical cashflow statement**, but that contract is **not defined here**; it belongs to a future F5.x subphase.

- **Current cashflow forecast engine**:
  - `getCashflowForecast` (`src/lib/finance/getCashflowForecast.js`):
    - uses **net revenue history** from `v_product_econ_day` (ledger-based),
    - subtracts future inventory outflows based on `purchase_orders.total_amount`.
  - This is **explicitly a forecast model**, not a realised cashflow statement.

Contract:

- P&L contract **does not redefine cashflow**.
- Any future **cashflow contract** must:
  - treat `amount_base_cash` / `cash_at` as canonical,
  - and be specified in a dedicated FASE 5 document.
- Until then, `getCashflowForecast` is a **useful heuristic tool**, but **not** the canonical cashflow truth.

---

## I. Operational guardrails (for future work)

The following rules must hold for any future implementation touching P&L:

1. **Source-of-truth**:
   - Any new P&L surface (UI, report, export, API) must read **only** from:
     - `financial_ledger` (directly or via canonical views), and
     - `org_settings` + `exchange_rates_daily` for currency semantics.
2. **No cross-currency sums outside the FX contract**:
   - Never aggregate `amount_original` across multiple currencies.
   - Always use `amount_base_pnl` in the org’s `base_currency`.
3. **Legacy tables are not P&L**:
   - `expenses`, `incomes`, `recurring_expenses`, `finance_categories` may be kept for legacy workflows, but:
     - must not be marketed or interpreted as “official P&L”.
4. **Payments cannot replace ledger**:
   - `payments` may support operational UIs and KPIs.
   - Any “official” P&L, export, or reconciliation must be derived from `financial_ledger`.
5. **Exports and reconciliation**:
   - All official exports (e.g. quarterly packs) must continue to use:
     - `financial_ledger` + `accounting_periods` + `org_settings` + `exchange_rates_daily`,
     - via the existing RPC contracts.

---

## J. Controlled debt

Controlled debt explicitly recognised by this contract:

- **Legacy Finances UI**:
  - `Finances.jsx` remains user-scoped and ledger-less.
  - It may diverge numerically from ledger-based P&L; this is acceptable controlled debt until a migration is done.
- **Payments-based KPIs**:
  - `getDashboardStats` and any widget based on `payments` with hardcoded FX are **not aligned** with ledger+FX; they should be treated as convenience KPIs only.
- **COGS / inventory cost coverage**:
  - The cost pool (receipts, WAC) is **not fully wired**; `cogs` is effectively 0.
  - Product profit V1 is therefore **contribution margin before true COGS**.
- **econ_type mapping completeness**:
  - After F10.2 patch, some econ types in `v_ledger_norm` may be collapsed (e.g. non-Amazon fees folded into `other`).
  - This limits the granularity of P&L lines but does not break the base contract.

These items do **not** invalidate the canonical P&L contract; they are clearly documented gaps for future phases.

---

## K. Explicit non-goals of FASE 5.2

FASE 5.2 does **not** attempt to:

- Implement a full double-entry accounting system or external accounting connector.
- Introduce new ledger types, econ_type mappings, or FX workflows.
- Replace or refactor `Finances.jsx`, dashboards, or other legacy UIs.
- Define or implement the canonical **cashflow** contract.
- Rewrite dashboard KPIs to be ledger-based.
- Implement new inventory cost pool logic or fully wire COGS.

Its sole purpose is to **pin down the canonical P&L contract** for the current system so that future phases can evolve safely on top of a clear, repo-grounded foundation.

