# FREEDOLIAPP — DEMO CAPTURE RUNBOOK V1

Status: Draft  
Owner: Product / Engineering  
Scope: Demo data preparation and capture workflow  
Last update: 2026

---

## 1 — Purpose

This document defines the **safe workflow** to prepare a clean FREEDOLIAPP environment for:

- landing screenshots  
- live product demos  
- partner presentations  
- internal QA / validation

Demo data is **DEV / testing only** and must **never auto‑seed production users**. All seeding actions are **manual and explicit**.

---

## 2 — Current Demo Seed Sources

Existing demo‑related sources in the repo:

- `src/lib/demoSeed.js`  
  - Core JS utilities to **generate, check and clear** demo data via Supabase:
    - `generateDemoData(onProgress?)`
    - `checkDemoExists()`, `checkRealDataExists()`
    - `clearDemoData()`
  - All demo rows are created with `is_demo: true` and tied to the current `user_id`.

- `src/pages/DevSeed.jsx`  
  - Frontend admin / dev page to:
    - check if demo data exists,
    - generate a full demo dataset,
    - clear existing demo data.
  - Uses the functions from `demoSeed.js` and is intended for **DEV / staging**, not end users.

- `src/pages/Settings.jsx`  
  - Contains an internal section that can:
    - check for existing demo data,
    - trigger generate / clear demo data actions.
  - Secondary path; primarily for internal tooling / admins.

- `supabase/migrations/seed_dev_data.sql`  
  - Optional **SQL seed script for DEV Supabase** projects.
  - Adds missing columns and inserts minimal demo rows when run manually in the Supabase SQL editor.

- `demo_seed.sql`  
  - Full SQL demo seed for DEV Supabase:
    - creates demo projects, suppliers, purchase orders, shipments, tasks, sticky notes, decision_log entries, etc.
  - Designed to be executed manually in **DEV**, never in production.

---

## 3 — What the Current Demo Dataset Includes

Based on `src/lib/demoSeed.js` and `demo_seed.sql`, the current demo dataset includes at least:

- **Suppliers**  
  - 8 demo suppliers with different types (manufacturer, freight, inspection), ratings, terms and contact details.

- **Projects / SKUs**  
  - 10 demo projects, each with:
    - project code (e.g. `DEMO-PR-000001`), SKU, name, phase and decision.
  - These act as **10 SKUs** for demo purposes.

- **Purchase Orders**  
  - 6 demo projects with 1–2 POs each:
    - statuses including: `draft`, `confirmed`, `in_production`, `shipped`, `received`.
  - Each PO has items with quantities, unit prices and totals.

- **Shipments / In‑transit data**  
  - 4 demo shipments linked to POs:
    - `planned`, `in_transit` and `delivered` states,
    - ETAs, tracking numbers / PRO numbers.

- **Decisions / Alerts (decision_log)**  
  - Demo entries in `decision_log` for projects with decisions:
    - `GO`, `RISKY`, `DISCARDED`, etc.
  - Each with a reason and notes that behave as **operational alerts**.

All demo records are:

- created with `is_demo: true` where the table supports it,
- explicitly tied to the current `user_id` (per‑workspace / per‑user demo),
- removable via `clearDemoData()` and the DevSeed UI.

---

## 4 — Recommended Demo Preparation Flow

Preferred workflow to prepare a **clean demo workspace**:

1. **Use DEV / safe environment**  
   - Connect to a DEV or staging FREEDOLIAPP environment backed by a non‑production Supabase project.

2. **Log in with a demo user**  
   - Use a dedicated demo account (e.g. `demo+freedoliapp@company.com`), not a real customer account.

3. **Clear existing demo data**  
   - Open the Dev Seed page (see section 5).  
   - Click **“Clear demo data”** to remove any previous `is_demo=true` records for this user.

4. **Generate fresh demo data**  
   - From the same Dev Seed UI, click **“Generate complete demo data”**.  
   - Wait until the status message confirms success (no errors in console).

5. **Verify dashboard is populated**  
   - Open the main dashboard and check that:
     - KPIs (revenue, profit, units, etc.) show non‑zero values,
     - there are visible cards / charts, not empty states.

6. **Verify suppliers / orders / decisions**  
   - **Suppliers**: list shows 8 demo suppliers with clean names.  
   - **Orders / POs**: table or board shows POs with mixed statuses (draft, confirmed, in production, shipped, received).  
   - **Decisions / alerts**: decision dashboard / alerts view shows entries derived from projects and decision_log.

