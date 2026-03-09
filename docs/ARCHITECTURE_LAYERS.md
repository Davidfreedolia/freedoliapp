# FREEDOLIAPP — Architecture Layers Model

Status: Stable  
Purpose: Define the layered architecture that governs how the system evolves.

---

# 1 Core Principle

Freedoliapp evolves **by architectural layers, not by isolated features**.

Every new capability must belong to a specific layer.

No feature should bypass the canonical data model or engines.

---

# 2 Layer Overview

Freedoliapp architecture is composed of six layers.

## 1 Infrastructure Layer

Responsible for platform foundations.

Includes:

- Supabase
- PostgreSQL
- Row Level Security (RLS)
- org_id multi-tenant boundary
- Stripe billing
- feature gating
- Edge Functions
- deployment infrastructure

Rule:

Infrastructure is modified only for platform stability or security.

---

## 2 Canonical Data Layer

Defines the **core business entities** of the system.

Examples:

- orgs
- org_memberships
- projects
- suppliers
- purchase_orders
- inventory
- inventory_movements
- sales
- expenses
- ledger

Rules:

- All tenant data must contain `org_id`
- No parallel data models allowed
- All external data must be normalized into canonical tables

---

## 3 Ingestion Layer

Handles **external data sources**.

Examples:

- Amazon SP-API ingestion
- CSV imports
- future integrations (Shopify, eBay, etc.)

Responsibilities:

- fetch external data
- normalize to canonical schema
- maintain idempotent ingestion

Important:

External integrations **never bypass canonical tables**.

---

## 4 Engines Layer

Core business intelligence engines.

Examples:

- Profit Engine
- Cashflow Engine
- Reorder Engine
- Alerts Engine

Characteristics:

- operate on canonical data
- contain core decision logic
- must remain deterministic and testable

---

## 5 Application Layer

Operational modules used by the user.

Examples:

- Projects
- Suppliers
- Purchase Orders
- Inventory
- Finances
- Alerts

Responsibilities:

- orchestrate workflows
- provide interaction with engines

No critical financial logic should live here.

---

## 6 Experience Layer

User interface and visualization.

Examples:

- dashboards
- widgets
- alerts display
- reporting

Responsibilities:

- present information
- trigger workflows
- never contain business logic

---

# 3 Data Flow Model

External systems must follow this path:

External Source  
↓  
Ingestion Layer  
↓  
Canonical Data Layer  
↓  
Engines Layer  
↓  
Application Layer  
↓  
Experience Layer

This guarantees consistency across the platform.

---

# 4 Future Integrations Rule

Future channels (Shopify, dropshipping, etc.) must be implemented **only in the Ingestion Layer**.

They must:

- import data
- normalize it
- feed existing engines

They must NOT create new financial engines.

---

# 5 Architectural Guardrails

All new features must answer:

1. Which layer does this belong to?
2. Does it reuse canonical entities?
3. Does it reuse existing engines?

If the answer is unclear, the feature design must be reconsidered.

---

# 6 Long-Term Benefit

This layered architecture allows FREEDOLIAPP to support:

- Amazon
- Shopify
- Dropshipping
- Multichannel commerce

without fragmenting the core system.
