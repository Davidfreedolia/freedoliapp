-- ============================================
-- S1.10 — supplier_sample_requests 100% org-scoped, drop is_demo
-- ============================================
-- org_id ja existeix i és NOT NULL (20260222000003). Només cal dropar is_demo
-- i consolidar RLS en una sola policy FOR ALL.
-- ============================================

-- B1) Backfill org_id per si hi ha NULLs (project_id té prioritat)
UPDATE public.supplier_sample_requests ss
SET org_id = p.org_id
FROM public.projects p
WHERE ss.project_id = p.id AND p.org_id IS NOT NULL AND ss.org_id IS NULL;

UPDATE public.supplier_sample_requests ss
SET org_id = s.org_id
FROM public.suppliers s
WHERE ss.supplier_id = s.id AND s.org_id IS NOT NULL AND ss.org_id IS NULL;

-- B2) Enforce NOT NULL només si no queden nulls
DO $$
DECLARE
  null_count bigint;
BEGIN
  SELECT COUNT(*) INTO null_count FROM public.supplier_sample_requests WHERE org_id IS NULL;
  IF null_count > 0 THEN
    RAISE WARNING 'S1.10: supplier_sample_requests té % files amb org_id NULL; no es força NOT NULL', null_count;
  ELSE
    ALTER TABLE public.supplier_sample_requests ALTER COLUMN org_id SET NOT NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_supplier_sample_requests_org_id ON public.supplier_sample_requests(org_id);

-- B3) Drop is_demo (idempotent)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'supplier_sample_requests' AND column_name = 'is_demo'
  ) THEN
    ALTER TABLE public.supplier_sample_requests DROP COLUMN is_demo;
  END IF;
END $$;

-- B4) RLS — una sola policy FOR ALL
ALTER TABLE public.supplier_sample_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org members can select supplier_sample_requests" ON public.supplier_sample_requests;
DROP POLICY IF EXISTS "Org members can insert supplier_sample_requests" ON public.supplier_sample_requests;
DROP POLICY IF EXISTS "Org members can update supplier_sample_requests" ON public.supplier_sample_requests;
DROP POLICY IF EXISTS "Org members can delete supplier_sample_requests" ON public.supplier_sample_requests;

CREATE POLICY "Org members can manage supplier sample requests"
ON public.supplier_sample_requests
FOR ALL
TO authenticated
USING (public.is_org_member(org_id))
WITH CHECK (public.is_org_member(org_id));
