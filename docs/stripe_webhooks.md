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
