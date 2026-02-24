-- Restore project_marketplaces schema (auditability restoration)

CREATE TABLE IF NOT EXISTS public.project_marketplaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  org_id uuid NOT NULL,
  project_id uuid NOT NULL,
  marketplace_code text NOT NULL,

  is_active boolean NOT NULL DEFAULT true,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- FK to projects
DO $$
BEGIN
  ALTER TABLE public.project_marketplaces
    ADD CONSTRAINT fk_project_marketplaces_project
    FOREIGN KEY (project_id)
    REFERENCES public.projects(id)
    ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Index
CREATE INDEX IF NOT EXISTS idx_project_marketplaces_org_id
  ON public.project_marketplaces(org_id);

-- Enable RLS
ALTER TABLE public.project_marketplaces ENABLE ROW LEVEL SECURITY;

-- Policies
DO $$
BEGIN
  CREATE POLICY "Org members can select project_marketplaces"
    ON public.project_marketplaces
    FOR SELECT
    USING (public.is_org_member(org_id));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "Org members can insert project_marketplaces"
    ON public.project_marketplaces
    FOR INSERT
    WITH CHECK (public.is_org_member(org_id));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "Org members can update project_marketplaces"
    ON public.project_marketplaces
    FOR UPDATE
    USING (public.is_org_member(org_id))
    WITH CHECK (public.is_org_member(org_id));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "Org members can delete project_marketplaces"
    ON public.project_marketplaces
    FOR DELETE
    USING (public.is_org_member(org_id));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
