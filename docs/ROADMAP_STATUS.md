# FREEDOLIAPP — ROADMAP STATUS

**Última actualització:** Post FASE 2 CBA (documentació tancada).  
**Responsable:** Product Owner.

---

## 1. Executive Snapshot

| Concepte | Estat |
|----------|--------|
| **Current Phase** | Entre fases — FASE 2 CBA tancada; cap fase activa formal. |
| **Overall Status** | Baseline SaaS estable: multi-tenant, billing gating, workspace i Stripe integrats. Mòduls funcionals (Projects, Suppliers, POs, GTIN, Settings) estables o need polish; Finances i Dashboard fràgils. |
| **SaaS Readiness Level** | **Alta** — Org-scoped data, RLS billing gating, seat enforcement, Stripe checkout/portal/webhook, pantalles locked/over-seat, i18n base per billing. Falta hardening financer i alertes de negoci per considerar-la “production-grade” completa. |
| **Monetization Status** | **Infraestructural ready** — Stripe connectat; webhook actualitza orgs; gating bloqueja accés si billing no actiu. Encara no desplegat monetització real (plans, preus) depenent de producte. |

---

## 2. Completed Phases

### FASE 0 — Consolidació financera
- Model de dades i fluxos bàsics de finances alineats amb operativa.
- Base per P&L i cashflow (pendent de completar a FASE 5).

### FASE 1 — Profit Amazon
- Integració amb mètrica de profit Amazon i lògica associada.
- Preparació per reporting i presa de decisions sobre vendes Amazon.

### FASE 2 — CBA (Workspace + Billing)
- **Workspace context:** `active_org_id` a localStorage (`freedoli_active_org_id`), bootstrap amb fallback (owner / primera org), `setActiveOrgId` amb navegació a `/app`, purge implícit de dades per canvi d’org.
- **Billing model:** Camps a `orgs` (billing_status, plan_id, seat_limit, trial_ends_at, stripe_customer_id, stripe_subscription_id); única escriptura via webhook Stripe.
- **RLS billing gating:** `org_billing_allows_access(org_id)`; policies tenant amb excepció owner per SELECT a orgs/org_memberships; INSERT/UPDATE/DELETE requereixen billing billable.
- **Stripe:** Endpoints checkout i portal (owner/admin); webhook amb idempotència (stripe_webhook_events) i actualització d’orgs.
- **Seat enforcement:** RPC `org_add_member` amb comprovació seat_limit; error `seat_limit_reached`; afegir membres només via RPC.
- **Billing gating UI:** Redirect a `/app/billing/locked` o `/app/billing/over-seat` segons billing_status i over-seat; pantalles BillingLocked / BillingOverSeat amb CTAs (portal, checkout, settings).
- **i18n base:** `messages.js` (en, ca, es), `t(lang, key)`, `useLang()`; tots els textos nous de billing via `t()`; storage `freedoli_lang`.

---

## 3. Active Phase

- **Cap fase activa** definida. Següent prioritat: triar entre FASE 3 (Business Alerts), FASE 5 (Finance Complete) o I18N Hardening segons prioritat de producte.

---

## 4. Next Phases

### FASE 3 — Business Alerts
- Alertes de negoci (ex.: POs bloquejades, vendes, stock, terminis).
- Notificacions i/o dashboard d’alertes per org.
- Definició de regles i canals (in-app, email, etc.) pendent.

### FASE 5 — Finance Complete
- P&L org-based robust.
- Cashflow real.
- PO hardening: validació JSONB, immutabilitat post-status, audit trail complet.
- Integritat financera garantida (no manipulació manual de total_amount, etc.).

### I18N Hardening
- Estendre el sistema `t()` / `useLang()` a més àmbits de l’app (no només billing).
- Unificar o coexistir amb react-i18next si cal.
- Selector d’idioma a la UI (opcional).
- Revisió de keys i cobertura ca/en/es.

---

## 5. Architectural Stability Level

| Àmbit | Nivell | Notes |
|-------|--------|--------|
| **Multi-tenant** | Estable | Tenant = `org_id`; RLS basat en `is_org_member(org_id)`; contracte tancat (docs D0/D2). |
| **Billing** | Estable | Model a `orgs`; source of truth = webhook; enum i camps documentats. |
| **RLS** | Estable | Billing gating + excepció owner; policies tenant actualitzades; no reobrir sense acord. |
| **Stripe** | Estable | Checkout, portal, webhook amb raw body i idempotència; metadata org_id; cap write a orgs fora webhook. |
| **Seat enforcement** | Estable | RPC `org_add_member`; no RLS; contracte i errors documentats. |
| **Workspace** | Estable | WorkspaceContext, bootstrap, storage, setActiveOrgId; integrat amb AppContent i billing gate. |
| **i18n base** | Estable (àmbit billing) | messages.js, t(), useLang(); billing screens 100% via t(). Resta de l’app parcial o sense aquest sistema. |

---

## 6. Risks & Tech Debt

- **Finances fràgil:** P&L i cashflow no robusts; PO amb risc de manipulació manual; cal FASE 5.
- **Dual i18n:** Coexistència react-i18next (part de l’app) i sistema propi (billing); possible fragmentació de keys i manteniment.
- **Stripe en producció:** Webhook i secrets han de ser correctes en prod; prova real de flux complet (checkout → webhook → orgs) recomanada abans de vendre.
- **Over-seat existent:** Si ja hi ha més membres que seat_limit (migració manual o històric), la UI redirigeix a over-seat; RPC evita afegir més; reduir places requereix gestió manual o portal.
- **Documentació dispersa:** Molts docs a `/docs`; INDEX/ROADMAP_STATUS ajuden; cal mantenir ROADMAP_STATUS actualitzat en canvis de fases.

---

## 7. Decision Log (High-Level)

Decisions estructurals que **no s’han de reobrir** sense acord explícit:

| # | Decisió | Data / Fase |
|---|---------|-------------|
| 1 | Tenant boundary = `org_id`; cap aïllament per `user_id` a dades de negoci. | Post S1.x / Multi-tenant |
| 2 | L’única font que escriu camps de billing a `orgs` és el webhook Stripe. | FASE 2 CBA |
| 3 | Billing “billable” = `billing_status IN ('trialing', 'active')`; past_due/canceled bloquegen accés tenant (excepte SELECT owner a orgs/org_memberships). | FASE 2 CBA |
| 4 | Over-seat no es resol a RLS; es resol a RPC `org_add_member` i a UI (redirect over-seat). | FASE 2 CBA |
| 5 | Workspace: `active_org_id` persisteix a `freedoli_active_org_id`; bootstrap valida contra org_memberships; fallback owner o primera org. | FASE 2 CBA |
| 6 | Idiomes billing (PAS 5): ca, en, es; storage `freedoli_lang`; textos nous de billing via `t(lang, key)`. | FASE 2 CBA |
| 7 | Una org = un Stripe Customer (opcional fins primer checkout); una subscripció activa per org. | FASE 2 CBA |

---

*Per detall tècnic de cada àmbit, veure `docs/D0/FASE2_CBA_ARCHITECTURE_FINAL.md` i els documents D2/D3 referenciats.*
