# FASE 2 CBA — Arquitectura final (SaaS Readiness)

**Versió:** 1.0  
**Estat:** Tancat — decisions de disseny i implementació lockades.  
**Relació:** Basat en `FASE2_IMPLEMENTATION_LOCK_CBA.md`; complementat per docs D2/D3.

---

## 1. Context

La FASE 2 (CBA — Commercial Billing & Access) converteix Freedoliapp en un producte SaaS venible:

- **Abans (post S1.22):** Multi-tenant per `org_id`, RLS per `is_org_member(org_id)`, sense control de billing ni límits de places.
- **Després (post FASE 2):** Billing vinculat a org (Stripe), gating per estat de facturació, enforcement de places via RPC, workspace context al frontend i pantalles de bloqueig (locked / over-seat) amb i18n.

Cap canvi estructural al model multi-tenant (tenant = `org_id`); només s’afegeixen capes de billing, RLS gating, RPC de places i UX de gating.

---

## 2. Decisions tancades

| # | Decisió | Detall |
|---|---------|--------|
| 1 | **Source of truth billing** | L’única font que escriu camps de billing a `orgs` és el **webhook Stripe**. Cap endpoint de checkout/portal escriu a la DB. |
| 2 | **Billing “billable”** | Accés permès només si `billing_status IN ('trialing', 'active')`. `past_due` i `canceled` bloquegen dades tenant (excepte lectura owner per recuperació). |
| 3 | **Over-seat** | No es resol a RLS. Es resol a **RPC** `org_add_member`: si `seats_used >= seat_limit` → error `seat_limit_reached`. La UI redirigeix a over-seat. |
| 4 | **Owner excepció RLS** | Owner/admin poden **SELECT** a `orgs` i `org_memberships` encara que billing estigui bloquejat (per anar a billing i recuperar). INSERT/UPDATE/DELETE a tenant-data requereixen `org_billing_allows_access(org_id)`. |
| 5 | **Workspace storage** | `active_org_id` es persisteix a `localStorage` amb clau `freedoli_active_org_id`. Bootstrap valida contra `org_memberships`; fallback: org owner o primera per `created_at`. |
| 6 | **Idioma billing UI** | Idiomes suportats: `ca`, `en`, `es`. Clau localStorage: `freedoli_lang`. Default: `ca`. Tots els textos nous de billing passen per `t(lang, key)`. |
| 7 | **Stripe 1:1** | Una org = un Stripe Customer (opcional fins al primer checkout). Una subscripció activa = un `stripe_subscription_id` per org. |

---

## 3. Contractes de dades

### 3.1 Taula `public.orgs` (camps billing)

| Camp | Tipus | Nullable | Default | Notes |
|------|--------|----------|---------|--------|
| `billing_status` | `billing_status_enum` | NO | `'trialing'` | Valors: `trialing`, `active`, `past_due`, `canceled` |
| `plan_id` | text | SÍ | NULL | Stripe Price ID |
| `seat_limit` | integer | NO | 1 | CHECK `>= 1` |
| `trial_ends_at` | timestamptz | SÍ | NULL | Fi de trial |
| `stripe_customer_id` | text | SÍ | NULL | UNIQUE (partial index WHERE NOT NULL) |
| `stripe_subscription_id` | text | SÍ | NULL | UNIQUE (partial index WHERE NOT NULL) |

### 3.2 Taula `stripe_webhook_events`

| Camp | Tipus | Notes |
|------|--------|--------|
| `id` | text PK | `event.id` de Stripe (idempotència) |
| `created_at` | timestamptz | default now() |
| `type` | text | tipus d’event |
| `org_id` | uuid | opcional, omplert en processar |
| `stripe_customer_id` | text | opcional |
| `stripe_subscription_id` | text | opcional |

RLS: accés només via service role (anon/authenticated revocats).

---

## 4. Fluxos (diagrames textuals)

### 4.1 Flux global FASE 2

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           FRONTEND (React)                               │
│  WorkspaceContext (activeOrgId) → AppContent → Billing Gate              │
│       │                                    │                             │
│       │                                    ├─ billing_status NOT ok      │
│       │                                    │  → /app/billing/locked       │
│       │                                    ├─ seats_used > seat_limit     │
│       │                                    │  → /app/billing/over-seat    │
│       │                                    └─ ok → Sidebar + app routes   │
│       │                                                                   │
│       └─ Queries tenant: .eq('org_id', activeOrgId)                       │
└─────────────────────────────────────────────────────────────────────────┘
         │
         │  POST /api/stripe/create-checkout-session | create-portal-session
         │  (owner/admin only; Bearer JWT)
         ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     VERCEL SERVERLESS (API)                              │
│  Checkout/Portal → retornen URL (no escriuen a orgs)                     │
│  Webhook → verifica signatura, idempotència (stripe_webhook_events),     │
│            actualitza orgs (service role)                                 │
└─────────────────────────────────────────────────────────────────────────┘
         │
         │  Supabase client (JWT) / service role (webhook)
         ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     SUPABASE (PostgreSQL + RLS)                           │
