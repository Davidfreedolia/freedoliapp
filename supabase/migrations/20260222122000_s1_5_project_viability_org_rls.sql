-- 20260222122000_s1_5_project_viability_org_rls.sql
-- TENANT-DATA: add org_id + backfill + enforce + RLS + policies for project_viability

DO $$
DECLARE
  c bigint;
  r record;
BEGIN
  -- Table exists?
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='project_viability'
  ) THEN
    RETURN;
  END IF;

  -- Add org_id if missing
  EXECUTE 'ALTER TABLE public.project_viability ADD COLUMN IF NOT EXISTS org_id uuid';

  -- Backfill via project_id -> projects.org_id (preferred)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='project_viability' AND column_name='project_id'
  )
  AND EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='projects'
  )
  AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='projects' AND column_name='org_id'
  ) THEN
    UPDATE public.project_viability pv
    SET org_id = p.org_id
    FROM public.projects p
    WHERE pv.project_id = p.id
      AND pv.org_id IS NULL
      AND p.org_id IS NOT NULL;
  END IF;

  -- Fallback via user_id -> org_memberships.org_id
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='project_viability' AND column_name='user_id'
  ) THEN
    UPDATE public.project_viability pv
    SET org_id = (
      SELECT om.org_id
      FROM public.org_memberships om
      WHERE om.user_id = pv.user_id
      ORDER BY om.created_at ASC
      LIMIT 1
    )
    WHERE pv.org_id IS NULL
      AND pv.user_id IS NOT NULL;
  END IF;

  -- Fail hard if still NULL
  SELECT COUNT(*) INTO c
  FROM public.project_viability
  WHERE org_id IS NULL;

  IF c > 0 THEN
    RAISE EXCEPTION 'S1.5: project_viability still has % rows with org_id NULL', c;
  END IF;

  -- Enforce NOT NULL
  EXECUTE 'ALTER TABLE public.project_viability ALTER COLUMN org_id SET NOT NULL';

  -- FK (only if missing)
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='fk_project_viability_org') THEN
    EXECUTE '
      ALTER TABLE public.project_viability
      ADD CONSTRAINT fk_project_viability_org
      FOREIGN KEY (org_id) REFERENCES public.orgs(id) ON DELETE CASCADE
    ';
  END IF;

  -- Index
  EXECUTE 'CREATE INDEX IF NOT EXISTS idx_project_viability_org_id ON public.project_viability(org_id)';

  -- RLS
  EXECUTE 'ALTER TABLE public.project_viability ENABLE ROW LEVEL SECURITY';

  -- Drop existing policies
  FOR r IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname='public' AND tablename='project_viability'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.project_viability', r.policyname);
  END LOOP;

  -- Policies
  EXECUTE '
    CREATE POLICY s1_org_select_project_viability
    ON public.project_viability
    FOR SELECT TO authenticated
    USING (public.is_org_member(org_id))
  ';

  EXECUTE '
    CREATE POLICY s1_org_insert_project_viability
    ON public.project_viability
    FOR INSERT TO authenticated
    WITH CHECK (public.is_org_member(org_id))
  ';

  EXECUTE '
    CREATE POLICY s1_org_update_project_viability
    ON public.project_viability
    FOR UPDATE TO authenticated
    USING (public.is_org_member(org_id))
    WITH CHECK (public.is_org_member(org_id))
  ';

  EXECUTE '
    CREATE POLICY s1_org_delete_project_viability
    ON public.project_viability
    FOR DELETE TO authenticated
    USING (public.is_org_member(org_id))
  ';
END $$;
