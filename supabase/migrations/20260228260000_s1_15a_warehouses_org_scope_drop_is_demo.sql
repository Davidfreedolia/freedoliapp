-- ============================================
-- S1.15a — warehouses org-scoped, drop is_demo
-- ============================================

-- B1) Assegura org_id existeix (S1.2 ja el pot haver afegit)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'warehouses' AND column_name = 'org_id') THEN
    ALTER TABLE public.warehouses ADD COLUMN org_id uuid;
  END IF;
END $$;

-- B2) Backfill org_id (warehouses no té project_id; via org_memberships)
UPDATE public.warehouses w
SET org_id = (SELECT om.org_id FROM public.org_memberships om WHERE om.user_id = w.user_id ORDER BY om.created_at LIMIT 1)
WHERE w.org_id IS NULL AND w.user_id IS NOT NULL;

-- B3) NOT NULL condicional + index
DO $$
DECLARE
  v_nulls bigint;
BEGIN
  SELECT COUNT(*) INTO v_nulls FROM public.warehouses WHERE org_id IS NULL;
  IF v_nulls > 0 THEN
    RAISE WARNING 'S1.15a: warehouses té % files amb org_id NULL', v_nulls;
  ELSE
    ALTER TABLE public.warehouses ALTER COLUMN org_id SET NOT NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_warehouses_org_id ON public.warehouses(org_id);

-- B4) DROP is_demo (idempotent)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'warehouses' AND column_name = 'is_demo') THEN
    ALTER TABLE public.warehouses DROP COLUMN is_demo;
  END IF;
END $$;

-- B5) RLS — drop user-based, create org-based
ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own warehouses" ON public.warehouses;
DROP POLICY IF EXISTS "Users can insert own warehouses" ON public.warehouses;
DROP POLICY IF EXISTS "Users can update own warehouses" ON public.warehouses;
DROP POLICY IF EXISTS "Users can delete own warehouses" ON public.warehouses;

CREATE POLICY "Org members can manage warehouses"
ON public.warehouses
FOR ALL
TO authenticated
USING (public.is_org_member(org_id))
WITH CHECK (public.is_org_member(org_id));