│  RLS: is_org_member(org_id) AND org_billing_allows_access(org_id)        │
│       [+ excepció owner SELECT a orgs / org_memberships]                  │
│  RPC: org_add_member → comprova seat_limit; INSERT org_memberships       │
└─────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Bootstrap workspace

```
1. Llegir freedoli_active_org_id de localStorage
2. Obtenir org_memberships de l’usuari (Supabase)
3. Si stored ID és membre → confirmar activeOrgId
4. Si no → fallback: org amb role=owner, o primera per created_at
5. Persistir activeOrgId; isWorkspaceReady = true
6. AppContent carrega org (billing_status, seat_limit), compte seats_used
7. Si !billingOk → gate 'locked'; si overSeat → gate 'over_seat'; sinó allowed
```

### 4.3 Webhook → actualització orgs

```
1. Rebre POST /api/stripe/webhook (raw body)
2. Verificar signatura (Stripe-Signature + STRIPE_WEBHOOK_SECRET)
3. INSERT stripe_webhook_events (id = event.id) → si 23505 (unique) → return 200 duplicate
4. Segons event.type:
   - checkout.session.completed → extreure org_id (metadata/client_reference_id),
     customer, subscription → UPDATE orgs (stripe_customer_id, stripe_subscription_id,
     billing_status, plan_id, seat_limit, trial_ends_at)
   - customer.subscription.updated/deleted → idem
   - invoice.payment_failed → billing_status = past_due
   - invoice.payment_succeeded → billing_status = active (si cal)
5. UPDATE stripe_webhook_events amb org_id, stripe_* (opcional)
```

---

## 5. Edge cases

| Cas | Comportament |
|-----|--------------|
| Usuari expulsat de l’org | Bootstrap: stored `active_org_id` no és a memberships → fallback a altra org; sense loop. |
| Org sense membres | No cobert per RLS; lògicament no hauria d’existir (s’ha de tenir almenys owner). |
| Checkout sense stripe_customer_id | Checkout no escriu a DB; webhook en completar sessió omple stripe_customer_id. |
| Portal sense stripe_customer_id | API retorna 400 “No customer yet”; frontend mostra CTA “Start subscription”. |
| Duplicat event webhook | Insert-first a stripe_webhook_events; 23505 → 200 duplicate, no re-processar. |
| Canvi d’idioma | `freedoli_lang` a localStorage; pantalles billing usen `t(lang, key)`. |
| Over-seat existent | RLS no ho evita; la UI redirigeix a over-seat; owner pot obrir portal o reduir membres. Afegir nous membres bloquejat per RPC. |

---

## 6. Definition of Done (FASE 2 CBA)

- [x] Camps billing a `orgs` (migració PAS 1)
- [x] Funció `org_billing_allows_access(org_id)` i policies RLS amb gating + excepció owner (PAS 2)
- [x] Taula `stripe_webhook_events` i endpoints checkout / portal / webhook (PAS 3)
- [x] Webhook: raw body, idempotència insert-first, metadata org_id a sessions/subscriptions
- [x] WorkspaceContext amb `activeOrgId`, bootstrap, `setActiveOrgId`, persistència (PAS 4)
- [x] RPC `org_add_member` amb comprovació seat_limit (PAS 4)
- [x] Billing gate a AppContent; rutes `/app/billing/locked` i `/app/billing/over-seat` (PAS 5)
- [x] Pantalles BillingLocked i BillingOverSeat amb CTAs (portal / checkout / settings)
- [x] i18n base: `messages.js`, `t()`, `useLang()`; tots els textos nous via `t()` (PAS 5)
- [x] Documentació QA: `FASE2_CBA_QA_FINAL.md`; documentació tècnica (aquest conjunt de docs)

---

## 7. Relació amb altres documents

| Document | Ubicació | Relació |
|----------|----------|---------|
| FASE2_IMPLEMENTATION_LOCK_CBA | docs/D0 | Especificació original; aquest doc n’és el resum arquitectònic final. |
| FASE2_CBA_QA_FINAL | docs/D0 | Checklist QA i GO/NO-GO. |
| ROADMAP_MASTER_POST_S1.22 | docs/D0 | Baseline pre-FASE 2; FASE 2 és la primera fase del roadmap. |
| BILLING_MODEL | docs/D2 | Model de dades i enum billing. |
| RLS_BILLING_GATING | docs/D2 | Detall de policies i funció org_billing_allows_access. |
| SEAT_ENFORCEMENT_RPC | docs/D2 | RPC org_add_member i contracte. |
| WORKSPACE_CONTEXT | docs/D3 | Frontend: bootstrap, switch, storage. |
| BILLING_GATING_UI | docs/D3 | Gate a AppContent, pantalles locked/over-seat. |
| I18N_BASE_SYSTEM | docs/D3 | Sistema t() / useLang / messages per billing. |

---

*Document tancat. No es modifica codi des d’aquest document; només es refereix a decisions ja implementades.*
