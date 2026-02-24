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
