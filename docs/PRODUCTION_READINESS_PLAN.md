# FREEDOLIAPP — Production Readiness Plan (SaaS)

## 0) Definició de “PRODUCCIÓ” (no opinions)
**Producció =** pots tenir 2 clients pagant i:
- cap pot veure dades de l’altre (RLS real)
- billing pot bloquejar accés
- logs + audit mínim per investigar incidents
- integritat financera bàsica (POs)
- deploys no trenquen dades

**Regla d’or:** abans de créixer funcionalitats, tanquem seguretat + dades + billing.

---

## 1) Gating de producció (Go/No-Go)
### GO quan:
1. **Multi-tenant complet:** totes les taules de client tenen `org_id` i RLS per org.
2. **Zero “Allow all”** en taules de client.
3. **Billing actiu:** org amb `billing_status=active` pot entrar; la resta, bloquejada.
4. **Integritat PO:** `items` validat server-side + `total_amount` protegit.
5. **Audit mínim:** log de creació i canvis d’estat de PO.
6. **Observabilitat mínima:** errors frontend capturats + RPC failures visibles.

### NO-GO si:
- queda una taula “client-data” amb `Allow all`
- un usuari pot canviar `total_amount` a mà via API i queda
- billing no talla res

---

## 2) Roadmap de Producció (ordre obligatori)

### S1 — SECURITY FINISH (Multi-tenant real)
**Objectiu:** data isolation inviolable.

#### S1.1 Classificar taules (tenant-data vs reference)
- Tenant-data (ha de portar `org_id` + RLS):
  - documents, expenses/incomes/payments
  - inventory + movements + warehouses
  - tasks + sticky_notes
  - project_events + app_events + audit_log
  - orders/order_items/sales/listings/stock
  - alerts_*, dashboard_preferences, signatures, po_shipments, po_amazon_readiness, product_identifiers, etc.
- Reference-data (pot ser global):
  - catàlegs estàtics (p.ex. project_phases) **si realment no són per client**

**Deliverable:** llista tancada de taules “tenant-data”.

#### S1.2 Afegir `org_id` + backfill
- Afegir `org_id` nullable
- Backfill via:
  - `user_id` si existeix
  - o via `project_id` (herència)
  - o via FK a taula parent que ja tingui `org_id`

Després:
- `org_id NOT NULL`
- FK a `orgs(id)`
- índex `org_id`

#### S1.3 RLS base homogènia
- Activar RLS a totes les tenant-data
- Policies: `is_org_member(org_id)` per CRUD
- Eliminar policies duplicades i “Allow all”

**Definition of done:** provar amb 2 orgs i 2 usuaris que no hi ha fuites.

---

### S2 — APP WORKSPACE CONTEXT
**Objectiu:** UX per treballar amb múltiples orgs (agencies + equips).

- `active_org_id` guardat (DB o localstorage + validació)
- selector d’org
- queries filtrades per org (sense confiar-hi per seguretat; la seguretat és RLS)

---

### S3 — BILLING HYBRID (Stripe)
**Objectiu:** cobrar i controlar accés.

#### Model
- Stripe Customer = org
- Stripe Subscription = org (pla base)
- Seats = quantity (add-on o metered) segons pla

#### DB mínim
`orgs` ha de tenir:
- `billing_status` (trialing|active|past_due|canceled)
- `plan_id`
- `seat_limit`
- `seats_used` (derivat de memberships)
- `trial_ends_at`

#### Webhooks
- `customer.subscription.created/updated/deleted`
- `invoice.paid`, `invoice.payment_failed`

#### Gating
- Middleware a app (i opcional a RPC) que bloqueja:
  - si `billing_status != active` (excepte owner en mode “billing portal”)
- En membership insert:
  - bloquejar si excedeix `seat_limit`

---

### S4 — PO HARDENING (per vendre sense embolics)
**Objectiu:** POs consistents i auditables.

- Validació server-side de `items` (JSONB)
- Protegir `total_amount`:
  - o recalcular server-side
  - o validar i rebutjar discrepància
- Immutabilitat:
  - `draft`: editable
  - `sent/confirmed`: bloquejar update de `items/total_amount/buyer_info/currency/supplier_id`
- Audit:
  - `purchase_orders_audit` per CREATE + STATUS_CHANGE + UPDATE (si permès)

---

### S5 — OBSERVABILITY + OPS
**Objectiu:** no volar a cegues.

- Error tracking (Sentry)
- Logs d’RPC (minim: errors + temps)
- Alarmes bàsiques:
  - spikes de creació POs
  - errors de PDF/logo
- Rate limiting (RPC bulk)

---

## 3) QA de Producció (checklist operatiu)
1) Crear 2 orgs, 2 usuaris, dades en ambdues.
2) Verificar: cap query retorna files de l’altra org (taules clau).
3) Crear PO en org A, generar PDF.
4) Canviar `company_settings.logo_url` i regenerar PDF:
   - PO nova ha de conservar snapshot (buyer_info.logo_url)
5) Billing:
   - org amb status past_due: bloqueig d’accés
   - seat_limit: no permet afegir membres extra
6) Bulk sample POs:
   - idempotència (no duplica)
   - transacció (o resultat consistent)

---

## 4) Regles no negociables
1) No entra res a prod sense `org_id` en tenant-data.
2) No existeix “Allow all” en tenant-data.
3) Billing talla accés (sinó no és SaaS).
4) POs: integritat server-side, no “confio en la UI”.
5) Tot canvi crític té verifications SQL + smoke tests.

---

## 5) Resultat final
Quan S1–S3 estan fets:
- pots vendre (hybrid)
- pots créixer (agencies)
- pots dormir (RLS i billing no són “decoració”)