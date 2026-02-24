-- 20260222120000_s1_3_variant_marketplace_asins_org_rls.sql
-- TENANT-DATA: add org_id + backfill + enforce + RLS + policies for variant_marketplace_asins

DO $$
DECLARE
  c bigint;
  r record;
BEGIN
  -- Table exists?
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='variant_marketplace_asins'
  ) THEN
    RETURN;
  END IF;

  -- 1) Add org_id if missing
  EXECUTE 'ALTER TABLE public.variant_marketplace_asins ADD COLUMN IF NOT EXISTS org_id uuid';

  -- 2) Backfill from product_variants.org_id if available
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='product_variants'
  )
  AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='product_variants' AND column_name='org_id'
  ) THEN
    UPDATE public.variant_marketplace_asins vma
    SET org_id = pv.org_id
    FROM public.product_variants pv
    WHERE vma.variant_id = pv.id
      AND vma.org_id IS NULL
      AND pv.org_id IS NOT NULL;
  END IF;

  -- 3) Fallback: product_variants.project_id -> projects.org_id
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='product_variants'
  )
  AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='product_variants' AND column_name='project_id'
  )
  AND EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='projects'
  )
  AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='projects' AND column_name='org_id'
  ) THEN
    UPDATE public.variant_marketplace_asins vma
    SET org_id = p.org_id
    FROM public.product_variants pv
    JOIN public.projects p ON p.id = pv.project_id
    WHERE vma.variant_id = pv.id
      AND vma.org_id IS NULL
      AND p.org_id IS NOT NULL;
  END IF;

  -- 4) Fail hard if still NULL
  SELECT COUNT(*) INTO c
  FROM public.variant_marketplace_asins
  WHERE org_id IS NULL;

  IF c > 0 THEN
    RAISE EXCEPTION 'S1.3: variant_marketplace_asins still has % rows with org_id NULL', c;
  END IF;

  -- 5) Enforce NOT NULL
  EXECUTE 'ALTER TABLE public.variant_marketplace_asins ALTER COLUMN org_id SET NOT NULL';

  -- 6) FK (only if missing)
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='fk_variant_marketplace_asins_org') THEN
    EXECUTE '
      ALTER TABLE public.variant_marketplace_asins
      ADD CONSTRAINT fk_variant_marketplace_asins_org
      FOREIGN KEY (org_id) REFERENCES public.orgs(id) ON DELETE CASCADE
    ';
  END IF;

  -- 7) Index
  EXECUTE 'CREATE INDEX IF NOT EXISTS idx_variant_marketplace_asins_org_id ON public.variant_marketplace_asins(org_id)';

  -- 8) RLS
  EXECUTE 'ALTER TABLE public.variant_marketplace_asins ENABLE ROW LEVEL SECURITY';

  -- 9) Drop existing policies (if any)
  FOR r IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname='public' AND tablename='variant_marketplace_asins'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.variant_marketplace_asins', r.policyname);
  END LOOP;

  -- 10) Policies: org member CRUD
  EXECUTE '
    CREATE POLICY s1_org_select_variant_marketplace_asins
    ON public.variant_marketplace_asins
    FOR SELECT TO authenticated
    USING (public.is_org_member(org_id))
  ';

  EXECUTE '
    CREATE POLICY s1_org_insert_variant_marketplace_asins
    ON public.variant_marketplace_asins
    FOR INSERT TO authenticated
    WITH CHECK (public.is_org_member(org_id))
  ';

  EXECUTE '
    CREATE POLICY s1_org_update_variant_marketplace_asins
    ON public.variant_marketplace_asins
    FOR UPDATE TO authenticated
    USING (public.is_org_member(org_id))
    WITH CHECK (public.is_org_member(org_id))
  ';

  EXECUTE '
    CREATE POLICY s1_org_delete_variant_marketplace_asins
    ON public.variant_marketplace_asins
    FOR DELETE TO authenticated
    USING (public.is_org_member(org_id))
  ';
END $$;
