# FREEDOLIAPP — UI Data States (V1)

**Status:** Active  
**Scope:** Standardized loading, empty, and error states across data-driven screens.

## Purpose

The data-state system gives the app a consistent way to show:

- **Loading** — while async data is loading
- **Empty** — when the query succeeds but returns no data
- **Error** — when the request fails (with optional retry)

This reduces duplicated UI logic and keeps behaviour and copy aligned across screens.

## When to use `DataState`

Use the **DataState** wrapper when a screen has a **single clear async boundary**: one loading flag, one error, and one “empty” condition for the main list or view.

**Example:**

```jsx
<DataState
  loading={loading}
  error={error}
  isEmpty={items.length === 0}
  loadingMessage={t('dataStates.loading')}
  emptyMessage={t('dataStates.emptyInventory')}
  errorMessage={error}
  onRetry={loadData}
  emptyIcon={Package}
  emptyAction={<Button onClick={handleAdd}>Add</Button>}
>
  {/* main content when not loading/error/empty */}
</DataState>
```

Screens that use **DataState** in V1: **Decisions** (DecisionList), **Cashflow**. **Inventory** uses the three primitives directly (loading / error / empty) with the same messages and retry behaviour.

## When to use the primitives directly

Use **DataLoading**, **DataEmpty**, or **DataError** directly when:

- You only need one or two of the three states (e.g. only loading + error, custom empty).
- The screen has **multiple independent widgets** (e.g. Dashboard, Profit with main data + trend + alerts). In those cases, use the primitives per widget or only for the main boundary.
- You need a **custom empty** (rich copy, illustration, CTA) and only want to standardize loading and error.

**Examples:**

- **Projects:** DataLoading + DataError for the main boundary; custom empty and no-org state unchanged.
- **Orders, Suppliers, Profit, Analytics:** DataLoading + DataError for the main boundary; custom empty or in-content empty unchanged.
- **Dashboard:** DataError only for the home data error banner; widgets keep their own loading/empty.

## Components

| Component     | Role |
|--------------|------|
| **DataState** | Wrapper: branches on `loading` → **DataLoading**, `error` → **DataError**, `isEmpty` → **DataEmpty**, else renders `children`. |
| **DataLoading** | Centred message + small spinner (Loader + `fd-spin`). Prop: `message` (optional; falls back to i18n `dataStates.loading`). |
| **DataEmpty**   | Centred message, optional icon, optional action node. Props: `message`, `icon`, `action`. |
| **DataError**   | Centred message, optional “Try again” button. Props: `message`, `onRetry`. |

All use existing design tokens (`--muted-1`, `--border-1`, etc.) and no new global styling.

## i18n keys

Shared keys under `dataStates` (en, ca, es):

- `dataStates.loading`
- `dataStates.errorGeneric`
- `dataStates.retry`
- `dataStates.emptyGeneric`
- `dataStates.emptyDecisions`
- `dataStates.emptyInventory`
- `dataStates.emptyCashflow`

Screens can pass their own translated message (e.g. `t('orders.empty.title')`) into the components instead of using these when they need screen-specific copy.

## Multi-widget dashboards

Pages like **Dashboard** or **Profit** (main table + trend + margin/stockout alerts) do **not** wrap the whole page in one DataState. They use:

- One main loading/error boundary (often with DataLoading/DataError), and
- Per-widget or per-section loading/empty/error where it makes sense.

So the data-state system stays a single-boundary pattern; we avoid forcing one global wrapper where states are independent.

## Files

- **Components:** `src/components/dataStates/` — `DataState.jsx`, `DataLoading.jsx`, `DataEmpty.jsx`, `DataError.jsx`, `index.js`
- **i18n:** `src/i18n/locales/{en,ca,es}.json` → `dataStates.*`
- **Screens updated in V1:** Dashboard (error), Inventory, Decisions (DecisionList), Projects, Orders, Suppliers, Cashflow, Profit, Analytics
