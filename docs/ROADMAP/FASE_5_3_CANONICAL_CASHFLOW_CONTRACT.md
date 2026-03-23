# FASE 5.3 — CANONICAL CASHFLOW CONTRACT

## A. Purpose / scope

This document fixes the **canonical realised cashflow contract** of FREEDOLIAPP **as implemented today**, grounded strictly in the current repo:

- Defines **what counts as canonical realised cashflow**.
- Enumerates the **canonical tables, fields and helpers** that participate in realised cashflow.
- Describes the **minimal cashflow line mapping** that the existing model can support.
- Clarifies the **relationship between cashflow and P&L**, and between **realised cashflow and forecast**.
- Explicitly lists **non-canonical / forecast / legacy sources** that must not be treated as realised cashflow truth.

Out of scope:

- Designing a full treasury/banking reconciliation system.
- Implementing new UI, RPCs or DB changes.
- Redesigning `Cashflow.jsx`, forecasts, or dashboards.
- Redefining the P&L contract (already fixed in FASE 5.2).

This is a **descriptive contract** of the current system, **not** a speculative future cash management architecture.

---

## B. Canonical cashflow definition

**Canonical realised cashflow** in FREEDOLIAPP is defined as:

- An **aggregation of `financial_ledger` entries in base currency**, using:
  - **Value**: `financial_ledger.amount_base_cash`
  - **Time dimension**: `financial_ledger.cash_at`

Canonical monetary fields and FX:

- **Original capture**:
  - `financial_ledger.amount_original`
  - `financial_ledger.currency_original`
- **Canonical P&L value** (already defined in FASE 5.2):
  - `financial_ledger.amount_base_pnl` (based on `occurred_at`).
- **Canonical realised cash value**:
  - `financial_ledger.amount_base_cash` (based on `cash_at`).
- **Base currency per org**:
  - `org_settings.base_currency` (3-letter uppercase ISO).
- **FX source-of-truth**:
  - `exchange_rates_daily` (`rate_to_base` per `(rate_date, base_currency, currency)`).

Key distinction:

- `amount_base_pnl` and `amount_base_cash` are **not interchangeable**:
  - `amount_base_pnl` + `occurred_at` → **accrual (P&L)**.
  - `amount_base_cash` + `cash_at` → **realised cashflow**.

---

## C. Canonical source tables / views

### 1. `financial_ledger` — realised cash and P&L base

- **Type**: table (migration `20260303091000_f5_financial_ledger_and_period_lock.sql`).
- **Role**: **book of record** for both P&L and realised cash.
- **Key fields for cashflow**:
  - `org_id` — tenant scope.
  - `scope` (`'company'|'project'`) — company-level vs project-level cash.
  - `type` (`financial_event_type`) — `income | expense | transfer | adjustment`.
  - `status` (`financial_status`) — `draft | posted | locked`.
  - `cash_at` — **cash date** (when cash movement occurs / is recognised).
  - `amount_base_cash` — **canonical cash value in base currency**.
  - `reference_type`, `reference_id` — linkage to upstream events (Amazon settlements, etc.).

For any **org-level realised cashflow**, the only canonical data source is:

- Sum of `amount_base_cash` over subsets of `financial_ledger` rows, grouped by:
  - `org_id`
  - `cash_at` (day)
  - optionally `type`, `scope`, `project_id`, `econ_type` (via views).

### 2. `org_settings` — base currency per org

- **Type**: table (migration `20260303090000_f5_finance_base_currency_and_exchange_rates.sql`).
- **Role**: **source-of-truth for the base currency** in which realised cashflow is expressed.
- **Key fields**:
  - `org_id`
  - `base_currency`
- **Guard**: `org_settings_base_currency_guard` prevents changing `base_currency` once there are `financial_ledger` entries in `status IN ('posted','locked')`.

### 3. `exchange_rates_daily` — FX for cash

- **Type**: table (same migration + helper in `20260303141000_f5_10_exchange_rate_helper.sql`).
- **Role**: **canonical FX history** used to derive both `amount_base_pnl` and `amount_base_cash`.
- **Key fields**:
  - `rate_date`, `base_currency`, `currency`, `rate_to_base`, `source`.
- **Usage**:
  - The same FX mechanism is used to compute `amount_base_pnl` and `amount_base_cash`; the **date dimension differs**:
    - P&L: conversion anchored on `occurred_at`.
    - Cashflow: conversion anchored on `cash_at`.

### 4. `accounting_periods` — governance for cash periods

