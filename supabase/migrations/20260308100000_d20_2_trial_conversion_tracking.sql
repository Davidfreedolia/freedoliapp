-- D20.2 — Trial conversion tracking: ensure trial_registrations supports D20 contract.
-- Idempotent; no backfill; no changes to billing, checkout, onboarding, or webhooks.

-- 1) converted_at: add only if missing
ALTER TABLE public.trial_registrations
  ADD COLUMN IF NOT EXISTS converted_at timestamptz NULL;

-- 2) status: ensure constraint allows started, workspace_created, converted (and abandoned per D18)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.trial_registrations'::regclass
      AND conname = 'trial_registrations_status_check'
  ) THEN
    ALTER TABLE public.trial_registrations
      DROP CONSTRAINT trial_registrations_status_check;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.trial_registrations'::regclass
      AND conname = 'trial_registrations_status_check'
  ) THEN
    ALTER TABLE public.trial_registrations
      ADD CONSTRAINT trial_registrations_status_check
      CHECK (status IN ('started', 'workspace_created', 'converted', 'abandoned'));
  END IF;
END $$;

-- 3) Indexes for conversion/tracking queries (idempotent)
CREATE INDEX IF NOT EXISTS idx_trial_registrations_status
  ON public.trial_registrations(status);

CREATE INDEX IF NOT EXISTS idx_trial_registrations_workspace_id_status
  ON public.trial_registrations(workspace_id, status);
