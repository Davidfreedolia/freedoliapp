# Demo Seed Generator

## Overview

The Demo Seed Generator (`/dev/seed`) creates a complete set of demo data (10 full projects) to see Freedoliapp populated with varied states and realistic data.

## Access

- **Route**: `/dev/seed`
- **Environment**: Only available in development mode (`VITE_APP_ENV === 'development'` or `MODE === 'development'`)
- **Authentication**: Protected route (requires login)

## Setup

Before using the seed generator, run the SQL script to add the `is_demo` column to relevant tables:

```sql
-- Execute in Supabase SQL Editor
demo-seed-setup.sql
```

This adds `is_demo boolean DEFAULT false NOT NULL` to:
- `projects`
- `suppliers`
- `gtin_pool`
- `sticky_notes`

## Usage

1. **Navigate to `/dev/seed`** in your browser (only in development)
2. **Type "DEMO"** in the confirmation field
3. **Click "Generate Demo Data"**
4. If demo data already exists, you'll be prompted to "Clear and regenerate"

## What Gets Created

### 1. Projects (10)
- Phases: 1-7 (varied)
- Decisions: GO (5), HOLD (2), DISCARDED (2), null (1)
- Project codes: `DEMO-PR-000001` through `DEMO-PR-000010`
- Status: active (except DISCARDED = inactive)

### 2. Suppliers (8)
- 5 manufacturers (ratings 3-5)
- 2 freight/forwarders
- 1 inspection/other
- Varied incoterms (FOB, FCA, EXW)
- Varied payment terms (T/T 30%, L/C at sight, Net 30)

### 3. GTIN Pool (80 GTINs)
- Mix of EAN/UPC
- Status: 60 available, 20 assigned
- Assigned to 6 projects (4 projects without GTIN)

### 4. Product Identifiers
- 6 projects: Complete (gtin_type + gtin_code + fnsku + asin)
- 4 projects: Missing (to trigger "Not Amazon Ready" warnings)

### 5. Supplier Quotes
- 3 projects: 2 quotes each (6 total)
- Price breaks: 500/1000/2000 qty
- First quote: Better price but higher MOQ/lead time
- Second quote: Higher price but lower MOQ/faster lead time
- Forces interesting comparison in QuotesSection

### 6. Purchase Orders (9 POs)
- 6 projects with POs (1-2 POs each)
- States: draft, confirmed, in_production, shipped, received
- Items: JSONB with units, price, totals

### 7. Amazon Readiness
- 3 POs: Complete (all fields)
- 3 POs: Incomplete (missing fields to trigger "Not Amazon Ready" widget)
  - Missing: units_per_carton, cartons_count, dimensions, weight

### 8. Manufacturer Pack Tracking
- 4 POs: `manufacturer_pack_generated_at` set
- 2 of these: `manufacturer_pack_sent_at` set
- Versions: v1/v2 mixed

### 9. Shipments (4)
- 1 planned (pickup future)
- 2 in_transit (ETA future)
- 1 delivered (ETA past + delivered)
- Tracking numbers: Fake but coherent format

### 10. Tasks (25)
- Distributed across: projects, POs, suppliers, shipments
- Status: open (9), done (8), snoozed (8)
- Due dates: today (8), +3 days (8), +10 days (9)
- 5 tasks created from sticky notes (`source='sticky_note'`)

### 11. Sticky Notes (15)
- 8 open+pinned (visible in overlay)
- 4 done
- 3 converted to tasks (`linked_task_id` set, `converted_to_task_at` set)

## Safety Features

### Idempotent
- All data marked with `is_demo=true`
- Clear checks for existing demo data
- Option to "Clear and regenerate" if demo data exists

### Reversible
- "Clear demo data" button removes ALL demo data
- Deletes in correct order (respects foreign keys)
- No impact on real data (only `is_demo=true` is deleted)

### Isolation
- All demo data clearly marked
- Real data untouched
- Can coexist with real data safely

## Clear Demo Data

The "Clear Demo Data" button:
1. Deletes in order (respects FK dependencies):
   - decision_log
   - tasks
   - sticky_notes
   - po_shipments
   - po_amazon_readiness
   - purchase_orders
   - supplier_quote_price_breaks
   - supplier_quotes
   - product_identifiers
   - gtin_pool (releases assignments, then deletes demo GTINs)
   - projects
   - suppliers

2. Only deletes data with `is_demo=true` (or linked to demo projects/POs)

## What to See After Seed

### Dashboard
- **Stats**: Should show 10 total projects (8 active, 2 discarded)
- **Waiting Manufacturer Widget**: 2 POs (generated but not sent)
- **POs Not Amazon Ready Widget**: 3 POs (missing fields)
- **Shipments In Transit Widget**: 2 shipments
- **Research No Decision Widget**: 1 project (phase 1, no decision)
- **Tasks Widget**: ~17 open tasks (25 total - 8 done)

### Calendar
- **Tasks**: 25 events
- **Shipments**: 8 events (4 shipments × 2 events each: pickup + ETA)
- **Manufacturer Packs**: 8 events (4 POs × 2 events each: generated + sent)
- **Quotes**: 0 events (no validity_date set in demo)

### Projects List
- 10 projects (8 visible by default, 2 discarded hidden)
- Varied phases and decisions
- Check "Show discarded" to see all 10

### Sticky Notes Widget
- 8 open+pinned notes (visible in overlay)
- 3 notes with "Task linked" badge

## Notes

- All demo data uses `DEMO-` prefix in codes/names
- GTIN codes are fake (generated random numbers)
- Tracking numbers are fake but format-valid
- Supplier emails are fake (`contact@democompany.com`)
- Phone numbers are fake (`+1-555-XXXX`)







