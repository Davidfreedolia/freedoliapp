-- ============================================
-- F2 CBA — PAS 3: stripe_webhook_events (idempotència webhook)
-- ============================================
-- Taula per registrar event.id processats; només service role pot escriure/llegir.
-- No RLS policies per anon/authenticated; REVOKE ALL.
-- ============================================

CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
  id text PRIMARY KEY,
  created_at timestamptz DEFAULT now() NOT NULL,
  type text,
  org_id uuid,
  stripe_customer_id text,
  stripe_subscription_id text
);

CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_created_at
  ON public.stripe_webhook_events(created_at);

COMMENT ON TABLE public.stripe_webhook_events IS 'Stripe webhook events processed (idempotency); server-only.';

-- Hardening: cap accés via PostgREST per anon/authenticated (mateix patró S1.22)
ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.stripe_webhook_events FROM anon, authenticated;

-- Service role conserva els permisos via GRANT al rol postgres / service_role (Supabase)
-- No crear policy: cap fila visible per anon/authenticated.