7. **Capture screenshots or run live demo**  
   - Once views look consistent and realistic, capture screenshots (see section 7) or start the live walkthrough.

This flow can be repeated whenever you need a fresh, consistent demo environment.

---

## 5 — Preferred UI Path

**Primary path: DevSeed page**

- Use `src/pages/DevSeed.jsx` (typically exposed as `/dev/seed` or similar in DEV).
- From this page you can:
  - check whether demo data already exists,
  - clear existing demo data,
  - generate a full, curated demo dataset in one step.
- This is the **recommended path** for:
  - preparing screenshots,
  - partner demos,
  - internal QA runs.

**Secondary path: Settings**

- `src/pages/Settings.jsx` includes an internal section that can:
  - trigger demo data generation,
  - clear demo data.
- This path is useful for internal testing but less focused for full “demo workspace setup” than DevSeed.

For **repeatable demos**, prefer **DevSeed** as the single place to:

- reset demo data,  
- regenerate,  
- monitor progress.

---

## 6 — Demo Quality Checklist

Before any external‑facing demo (or screenshot capture), check:

- **No empty states**  
  - Dashboard shows populated KPIs and charts.  
  - Tables (suppliers, POs, decisions) are non‑empty.

- **No real customer data**  
  - All names / emails / notes are clearly demo‑style.  
  - No references to real brands, marketplaces or invoices.

- **Supplier names are concise and readable**  
  - Use short demo supplier names, no lorem ipsum or random noise.

- **Purchase order statuses look realistic**  
  - Mix of `draft`, `confirmed`, `in_production`, `shipped`, `received`.  
  - Dates and amounts look plausible for Amazon FBA operations.

- **Dashboard KPIs are clean**  
  - No NaN/undefined/zero‑everywhere issues.  
  - Currency and units formatting is correct.

- **Decisions and alerts are visible**  
  - Decision dashboard / alerts surfaces show at least a few entries.  
  - Reasons and notes are understandable.

- **No broken charts or components**  
  - Charts render correctly; no empty placeholders or console errors.

- **No loading spinners stuck**  
  - Pages settle into a stable state (no infinite “loading…” indicators).

---

## 7 — Screenshot Readiness Checklist

For **landing and product marketing screenshots**, verify:

- **Dashboard view**
  - KPIs visible (revenue, profit, units, etc.) with realistic numbers.  
  - No debug overlays, no empty cards.

- **Suppliers view**
  - Supplier list/grid shows multiple suppliers with different types/countries.  
  - Columns fit well; no truncated or overlapping text.

- **Orders / workflow view**
  - Purchase orders are visible with various statuses.  
  - Any workflow / timeline components show progression clearly.

- **Decision dashboard / alerts**
  - At least a few decision / alert entries are present.  
  - Titles and reasons are short and meaningful.

- **Global UI consistency**
  - Same theme as the current landing and app.  
  - No dev / admin‑only labels visible (e.g. debug IDs, environment labels).

When in doubt, regenerate demo data, refresh and re‑validate before capturing.

---

## 8 — Safety Rules

Non‑negotiable rules:

- **Never seed production users automatically.**  
  - Demo seed tools must remain manual or DEV‑only, never run on login or on first use in production.

- **Never use real customer data in demos or screenshots.**  
  - All demo content must be synthetic and clearly generic.

- **Never expose internal debug or admin‑only surfaces in external demos.**  
  - DevSeed pages, raw SQL consoles, or feature flags UIs are internal only.

- **Always clear stale demo data before a new capture session.**  
  - Use `clearDemoData()` (via DevSeed UI) to remove old demo rows, then regenerate.

- **Do not run SQL demo scripts on production databases.**  
  - `seed_dev_data.sql` i `demo_seed.sql` són exclusivament per a DEV / staging.

---

## 9 — Final Recommendation

Recommended default workflow for the team:

- **Use the existing demo seed tools** (`generateDemoData`, DevSeed UI, SQL scripts en DEV) instead of creating ad‑hoc data via manual entry.
- **Keep demo data curated**  
  - Treat supplier names, PO statuses, decision reasons and KPI ranges as part of the product story.
- **Regenerate before important demos**  
  - Clear + regenerate demo data to avoid drift, stale records or inconsistent states.
- **Treat demo quality as part of the product**  
  - Landing, screenshots and live demos are often the first and only contact people have with FREEDOLIAPP; keep the demo workspace in a state that reflects the real value of the product.

