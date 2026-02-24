-- 20260222123000_s1_6_gtin_assignments_org_rls.sql
-- TENANT-DATA: add org_id + backfill + enforce + RLS + policies for gtin_assignments

DO $$
DECLARE
  c bigint;
  r record;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='gtin_assignments'
  ) THEN
    RETURN;
  END IF;

  EXECUTE 'ALTER TABLE public.gtin_assignments ADD COLUMN IF NOT EXISTS org_id uuid';

  -- Backfill: project_id -> projects.org_id (preferred)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='gtin_assignments' AND column_name='project_id'
  )
  AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='projects' AND column_name='org_id'
  ) THEN
    UPDATE public.gtin_assignments ga
    SET org_id = p.org_id
    FROM public.projects p
    WHERE ga.project_id = p.id
      AND ga.org_id IS NULL
      AND p.org_id IS NOT NULL;
  END IF;

  -- Fallback: user_id -> org_memberships
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='gtin_assignments' AND column_name='user_id'
  ) THEN
    UPDATE public.gtin_assignments ga
    SET org_id = (
      SELECT om.org_id
      FROM public.org_memberships om
      WHERE om.user_id = ga.user_id
      ORDER BY om.created_at ASC
      LIMIT 1
    )
    WHERE ga.org_id IS NULL
      AND ga.user_id IS NOT NULL;
  END IF;

  SELECT COUNT(*) INTO c
  FROM public.gtin_assignments
  WHERE org_id IS NULL;

  IF c > 0 THEN
    RAISE EXCEPTION 'S1.6: gtin_assignments still has % rows with org_id NULL', c;
  END IF;

  EXECUTE 'ALTER TABLE public.gtin_assignments ALTER COLUMN org_id SET NOT NULL';

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='fk_gtin_assignments_org') THEN
    EXECUTE '
      ALTER TABLE public.gtin_assignments
      ADD CONSTRAINT fk_gtin_assignments_org
      FOREIGN KEY (org_id) REFERENCES public.orgs(id) ON DELETE CASCADE
    ';
  END IF;

  EXECUTE 'CREATE INDEX IF NOT EXISTS idx_gtin_assignments_org_id ON public.gtin_assignments(org_id)';

  EXECUTE 'ALTER TABLE public.gtin_assignments ENABLE ROW LEVEL SECURITY';

  FOR r IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname='public' AND tablename='gtin_assignments'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.gtin_assignments', r.policyname);
  END LOOP;

  EXECUTE '
    CREATE POLICY s1_org_select_gtin_assignments
    ON public.gtin_assignments
    FOR SELECT TO authenticated
    USING (public.is_org_member(org_id))
  ';
  EXECUTE '
    CREATE POLICY s1_org_insert_gtin_assignments
    ON public.gtin_assignments
    FOR INSERT TO authenticated
    WITH CHECK (public.is_org_member(org_id))
  ';
  EXECUTE '
    CREATE POLICY s1_org_update_gtin_assignments
    ON public.gtin_assignments
    FOR UPDATE TO authenticated
    USING (public.is_org_member(org_id))
    WITH CHECK (public.is_org_member(org_id))
  ';
  EXECUTE '
    CREATE POLICY s1_org_delete_gtin_assignments
    ON public.gtin_assignments
    FOR DELETE TO authenticated
    USING (public.is_org_member(org_id))
  ';
END $$;
