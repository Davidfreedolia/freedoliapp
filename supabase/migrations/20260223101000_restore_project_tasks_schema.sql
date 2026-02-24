-- Restore project_tasks schema (auditability restoration)

CREATE TABLE IF NOT EXISTS public.project_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  org_id uuid NOT NULL,
  project_id uuid NOT NULL,

  title text NOT NULL,
  status text NULL,
  due_date date NULL,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- FK to projects
DO $$
BEGIN
  ALTER TABLE public.project_tasks
    ADD CONSTRAINT fk_project_tasks_project
    FOREIGN KEY (project_id)
    REFERENCES public.projects(id)
    ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Index
CREATE INDEX IF NOT EXISTS idx_project_tasks_org_id
  ON public.project_tasks(org_id);

-- Enable RLS
ALTER TABLE public.project_tasks ENABLE ROW LEVEL SECURITY;

-- Policies
DO $$
BEGIN
  CREATE POLICY "Org members can select project_tasks"
    ON public.project_tasks
    FOR SELECT
    USING (public.is_org_member(org_id));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "Org members can insert project_tasks"
    ON public.project_tasks
    FOR INSERT
    WITH CHECK (public.is_org_member(org_id));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "Org members can update project_tasks"
    ON public.project_tasks
    FOR UPDATE
    USING (public.is_org_member(org_id))
    WITH CHECK (public.is_org_member(org_id));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "Org members can delete project_tasks"
    ON public.project_tasks
    FOR DELETE
    USING (public.is_org_member(org_id));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
