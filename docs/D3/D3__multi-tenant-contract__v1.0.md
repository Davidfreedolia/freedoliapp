# D3 — Multi-tenant Contract

Status: stable  
Owner: Lead Architect  
Last verified against: (run: `git rev-parse --short HEAD`) — 2025-02-17  
Related migrations: S1.0–S1.7  

---

## 1. Tenant Definition

Tenant = org

Cap dada de negoci fora d’org_id.

---

## 2. Mandatory Rules for Tenant Tables

- org_id uuid NOT NULL
- FK → orgs(id)
- index on org_id
- RLS enabled
- CRUD policies using helpers

---

## 3. Backfill Rules

Si taula té parent:
org_id := parent.org_id

Si no:
assignació via org_memberships.

Delete orphans si cal.

---

## 4. Migration Order

1. Add org_id nullable
2. Backfill
3. Enforce NOT NULL
4. Add RLS
5. Verify

---

## 5. Forbidden

- Taules noves sense org_id
- Duplicació de models
- Refactors massius sense motiu estructural
