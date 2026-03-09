# D43 — FREEDOLIAPP Architecture Map

Status: Draft

---

## 1. Purpose

Provide a **global architecture map** of FREEDOLIAPP, showing:

- The main subsystems.
- Their responsibilities and boundaries.
- The dependencies between them.
- Pointers to the primary architecture documents (D-series).

This document is **read-only architecture**: it does not introduce any code or schema changes.

---

## 2. High-level Subsystems

FREEDOLIAPP is organized into several major subsystems:

1. **Core Platform**
2. **Decision System**
3. **Helper / Assistant System**
4. **Finance / Profit Engine**
5. **Inventory & Supply System**
6. **Amazon Integration**

Each subsystem has a clear responsibility and interacts with others through defined contracts.

---

## 3. Core Platform

The Core Platform provides the **foundation** for all other subsystems.

Responsibilities:

- Multi-tenant model:
  - `orgs`, `org_memberships`.
  - Tenant boundary: `org_id`.
- Authentication and identity:
  - Auth providers, workspace relationships (D26–D28).
- Database & RLS:
  - Canonical RLS model (D2, D3).
  - Billing gating and seat enforcement (D8–D12, FASE 2 CBA).
- Frontend shell:
  - Routing (`/app/*`), sidebar, dashboard.
- Stripe billing & workspace lifecycle:
  - Billing engine, feature gating (D10–D12).

Key docs:

- `D1` — Architecture Overview.
- `D2` — Database & RLS Model.
- `D3` — Multi-tenant Contract.
- `D10–D12` — Product Core & Billing Architecture.

All other subsystems inherit multi-tenancy, auth, and RLS from the Core Platform.

---

## 4. Decision System

The Decision System turns **operational data** into **actionable decisions**.

Components (see D32–D40):

1. **Decision Engine (D32)**  
   - Canonical tables:
     - `decisions`
     - `decision_context`
     - `decision_sources`
     - `decision_events`
   - Defines decision lifecycle and structure.

2. **Decision Bridge (D33)**  
   - Integrates engines (e.g. Reorder Engine) with the Decision Engine.
   - Maps outputs to canonical decisions.

3. **Decision Scheduler (D34)**  
   - Edge Function `decision-scheduler` + cron.
   - Periodically runs sync integrations per org.

4. **Decision Inbox (D35–D36)**  
   - `/app/decisions` page, list + detail UI, lifecycle actions.
   - Service layer over canonical tables.

5. **Decision Notifications (D37)**  
   - Architecture for in-app badge/topbar and future digests.

6. **Decision Automation (D38)**  
   - Architecture for recommendation → assisted → automated actions.

7. **Decision Analytics (D39)**  
   - Metrics and aggregation model for decision effectiveness.

8. **Decision System Overview (D40)**  
   - Consolidated view of the decision stack.

Dependencies:

- Reads from:
  - Finance/Profit, Inventory, Amazon subsystems (via engines) as signal sources.
- Writes to:
  - Canonical decision tables only (no direct modifications to finance/stock).

---

## 5. Helper / Assistant System

The Helper / Assistant System focuses on **user-initiated interactions**:

Components (D41–D42):

1. **Intake Layer (D41)**  
   - Normalizes helper/assistant inputs into:
     - `intent_type`, `topic`, `priority`.
   - Captures context (page, entity, org, user).

2. **Intake Data Model (D42)**  
   - Conceptual entities:
     - `assistant_sessions`
     - `assistant_messages`
     - `assistant_intents`
     - `assistant_queries`
     - `assistant_resolutions`
   - Designed for:
     - Traceability.
     - Multi-tenant safety.
     - Future routing to decisions/alerts/tasks.

Responsibilities:

- Capture and classify **what users ask for**.
- Provide a future bridge from:
  - Natural-language intent → decisions / tasks / navigation.

Separation from Decision System:

- Decision System is **engine-driven** (system outputs).
- Helper/Assistant System is **user-driven** (intake and guidance), though they may link via references.

---

## 6. Finance / Profit Engine

This subsystem provides **financial truth**:

Responsibilities:

- Financial ledger and events (F1–F4).
- Profit & margin computation:
  - `Profit Truth Engine` (D13).
- Cashflow forecasting:
  - Cashflow Engine (D17).

Role in the architecture map:

- Supplier of signals to:
  - Decision System (e.g. `profit_risk`, `cash_warning` decisions).
- Consumer of:
  - Core Platform (auth, orgs, RLS).

Key docs:

- F-series docs for ledger and settlement ingestion.
- `D13` — Profit Truth Engine.
- `D17` — Cashflow Engine (architecture).

