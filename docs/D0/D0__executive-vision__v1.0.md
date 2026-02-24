# D0 — Executive & Vision

Status: stable  
Owner: Lead Architect  
Last verified against: (run: `git rev-parse --short HEAD`) — 2025-02-17  
Related documents: D1, D2, D3  

---

## 1. What FREEDOLIAPP Is

FREEDOLIAPP is a multi-tenant SaaS system built on:

- React + Vite (frontend)
- Supabase (Postgres + RLS + Auth + Storage)

It manages the full operational lifecycle of product-driven businesses:

- Research
- Viability
- Suppliers
- Quotes
- Samples
- Purchase Orders
- Inventory
- GTIN
- Financial tracking
- Health monitoring

Tenant isolation is enforced at database level via org_id and RLS.

---

## 2. What FREEDOLIAPP Is NOT

- Not a microservices architecture
- Not a backend-heavy system
- Not dependent on custom APIs
- Not a marketplace platform
- Not a BI tool

The database is the enforcement layer.
The frontend is orchestration.

---

## 3. Core Design Principles

1. org_id is mandatory for tenant data
2. RLS is the primary security boundary
3. Migrations are evolutionary, not disruptive
4. No model duplication
5. Documentation lives in-repo as SSOT

---

## 4. Current Phase

S1 — Multi-tenant consolidation completed (S1.0–S1.7).

System is structurally tenant-safe.

---

## 5. Long-Term Direction

- Stabilize full org parity across modules
- Expand observability
- Maintain architectural simplicity
- Avoid backend complexity creep

---

## 6. Governance Rule

If a change affects:

- tenant boundary
- RLS
- org_id contract
- core architecture

Documentation must be updated in the same commit.