- **Type**: table (same ledger migration).
- **Role**: **period lock governance** for financial reporting.
- **Key fields**:
  - `org_id`, `year`, `quarter`, `status ('open'|'locked')`, `locked_at`, `locked_by`.
- **Relevance for cashflow**:
  - When a period is `locked`, both P&L and cashflow are intended to be **frozen** for that quarter.
  - The trigger `financial_ledger_period_lock_guard` prevents `UPDATE`/`DELETE` of ledger rows for locked periods, which applies equally to P&L and cash.

### 5. Quarterly export RPCs and views (read models)

While the detailed SQL is defined in migrations (`20260303100000_f5_quarterly_export_rpcs.sql` and related D5 docs), the contract is:

- **RPCs**:
  - `cashflow_quarterly(year, quarter)`:
    - Reads from `financial_ledger` (+ `org_settings` + `exchange_rates_daily` where needed).
    - Returns cash movements per quarter period, in base currency.
  - Exposed via the export worker/Edge through `request_quarter_pack` (see `D5_FINANCES/D5_EXPORT_PIPELINE.md`).
- **Role**:
  - These RPCs are **canonical read models** for realised cashflow per quarter; they do not introduce new semantics beyond aggregating `amount_base_cash` by period and type.

No React component today directly renders a “ledger cashflow” UI from these RPCs; they are consumed via `FinanceExports.jsx` as part of the quarterly pack.

---

## D. Cashflow line mapping (current model)

This section describes which cashflow lines the current model can support **without inventing semantics**.

### 1. Cash inflow

- **Source**:
  - `financial_ledger` rows where:
    - `amount_base_cash > 0` (income in cash terms), and/or
    - `type = 'income'` (via `financial_event_type`) with non-null `amount_base_cash`.
- **Meaning**:
  - Positive cash movements **into** the workspace, already converted to base currency.
- **Status**: **canonical**, within the limits of which events are actually posted with `cash_at` and `amount_base_cash` (today primarily Amazon settlements and similar ingest flows).

### 2. Cash outflow

- **Source**:
  - `financial_ledger` rows where:
    - `amount_base_cash < 0` (expense in cash terms), and/or
    - `type = 'expense'` with non-null `amount_base_cash`.
- **Meaning**:
  - Negative cash movements **out of** the workspace.
- **Status**: **canonical**, given posted ledger entries; some operational cash movements may still live only in `payments` (see controlled debt).

### 3. Opening / closing cash position

- **Model support**:
  - The ledger model supports computing:
    - **Opening cash** for a period = cumulative sum of `amount_base_cash` prior to the period start.
    - **Closing cash** for a period = opening cash + sum of `amount_base_cash` within the period.
- **Current repo state**:
  - There is **no dedicated `opening_balance` / `closing_balance` column** or view in the repo for cash; these are **implicit** calculations that could be built on ledger.
- **Status**:
  - **Conceptually supported** by the model, but **no explicit read model** is defined yet.
  - Any future implementation must derive opening/closing balances purely from ledger history, not from external balances.

### 4. Operating cash movement

- **Source**:
  - In principle, a subset of ledger rows (by `econ_type` / `type`) representing operating receipts/payments.
  - Today, there is **no explicit separation in the repo** between “operating”, “investing”, or “financing” cash categories.
- **Status**:
  - **Unclear** — the data is there, but the categorisation into operating vs other activities is **not** modelled explicitly. No canonical operating cashflow line is defined yet.

### 5. Purchase / inventory cash outflow

- **Current implementation**:
  - Actual inventory cash outflows **should** appear as ledger entries (expense-type lines with `cash_at` and `amount_base_cash`).
  - Independently, `getCashflowForecast` uses `purchase_orders.total_amount` as **future outflow proxy** (forecast), not realised cash.
- **Status**:
  - **Realised inventory cash outflow** is canonical **only** when posted to `financial_ledger` with `amount_base_cash`.
  - `purchase_orders` on their own are **not** a realised cash source (see non-canonical list).

### 6. Amazon settlement / payout cash inflow

- **Source**:
  - `amazon_financial_events` represent raw settlement lines.
  - Posting RPCs (`post_amazon_job_to_ledger_backend`, etc.) create ledger entries that include **cash** semantics (depending on mapping) and are subsequently converted to base currency.
  - Realised cash from Amazon is therefore visible as `financial_ledger` entries with positive `amount_base_cash`.
- **Status**:
  - **Canonical** once posted into ledger; Amazon-specific logic lives upstream in ingest/normalisation, not in the cashflow contract itself.

### 7. Transfers / adjustments