---

## 7. Inventory & Supply System

This subsystem manages **inventory state and supply network**:

Responsibilities:

- Inventory ledger:
  - Movements and snapshots (D31).
- Supply network:
  - `supply_origins`, `supply_destinations`, `supply_routes`, `supplier_origin_links` (D29).

Role:

- Provides:
  - `stock_on_hand`, `incoming_units`, `lead_time`, and supply routes to engines.
- Enables:
  - Reorder and stock-risk decisions via the Decision System.

Key docs:

- `D29` — Global Supply Network Model + Data Model.
- `D31` — Inventory Ledger Architecture + Schema.

---

## 8. Amazon Integration

Handles **connectivity with Amazon Seller Central**:

Responsibilities:

- SP-API and CSV ingestion (F7).
- Settlement ingestion and normalization.
- Sync of:
  - Orders, sales, fees, and settlements.

Role:

- Data source for:
  - Finance/Profit Engine.
  - Inventory & Supply System.
  - Eventually Decision System (e.g. Amazon-specific decisions).

Key docs:

- F7 / D4 tracking architecture.
- Amazon integration-specific architecture docs.

---

## 9. Dependencies Between Subsystems

High-level dependency map:

- **Core Platform**  
  - ↑ Underpins **all** subsystems (multi-tenant, auth, RLS, billing).

- **Amazon Integration**  
  - → Feeds **Finance / Profit Engine** and **Inventory & Supply System** with marketplace data.

- **Finance / Profit Engine** + **Inventory & Supply System**  
  - → Provide canonical metrics to **Decision System** (via engines and the Decision Bridge).

- **Decision System**  
  - → Exposes decisions to users via:
    - Decision Inbox.
    - Dashboard widgets.
    - Future notifications/automation/analytics.

- **Helper / Assistant System**  
  - ↔ Interacts with:
    - Core Platform (context, users, orgs).
    - Decision System (e.g. linking user queries to decisions).
    - Potentially Finance/Inventory for explanatory queries.

All dependencies must:

- Respect org isolation.
- Use canonical tables/engines rather than duplicating logic.

---

## 10. Domain Boundaries

The architecture enforces clear **domain boundaries**:

1. **Core vs Feature Domains**  
   - Core Platform does not embed business-specific logic (e.g. reorder thresholds).
   - Feature domains (Finance, Inventory, Decisions) build on Core.

2. **Decisions vs Data Sources**  
   - Decision System consumes **signals** from data sources.
   - It does not own underlying financial or inventory data.

3. **Helper/Assistant vs Decisions**  
   - Helper/Assistant captures and interprets user intent.
   - Decisions represent **system recommendations**, even when triggered by assistant requests.

4. **Automation vs Engines**  
   - Engines compute metrics and candidate actions.
   - Automation governs **when** and **how** actions are executed or proposed, based on decisions.

These boundaries reduce coupling and make the system easier to evolve.

---

## 11. Links to Key Architecture Documents (D32–D42)

Decision System:

- `D32` — Decision Engine Architecture  
- `D33` — Decision Engine Integration  
- `D34` — Decision Scheduler  
- `D35` — Decision Inbox (Model)  
- `D36` — Decision Inbox Implementation  
- `D37` — Decision Notifications  
- `D38` — Decision Automation  
- `D39` — Decision Analytics  
- `D40` — Decision System Overview  

Helper / Assistant:

- `D41` — Helper + Virtual Assistant Intake Layer  
- `D42` — Helper / Assistant Intake Data Model  

Inventory & Supply:

- `D29` — Global Supply Network Model & Data Model  
- `D31` — Inventory Ledger Architecture & Schema  

Finance / Profit:

- `D13` — Profit Truth Engine  
- `D17` — Cashflow Engine (architecture)  

Amazon Integration & Core:

- F7 / tracking/ingest docs for Amazon.
- `D1`, `D2`, `D3`, `D10–D12` for platform and billing core.

---

## 12. Definition of Done (D43)

D43 is considered complete when:

- [x] All major subsystems (Core Platform, Decision System, Helper/Assistant, Finance/Profit, Inventory/Supply, Amazon Integration) are described.
- [x] Dependencies between these subsystems are mapped.
- [x] Responsibilities and domain boundaries are clearly articulated.
- [x] The relationship between decision tables (`decisions`, `decision_context`, `decision_sources`, `decision_events`) and other subsystems is explained at a high level.
- [x] Links to the main architecture documents (D32–D42) are provided.

No code or schema changes are part of D43; it is an architectural map and reference.

---

