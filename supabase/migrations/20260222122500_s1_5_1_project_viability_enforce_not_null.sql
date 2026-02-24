-- 20260222122500_s1_5_1_project_viability_enforce_not_null.sql
-- HOTFIX: enforce project_viability.org_id NOT NULL + FK + RLS policies (idempotent)

DO $$
DECLARE
  c bigint;
  r record;
BEGIN
  -- 1) Table exists?
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='project_viability'
  ) THEN
    RETURN;
  END IF;

  -- 2) Ensure org_id column exists
  EXECUTE 'ALTER TABLE public.project_viability ADD COLUMN IF NOT EXISTS org_id uuid';

  -- 3) Backfill (only where org_id IS NULL): project_id -> projects.org_id
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='project_viability' AND column_name='project_id'
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

  -- 3) Fallback: user_id -> org_memberships.org_id
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

  -- 4) Fail hard if any NULL remains
  SELECT COUNT(*) INTO c
  FROM public.project_viability
  WHERE org_id IS NULL;

  IF c > 0 THEN
    RAISE EXCEPTION 'S1.5.1: project_viability still has % NULL org_id', c;
  END IF;

  -- 5) Enforce NOT NULL
  EXECUTE 'ALTER TABLE public.project_viability ALTER COLUMN org_id SET NOT NULL';

  -- 6) FK if missing
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='fk_project_viability_org') THEN
    EXECUTE '
      ALTER TABLE public.project_viability
      ADD CONSTRAINT fk_project_viability_org
      FOREIGN KEY (org_id) REFERENCES public.orgs(id) ON DELETE CASCADE
    ';
  END IF;

  -- 7) Index if missing
  EXECUTE 'CREATE INDEX IF NOT EXISTS idx_project_viability_org_id ON public.project_viability(org_id)';

  -- 8) RLS
  EXECUTE 'ALTER TABLE public.project_viability ENABLE ROW LEVEL SECURITY';

  -- 9) Drop ALL existing policies
  FOR r IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname='public' AND tablename='project_viability'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.project_viability', r.policyname);
  END LOOP;

  -- 10) Create 4 policies (SELECT/INSERT/UPDATE/DELETE)
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