- **Source**:
  - Ledger `type = 'transfer' | 'adjustment'`.
- **Status**:
  - The model supports these event types; how they are used depends on ingest and future workflows.
  - For the cashflow contract, they are treated as **normal cash movements** (positive or negative) unless a future phase defines more granular semantics.

Summary:

- The model can **safely** support:
  - Total inflows and outflows per period.
  - Per-type aggregations (income vs expense vs transfer vs adjustment).
  - Per-scope (company vs project) cash views.
- More nuanced statements (operating/investing/financing cash, opening/closing cash tables) are **derivable but not yet implemented** as canonical read models.

---

## E. Relationship with P&L

P&L and cashflow share the same ledger and FX machinery, but use **different fields and dates**:

- **P&L (FASE 5.2)**:
  - Uses `amount_base_pnl`.
  - Anchors on `occurred_at` (accrual date).
  - Answers: *“When was value economically earned or incurred?”*

- **Realised cashflow (this document)**:
  - Uses `amount_base_cash`.
  - Anchors on `cash_at` (cash date).
  - Answers: *“When did cash actually move?”*

Practical implications:

- A ledger entry may have:
  - `occurred_at` in one period (P&L),
  - `cash_at` in another (cashflow),
  - reflecting classic timing differences between revenue/expense recognition and cash collection/payment.
- Any future reporting that combines P&L and cashflow must:
  - **never** mix `amount_base_pnl` and `amount_base_cash` in the same measure.
  - always state clearly whether numbers are **accrual** or **cash** based.

---

## F. Relationship with forecast

The repo implements a **cashflow forecast engine**, separate from realised cashflow:

- **`getCashflowForecast` (`src/lib/finance/getCashflowForecast.js`)**:
  - Uses:
    - `v_product_econ_day` (derived from ledger) to compute **average daily net revenue** over a lookback window.
    - `purchase_orders.total_amount` as a future **inventory cash outflow proxy** over a forecast horizon.
  - Returns a series `{ date, cashBalance }` starting from placeholder `cash=0` and applying:
    - + average daily net revenue,
    - − projected inventory outflows per day from POs.
- **`Cashflow.jsx`**:
  - Calls `getCashflowForecast` and renders the forecast series in the UI.

Contract:

- `getCashflowForecast` and `Cashflow.jsx` constitute a **cashflow forecast / projected cashflow engine**, **not** the canonical realised cashflow.
- They:
  - do **not** read `amount_base_cash` or `cash_at`.
  - approximate future behaviour from recent profit and purchase commitments.

This document fixes that:

- **Realised cashflow** = `amount_base_cash` + `cash_at` from `financial_ledger` (plus exports/RPCs that read from it).
- **Forecast cashflow** = `getCashflowForecast` (net revenue history + PO-based outflows in the future).

They are both valid concepts, but **must not be conflated** in contracts, UIs or exports.

---

## G. Explicit non-canonical sources (cashflow)

The following tables, helpers and surfaces **do not form part of the canonical realised cashflow contract** and must **not** be treated as authoritative for cashflow, even if they show monetary values or “cash-like” numbers:

- **`payments`**:
  - Operational cash movement table (`payments.amount`, `payments.currency`), used in some KPIs and UIs.
  - **Not** the cashflow book of record; only ledger (`financial_ledger`) is canonical for realised cash.

- **Legacy finance tables & UI**:
  - `expenses`, `incomes`, `recurring_expenses`, `finance_categories`.
  - `Finances.jsx` (legacy ledger-like UI over `expenses`/`incomes`).
  - User-scoped, no `org_id`, no `amount_base_cash`, no `cash_at`.

- **`purchase_orders` as realised cash**:
  - `purchase_orders.total_amount` is a **commitment / cost estimate**, not realised cash.
  - Used legitimately by `getCashflowForecast` as **future outflow proxy**, but **not** as realised payments.

- **`getCashflowForecast` and `Cashflow.jsx`**:
  - Are **forecast** / projection tools over future dates.
  - Not a realised cashflow statement; they never read `amount_base_cash` or `cash_at`.

- **Dashboard KPIs that sum imports fora del ledger**:
  - Any KPI that aggregates `payments`, `expenses`, etc. without going through `financial_ledger` must be treated as **non-canonical** for cashflow.

---

## H. Relation with operational tables

This section documents how key operational tables relate to cashflow **without** promoting them to canonical realised cash sources.

- **`payments`**:
  - Operational record of payments at project/PO level.
  - Upstream or complementary to ledger (depending on how ingest/backfills are wired), but **not** itself the cash book.
  - Can inform UX (e.g. “last payment date”), but any official cashflow must be read from ledger.

