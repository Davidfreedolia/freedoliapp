-- ============================================
-- F2 CBA — PAS 1: orgs billing fields (DB schema only)
-- ============================================

-- 1) billing_status_enum
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'billing_status_enum'
  ) THEN
    CREATE TYPE billing_status_enum AS ENUM (
      'trialing',
      'active',
      'past_due',
      'canceled'
    );
  END IF;
END $$;

-- 2) Afegir columnes a public.orgs (idempotent)
ALTER TABLE public.orgs
  ADD COLUMN IF NOT EXISTS billing_status billing_status_enum NOT NULL DEFAULT 'trialing';

ALTER TABLE public.orgs
  ADD COLUMN IF NOT EXISTS plan_id text;

ALTER TABLE public.orgs
  ADD COLUMN IF NOT EXISTS seat_limit integer NOT NULL DEFAULT 1;

ALTER TABLE public.orgs
  ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz;

ALTER TABLE public.orgs
  ADD COLUMN IF NOT EXISTS stripe_customer_id text;

ALTER TABLE public.orgs
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text;

-- 3) CHECK constraint seat_limit >= 1 (idempotent)
DO $$
BEGIN
  BEGIN
    ALTER TABLE public.orgs
      ADD CONSTRAINT orgs_seat_limit_check CHECK (seat_limit >= 1);
  EXCEPTION
    WHEN duplicate_object THEN
      NULL;
  END;
END $$;

-- 4) Unique indexes per stripe_* (nullable, idempotent)
CREATE UNIQUE INDEX IF NOT EXISTS idx_orgs_stripe_customer_id_unique
  ON public.orgs(stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_orgs_stripe_subscription_id_unique
  ON public.orgs(stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;

