# FREEDOLIAPP — ROADMAP MASTER (POST S1.22)

Versió: 1.0  
Estat: BASELINE ESTABLE  
Data: Post Multi-Tenant Hardening S1.22  

---

# 📌 1. RESUM EXECUTIU — ON SOM

Freedoliapp ha completat la transició estructural cap a arquitectura SaaS multi-tenant real.

Hem passat de:

- Model single-user amb RLS permissiva
- Policies `USING true`
- Aïllament basat parcialment en user

A:

- Tenant boundary definit per `org_id`
- Eliminació total del model híbrid user/org
- RLS homogènia basada en `is_org_member(org_id)`
- Zero "Allow all" en tenant-data
- Auditoria multi-org validada
- Baseline estable

A partir d'aquest punt:

No entrem en cirurgia estructural.
Entrem en evolució estratègica.

---

# 🧱 2. BASELINE TÈCNICA (POST S1.22)

## 2.1 Arquitectura

Frontend:
- React + Vite
- Supabase client

Backend:
- Supabase PostgreSQL
- REST + RPC
- RLS activat globalment

Tenant Boundary:
- `org_id` obligatori en totes les taules operatives

---

## 2.2 Contracte Multi-Tenant Definitiu

Regles no negociables:

1. Cap taula tenant-data sense `org_id`
2. `org_id UUID NOT NULL REFERENCES orgs(id)`
3. RLS activat en totes les tenant-data
4. Policies basades exclusivament en:

is_org_member(org_id)

5. `user_id` només per:
- created_by
- audit trail
- membership logic

Mai per aïllament de dades.

---

## 2.3 Estat DB

✔ org_id coherent  
✔ FKs consistents  
✔ Índexs sobre org_id  
✔ Policies legacy eliminades  
✔ Health tables bloquejades  
✔ Supabase push sense errors  

---

# 📊 3. ESTAT FUNCIONAL REAL

Classificació honesta.

---

## Projects  
NEEDS POLISH  
Flux funcional complet, però UX no totalment canònica.

## Suppliers  
STABLE  
CRUD sòlid i integració correcta amb POs.

## Quotes  
NEEDS POLISH  
Comparatives funcionals però millorables.

## Samples  
NEEDS POLISH  
Persistència correcta, UX no madura.

## Purchase Orders  
STABLE (estructural)  
FRÀGIL (financer)

Falta:
- Validació JSONB blindada
- Audit complet
- Immutabilitat estricta post-status

## Logistics  
INCOMPLETE  
Flux no representat visualment de forma clara.

## Finances  
FRÀGIL  
Sense P&L robust ni cashflow real.

## GTIN Pool  
STABLE

## Inventory  
NEEDS POLISH  
Moviments correctes però reporting millorable.

## Dashboard  
FRÀGIL  
Visual, però no orientat a decisió executiva real.

## Analytics  
INCOMPLETE

## Settings  
STABLE

---

# 🚀 4. ROADMAP ESTRUCTURAT

---

# FASE 2 — CBA (SaaS Readiness)

## Objectiu
Convertir Freedoliapp en producte comercial real.

## Scope
- Workspace context frontend
- active_org_id gestionat correctament
- Role-based UI
- Stripe billing
- Seat enforcement
- Billing gating

## Riscos
- Integració Stripe
- UX de bloqueig mal resolta

## Done
- Org amb billing inactive bloquejada
- Seat limit enforced
- Workspace selector funcional

---

# FASE 3 — Product Maturity

## Objectiu
Blindar finances i operacions.

## Scope
- PO hardening complet
- JSONB validation server-side
- Immutabilitat real
- Audit trail complet
- P&L org-based
- Cashflow

## Done
- No manipulació manual de total_amount
- Auditoria completa
- Integritat financera garantida

---

# FASE 4 — UX Canonical System

## Objectiu
Sistema visual coherent SaaS-grade.

## Scope
- Toolbar única
- Tokens visuals definitius
- Eliminació inconsistències
- Dashboard executiu

## Done
- Mateix patró visual a tota l'app

---

# FASE 5 — Performance & Observability

## Objectiu
No volar a cegues.

## Scope
- Error tracking (Sentry)
- Logs RPC
- Alertes bàsiques
- Índexs GIN JSONB
- Optimització queries

## Done
- Errors capturats
- Latència monitoritzada

---

# FASE 6 — Marketplace Integrations

## Objectiu
Avantatge competitiu real.

## Scope
- Amazon SP-API
- Sync vendes
- Sync inventari
- Alertes automatitzades

## Done
- Sync automàtic funcional
- Reconciliació inventari correcta

---

# 🎯 5. PRIORITAT EXECUTIVA

Prioritat clara:

FASE 2 — CBA (SaaS Readiness)

Sense billing, no hi ha SaaS.
Sense workspace selector, no hi ha multi-org usable.
Sense seat enforcement, no és vendible.

No toca UX.
No toca marketplace.
No toca embellir.

Primer:
- Workspace context
- Billing
- Seat control

Després, maduresa funcional.

---

# 📌 Conclusió

S1.22 tanca l'etapa de reparació estructural.

A partir d'ara:
Evolució estratègica controlada.

Freedoliapp passa de "eina interna robusta"
a
"SaaS comercialitzable".
