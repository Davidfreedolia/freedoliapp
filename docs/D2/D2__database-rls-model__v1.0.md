# D2 — Database & RLS Model

Status: stable  
Owner: Lead Architect  
Last verified against: (run: `git rev-parse --short HEAD`) — 2025-02-17  
Related migrations: S1.0–S1.7  
Related modules: D3, D8.x  

---

## 1. Scope

Defineix el model de base de dades real i el patró RLS aplicat.

---

## 2. Table Classification

### TENANT (org-scoped)
Totes les taules de negoci amb:
- org_id uuid NOT NULL
- FK → orgs(id)
- RLS ON

Inclou:
projects, suppliers, supplier_quotes, purchase_orders, health_runs,
product_variants, gtin_assignments, project_viability,
i totes les ampliades via S1.2.

### REFERENCE
- marketplaces
- alert_state

SELECT global authenticated.

---

## 3. RLS Pattern

SELECT:
USING (is_org_member(org_id))

INSERT / UPDATE:
WITH CHECK (is_org_member(org_id))

Admin ops:
is_org_owner_or_admin(org_id)

---

## 4. Migration Model

S1.0–S1.7 defineixen:
- org boundary
- backfill determinista
- enforce NOT NULL
- delete orphans (health_runs precedent)

---

## 5. Verification

- No org_id NULL
- No orphans
- RLS enabled
- Policies exist

---

## 6. Change Policy

Qualsevol nova taula TENANT ha de seguir aquest model.