- **`purchase_orders`**:
  - Represent purchase commitments and totals (`total_amount`).
  - Feed:
    - logistics,
    - inventory intelligence,
    - **cashflow forecast** (`getCashflowForecast`) as projected outflow.
  - **Do not represent actual cash movements** until they are reflected in ledger entries with `cash_at` and `amount_base_cash`.

- **`amazon_financial_events`**:
  - Raw settlements/events from Amazon.
  - Upstream of ledger: ingest and posting RPCs translate these events into ledger entries for both P&L and cash.
  - Canonical cashflow only appears **after** events are posted into `financial_ledger`.

- **`orders` / `sales`**:
  - Operational sales data (orders, items, aggregated sales).
  - May be used for analytics and forecasting, but **not** as a cash source; realised cash appears when settlements hit ledger.

- **Inventory-related tables**:
  - `inventory_receipts`, `inventory_receipt_items`, `inventory_movements`:
    - Capture state and movement of stock and cost, feeding future COGS and potentially cash predictions.
    - **Do not themselves authorise realised cashflow**; cash is canonical only when posted to ledger.

Summary:

- These tables are:
  - **upstream**, **complementary**, or **forecast inputs**,
  - not the **final source of realised cash**.
- The final, authoritative record is always `financial_ledger` (`amount_base_cash`, `cash_at`).

---

## I. Operational guardrails

For any future work touching **realised cashflow**, the following rules apply:

1. **Source-of-truth**:
   - Any new realised cashflow surface (UI, report, export, API) must read **only** from:
     - `financial_ledger` (`amount_base_cash`, `cash_at`), and
     - `org_settings` + `exchange_rates_daily` for currency semantics.
2. **FX discipline**:
   - Never aggregate `amount_original` across currencies.
   - Never mix `amount_base_pnl` and `amount_base_cash` in the same “cash” measure.
   - Always report cashflow in `org_settings.base_currency`.
3. **`payments` and `purchase_orders`**:
   - `payments` can support UIs and KPIs, but **cannot** substitute ledger as the official cash source.
   - `purchase_orders` can feed forecasts/commitments, not realised cash.
4. **Forecast vs realised**:
   - Any surface using `getCashflowForecast` must be labelled and documented as **forecast**/**projection**, not as realised treasury statement.
   - Realised cash statements must never depend on `getCashflowForecast`.
5. **Exports & reconciliation**:
   - All official cash exports (e.g. quarterly packs’ cashflow CSV) must be derived from `financial_ledger.amount_base_cash` grouped by `cash_at`, with base currency from `org_settings` and FX from `exchange_rates_daily`.

---

## J. Controlled debt

Controlled debt explicitly recognised by this cashflow contract:

- **Cashflow UI vs ledger**:
  - `/app/cashflow` (`Cashflow.jsx`) today renders **forecast** from `getCashflowForecast`, not **realised cash** from ledger.
  - This is acceptable as long as it is understood and documented as forecast, not as canonical cash statement.

- **`payments` usage**:
  - Several KPIs and flows still rely on `payments` directly; these may diverge from ledger-based cash.
  - Migration paths exist (posting `payments` into ledger), but they are not part of this phase.

- **Opening/closing cash position**:
  - The model fully supports deriving these from ledger history, but there is no explicit view/RPC yet.
  - Any UI that displays “cash today” / “cash in 30 days” currently uses forecast, not ledger balances.

- **Categorisation (operating / investing / financing)**:
  - Ledger types (`income`, `expense`, `transfer`, `adjustment`) exist, but no canonical split into operating/investing/financing activities is implemented.
  - Any such split in the future must be introduced explicitly and documented; today, cashflow is simply “all cash movements”.

These debts **do not invalidate** the canonical realised cashflow contract; they mark areas for future FASE 5 work.

---

## K. Explicit non-goals of FASE 5.3

FASE 5.3 does **not** attempt to:

- Redesign or re-implement `getCashflowForecast` or `Cashflow.jsx`.
- Introduce new cashflow RPCs, views, or exports.
- Implement bank account reconciliation or external statement ingestion.
- Change any P&L logic (already fixed in FASE 5.2).
- Rewrite dashboard KPIs or Finances UI to be cashflow-ledger-based.
- Define a full treasury policy or reserves strategy.

Its sole purpose is to **pin down the canonical realised cashflow contract** for the current system so that future phases can safely evolve forecast engines, UIs, and reconciliations on top of a clear, repo-grounded foundation.

