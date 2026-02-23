-- 20260222124000_s1_7_health_runs_org_rls.sql
-- TENANT-DATA: add org_id + backfill + enforce + RLS + policies for health_runs
-- Backfill from project_id only; delete orphan runs (no project or project missing) so migration never fails on legacy data.

DO $$
DECLARE
  c bigint;
  r record;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='health_runs'
  ) THEN
    RETURN;
  END IF;

  EXECUTE 'ALTER TABLE public.health_runs ADD COLUMN IF NOT EXISTS org_id uuid';

  -- Backfill: project_id -> projects.org_id (only reliable source)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='health_runs' AND column_name='project_id'
  )
  AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='projects' AND column_name='org_id'
  ) THEN
    UPDATE public.health_runs hr
    SET org_id = p.org_id
    FROM public.projects p
    WHERE hr.project_id = p.id
      AND hr.org_id IS NULL
      AND p.org_id IS NOT NULL;
  END IF;

  -- Delete orphan runs (legacy) rather than guessing org_id
  DELETE FROM public.health_runs hr
  WHERE hr.org_id IS NULL
    AND (
      hr.project_id IS NULL
      OR NOT EXISTS (SELECT 1 FROM public.projects p WHERE p.id = hr.project_id)
    );

  -- Remaining NULLs = true data issue
  SELECT COUNT(*) INTO c
  FROM public.health_runs
  WHERE org_id IS NULL;

  IF c > 0 THEN
    RAISE EXCEPTION 'S1.7: health_runs still has % NULL org_id after backfill+orphan delete', c;
  END IF;

  -- Enforce + RLS + policies
  EXECUTE 'ALTER TABLE public.health_runs ALTER COLUMN org_id SET NOT NULL';

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='fk_health_runs_org') THEN
    EXECUTE '
      ALTER TABLE public.health_runs
      ADD CONSTRAINT fk_health_runs_org
      FOREIGN KEY (org_id) REFERENCES public.orgs(id) ON DELETE CASCADE
    ';
  END IF;

  EXECUTE 'CREATE INDEX IF NOT EXISTS idx_health_runs_org_id ON public.health_runs(org_id)';
  EXECUTE 'ALTER TABLE public.health_runs ENABLE ROW LEVEL SECURITY';

  FOR r IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname='public' AND tablename='health_runs'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.health_runs', r.policyname);
  END LOOP;

  EXECUTE '
    CREATE POLICY s1_org_select_health_runs
    ON public.health_runs
    FOR SELECT TO authenticated
    USING (public.is_org_member(org_id))
  ';
  EXECUTE '
    CREATE POLICY s1_org_insert_health_runs
    ON public.health_runs
    FOR INSERT TO authenticated
    WITH CHECK (public.is_org_member(org_id))
  ';
  EXECUTE '
    CREATE POLICY s1_org_update_health_runs
    ON public.health_runs
    FOR UPDATE TO authenticated
    USING (public.is_org_member(org_id))
    WITH CHECK (public.is_org_member(org_id))
  ';
  EXECUTE '
    CREATE POLICY s1_org_delete_health_runs
    ON public.health_runs
    FOR DELETE TO authenticated
    USING (public.is_org_member(org_id))
  ';
END $$;
