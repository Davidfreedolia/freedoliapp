# D3 — Multi-tenant Contract

Status: stable  
Owner: Lead Architect  
Last verified against: (run: `git rev-parse --short HEAD`) — post S1.20  
Related migrations: S1.0–S1.20  

---

## 1. Tenant Definition

Tenant = org

Cap dada de negoci fora d’org_id.

---

## 2. Mandatory Rules for Tenant Tables (contracte final post S1.20)

**Regla obligatòria per totes les taules noves amb dades tenant:**

- **org_id** uuid NOT NULL, FK → orgs(id)
- **Índex** en org_id: `CREATE INDEX idx_<table>_org_id ON public.<table>(org_id)`
- **RLS** enabled
- **Policies** basades en `is_org_member(org_id)` (USING i WITH CHECK). Prohibit: policies amb `auth.uid() = user_id` per dades tenant; prohibit allow_all en TENANT-DATA.

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
