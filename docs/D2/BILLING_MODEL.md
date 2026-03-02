# Model de billing (FASE 2 CBA)

**Versió:** 1.0  
**Àmbit:** Base de dades i contracte de dades de billing per org.

---

## 1. Context

El model de billing vincula cada **organització** (`public.orgs`) a l’estat de facturació i als identificadors de Stripe. Una org té un pla (opcional), un límit de places, dates de trial i, quan hi ha subscripció, un customer i una subscription a Stripe. Cap altre tipus d’entitat (usuari, projecte) té camps de billing; només l’org.

---

## 2. Decisions tancades

| # | Decisió | Detall |
|---|---------|--------|
| 1 | **Un customer per org** | `stripe_customer_id` és opcional fins al primer checkout; després és únic per org (UNIQUE partial). |
| 2 | **Una subscripció activa per org** | `stripe_subscription_id` és opcional; UNIQUE partial. No es modelen múltiples subscripcions simultànies. |
| 3 | **Estats billable** | Només `trialing` i `active` permeten accés a dades tenant. `past_due` i `canceled` bloquegen (RLS + UI). |
| 4 | **Default billing_status** | Migració defineix default `'trialing'` per permetre ús sense Stripe inicial. |
| 5 | **Seat limit** | Enter >= 1; validat per CHECK. El nombre de places en ús es calcula com COUNT(org_memberships) per org. |
| 6 | **Cap FK a Stripe** | `plan_id`, `stripe_customer_id`, `stripe_subscription_id` són text; no hi ha FK a taules externes. |

---

## 3. Contractes de dades

### 3.1 Enum `billing_status_enum`

Valors (PostgreSQL):

- `trialing` — en període de prova
- `active` — subscripció activa
- `past_due` — pagament pendent (bloqueig)
- `canceled` — subscripció cancel·lada (bloqueig)

No existeix valor `inactive` a l’enum; el default a la migració és `trialing`.

### 3.2 Taula `public.orgs` — camps billing

| Camp | Tipus | Nullable | Default | Constraints / índexs |
|------|--------|----------|---------|------------------------|
| `billing_status` | `billing_status_enum` | NO | `'trialing'` | — |
| `plan_id` | text | SÍ | NULL | Stripe Price ID (ex: `price_xxx`) |
| `seat_limit` | integer | NO | 1 | CHECK (seat_limit >= 1) |
| `trial_ends_at` | timestamptz | SÍ | NULL | — |
| `stripe_customer_id` | text | SÍ | NULL | UNIQUE WHERE NOT NULL |
| `stripe_subscription_id` | text | SÍ | NULL | UNIQUE WHERE NOT NULL |

### 3.3 Càlcul de places en ús

```
seats_used = COUNT(*) FROM org_memberships WHERE org_id = :org_id
```

Tots els membres (qualsevol rol) compten com una plaça. Over-seat: `seats_used > seat_limit`.

---

## 4. Fluxos

### 4.1 Origen de les dades

- **Escrites a `orgs` (billing):** Només des del **webhook Stripe** (serverless amb service role). Cap endpoint de checkout ni portal escriu a `orgs`.
- **Lectura:** Frontend i RLS llegeixen `billing_status`, `seat_limit`, `stripe_customer_id` (per decidir CTA: portal vs checkout).

### 4.2 Mapping Stripe → DB

| Esdeveniment / estat Stripe | Acció a `orgs` |
|-----------------------------|----------------|
| checkout.session.completed | Omplir stripe_customer_id, stripe_subscription_id, billing_status (trialing/active), plan_id, seat_limit, trial_ends_at |
| customer.subscription.updated | Actualitzar billing_status, plan_id, seat_limit, trial_ends_at |
| customer.subscription.deleted | billing_status = 'canceled'; stripe_subscription_id pot quedar per historial |
| invoice.payment_failed | billing_status = 'past_due' |
| invoice.payment_succeeded | billing_status = 'active' (si no trialing) |

---

## 5. Edge cases

| Cas | Comportament |
|-----|--------------|
| Org nova | billing_status = trialing (default), seat_limit = 1, stripe_* = NULL. |
| Checkout completat | Webhook omple stripe_customer_id i la resta; no cal cap write des del frontend. |
| Subscription cancelada | billing_status → canceled; RLS i UI bloquegen accés (excepte owner per recuperar). |
| Trial acabat sense pagament | Backend pot posar billing_status a inactive/canceled segons lògica Stripe; si no, trial_ends_at < now() es pot tractar a frontend com “no billable”. |
| seat_limit = 1 i 2 membres | Ja existent; RPC org_add_member impedeix afegir més; UI redirigeix a over-seat. |

---

## 6. Definition of Done

- [x] Enum `billing_status_enum` creat; columnes afegides a `orgs`.
- [x] CHECK seat_limit >= 1; índexs UNIQUE parcials per stripe_customer_id i stripe_subscription_id.
- [x] Cap write a camps billing des de frontend ni des de endpoints checkout/portal.
- [x] Webhook documentat com a única font d’actualització (veure docs API / PAS 3).

---

## 7. Relació amb altres documents

- **FASE2_CBA_ARCHITECTURE_FINAL** (D0): visió general; contracte orgs.
- **RLS_BILLING_GATING** (D2): ús de `billing_status` a RLS.
- **SEAT_ENFORCEMENT_RPC** (D2): ús de `seat_limit` i càlcul de `seats_used`.
- **BILLING_GATING_UI** (D3): lectura de billing_status i seat_limit per redirect locked/over-seat.
