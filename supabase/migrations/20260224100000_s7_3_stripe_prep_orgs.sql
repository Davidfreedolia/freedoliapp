-- S7.3: Stripe prep — camps a orgs per customer i subscription.
-- No triggers. No RLS changes.

ALTER TABLE public.orgs
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text;
