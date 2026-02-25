# Stripe webhook (S8.1) — TEST MODE

Edge Function: `supabase/functions/stripe_webhook`.

## Events handled

- `customer.subscription.created` / `customer.subscription.updated` → update `orgs`: `billing_status`, `stripe_customer_id`, `stripe_subscription_id`, `trial_ends_at`
- `customer.subscription.deleted` → `billing_status = 'canceled'`
- `invoice.paid` → `billing_status = 'active'`
- `invoice.payment_failed` → `billing_status = 'past_due'`

## Secrets (Supabase)

- `STRIPE_SECRET_KEY` — `sk_test_...`
- `STRIPE_WEBHOOK_SECRET` — `whsec_...`
- `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` (often set by project)

## Deploy

```bash
supabase functions deploy stripe_webhook
```

## QA (Stripe CLI)

```bash
stripe listen --forward-to https://<project>.functions.supabase.co/stripe_webhook
stripe trigger customer.subscription.created
stripe trigger invoice.paid
stripe trigger invoice.payment_failed
```

Comprovar a DB: `select id, billing_status, stripe_customer_id, stripe_subscription_id, trial_ends_at from orgs;`

---

## S8.2 — Checkout + Billing Portal (TEST MODE)

Edge Functions:

- `supabase/functions/stripe_create_checkout` — POST `{ org_id }` → crea Checkout Session (subscription), retorna `{ url }`. Auth: JWT; user ha de ser owner/admin de l’org.
- `supabase/functions/stripe_create_portal` — POST `{ org_id }` → crea Billing Portal session, retorna `{ url }`. Si l’org no té `stripe_customer_id` → 400 "No customer yet".

Secrets addicionals:

- `STRIPE_PRICE_ID_CORE` — `price_...` (preu pla core, test)
- `APP_BASE_URL` — ex. `https://freedoliapp.vercel.app` (success/cancel/return)

Deploy:

```bash
supabase functions deploy stripe_create_checkout
supabase functions deploy stripe_create_portal
```

UI: Settings → Workspace → Subscription → botó "Manage billing" (prova portal; si no customer, obre checkout).

---

## S8.3 — QA Wiring (TEST MODE) — Checklist executable

### 1) Secrets a Supabase (imprescindible)

- `STRIPE_SECRET_KEY` = `sk_test_...`
- `STRIPE_WEBHOOK_SECRET` = `whsec_...`
- `STRIPE_PRICE_ID_CORE` = `price_...`
- `APP_BASE_URL` = `https://<el teu domini vercel>`

(Si en falta un, el flow es trenca silenciosament.)

### 2) Deploy Edge Functions

```bash
supabase functions deploy stripe_webhook
supabase functions deploy stripe_create_checkout
supabase functions deploy stripe_create_portal
```

### 3) Stripe CLI: escoltar webhooks cap a Supabase

```bash
stripe listen --forward-to https://<project-ref>.functions.supabase.co/stripe_webhook
```

**Important:** el `whsec_...` que et dona el CLI és el que ha d’estar a `STRIPE_WEBHOOK_SECRET` per QA amb CLI.

### 4) Test end-to-end des de l’app

- **DB abans:** a la teva org, `stripe_customer_id` i `stripe_subscription_id` NULL.
- **App:** Settings → Workspace → Subscription → **Manage billing**.
- **Esperat:** primer portal falla “No customer yet” → es crida checkout → redirigeix a Stripe Checkout → completes amb test card.

### 5) Verificació webhook (prova de veritat)

Després de pagar, a Supabase SQL:

```sql
select id, billing_status, plan_id, stripe_customer_id, stripe_subscription_id, trial_ends_at
from public.orgs
where id = '<ORG_ID>';
```

**Esperat:** `stripe_customer_id` i `stripe_subscription_id` omplerts, `billing_status` = `active` (o `trialing` si el price té trial).

### 6) Test portal

Tornar a Settings → **Manage billing**. **Esperat:** s’obre Billing Portal directament (sense checkout).

### Si falla (punts típics)

- `STRIPE_WEBHOOK_SECRET` no coincideix amb el `whsec_` del CLI (o dashboard).
- `APP_BASE_URL` mal posat i Stripe rebutja redirect.
- L’org no es troba al webhook (revisar `findOrgId` per `stripe_customer_id` / `stripe_subscription_id`).
