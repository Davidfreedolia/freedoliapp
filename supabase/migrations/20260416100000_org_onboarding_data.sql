-- Migration: org_onboarding_data
-- Purpose: Store per-org onboarding survey answers (tools used, how found).
-- Called from ActivationWizard at the end of the survey steps.

CREATE TABLE IF NOT EXISTS public.org_onboarding_data (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  tools_used  text[]    DEFAULT '{}',
  how_found   text,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now(),
  UNIQUE (org_id)
);

-- Index for fast lookup by org_id
CREATE INDEX IF NOT EXISTS org_onboarding_data_org_id_idx
  ON public.org_onboarding_data (org_id);

-- RLS
ALTER TABLE public.org_onboarding_data ENABLE ROW LEVEL SECURITY;

-- Org members (active) can read and write their own org's onboarding data
CREATE POLICY "org_members_manage_onboarding_data"
  ON public.org_onboarding_data
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.org_memberships om
      WHERE om.org_id = org_onboarding_data.org_id
        AND om.user_id = auth.uid()
        AND om.status  = 'active'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.org_memberships om
      WHERE om.org_id = org_onboarding_data.org_id
        AND om.user_id = auth.uid()
        AND om.status  = 'active'
    )
  );

-- Auto-update updated_at on row change
CREATE OR REPLACE FUNCTION public.touch_org_onboarding_data()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_touch_org_onboarding_data
  BEFORE UPDATE ON public.org_onboarding_data
  FOR EACH ROW EXECUTE FUNCTION public.touch_org_onboarding_data();
