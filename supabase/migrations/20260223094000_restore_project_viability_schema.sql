-- Restore project_viability schema (auditability restoration)

CREATE TABLE IF NOT EXISTS public.project_viability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  org_id uuid NOT NULL,
  project_id uuid NOT NULL,

  status text NULL,
  score numeric NULL,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- FK to projects
DO $$
BEGIN
  ALTER TABLE public.project_viability
    ADD CONSTRAINT fk_project_viability_project
    FOREIGN KEY (project_id)
    REFERENCES public.projects(id)
    ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Index
CREATE INDEX IF NOT EXISTS idx_project_viability_org_id
  ON public.project_viability(org_id);

-- Enable RLS
ALTER TABLE public.project_viability ENABLE ROW LEVEL SECURITY;

-- Policies
DO $$
BEGIN
  CREATE POLICY "Org members can select project_viability"
    ON public.project_viability
    FOR SELECT
    USING (public.is_org_member(org_id));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "Org members can insert project_viability"
    ON public.project_viability
    FOR INSERT
    WITH CHECK (public.is_org_member(org_id));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "Org members can update project_viability"
    ON public.project_viability
    FOR UPDATE
    USING (public.is_org_member(org_id))
    WITH CHECK (public.is_org_member(org_id));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "Org members can delete project_viability"
    ON public.project_viability
    FOR DELETE
    USING (public.is_org_member(org_id));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
