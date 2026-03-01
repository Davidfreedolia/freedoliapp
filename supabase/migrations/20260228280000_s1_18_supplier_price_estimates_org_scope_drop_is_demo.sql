-- ============================================
-- S1.18 — supplier_price_estimates org-scoped, drop is_demo
-- ============================================

-- B1) Assegura org_id existeix (S1.2 pot haver-lo afegit)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'supplier_price_estimates' AND column_name = 'org_id') THEN
    ALTER TABLE public.supplier_price_estimates ADD COLUMN org_id uuid;
  END IF;
END $$;

-- B2) Backfill org_id: via supplier_quotes(org_id) si existeix columna enllaç (quote_id/supplier_quote_id)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'supplier_price_estimates' AND column_name = 'quote_id') THEN
    UPDATE public.supplier_price_estimates spe
    SET org_id = sq.org_id
    FROM public.supplier_quotes sq
    WHERE spe.quote_id = sq.id AND sq.org_id IS NOT NULL AND spe.org_id IS NULL;
  ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'supplier_price_estimates' AND column_name = 'supplier_quote_id') THEN
    UPDATE public.supplier_price_estimates spe
    SET org_id = sq.org_id
    FROM public.supplier_quotes sq
    WHERE spe.supplier_quote_id = sq.id AND sq.org_id IS NOT NULL AND spe.org_id IS NULL;
  END IF;
END $$;

-- Backfill via project_id -> projects(org_id)
UPDATE public.supplier_price_estimates spe
SET org_id = p.org_id
FROM public.projects p
WHERE spe.project_id = p.id AND p.org_id IS NOT NULL AND spe.org_id IS NULL;

-- Fallback via org_memberships(user_id)
UPDATE public.supplier_price_estimates spe
SET org_id = (SELECT om.org_id FROM public.org_memberships om WHERE om.user_id = spe.user_id ORDER BY om.created_at LIMIT 1)
WHERE spe.org_id IS NULL AND spe.user_id IS NOT NULL;

-- B3) NOT NULL condicional + index
DO $$
DECLARE
  v_nulls bigint;
BEGIN
  SELECT COUNT(*) INTO v_nulls FROM public.supplier_price_estimates WHERE org_id IS NULL;
  IF v_nulls > 0 THEN
    RAISE WARNING 'S1.18: supplier_price_estimates té % files amb org_id NULL', v_nulls;
  ELSE
    ALTER TABLE public.supplier_price_estimates ALTER COLUMN org_id SET NOT NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_supplier_price_estimates_org_id ON public.supplier_price_estimates(org_id);

-- B4) DROP is_demo (idempotent)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'supplier_price_estimates' AND column_name = 'is_demo') THEN
    ALTER TABLE public.supplier_price_estimates DROP COLUMN is_demo;
  END IF;
END $$;

-- B5) RLS — drop user-based, create org-based
ALTER TABLE public.supplier_price_estimates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own price estimates" ON public.supplier_price_estimates;

CREATE POLICY "Org members can manage supplier_price_estimates"
ON public.supplier_price_estimates
FOR ALL
TO authenticated
USING (public.is_org_member(org_id))
WITH CHECK (public.is_org_member(org_id));
