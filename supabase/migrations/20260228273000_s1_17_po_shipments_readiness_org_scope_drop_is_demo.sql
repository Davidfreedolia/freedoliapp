-- ============================================
-- S1.17 — po_shipments + po_amazon_readiness org-scoped, drop is_demo
-- ============================================

-- B1) Assegura org_id existeix (S1.2 pot haver-lo afegit)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'po_amazon_readiness' AND column_name = 'org_id') THEN
    ALTER TABLE public.po_amazon_readiness ADD COLUMN org_id uuid;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'po_shipments' AND column_name = 'org_id') THEN
    ALTER TABLE public.po_shipments ADD COLUMN org_id uuid;
  END IF;
END $$;

-- B2) Backfill org_id via purchase_orders(org_id)
UPDATE public.po_amazon_readiness ar
SET org_id = po.org_id
FROM public.purchase_orders po
WHERE ar.purchase_order_id = po.id AND po.org_id IS NOT NULL AND ar.org_id IS NULL;

UPDATE public.po_shipments ps
SET org_id = po.org_id
FROM public.purchase_orders po
WHERE ps.purchase_order_id = po.id AND po.org_id IS NOT NULL AND ps.org_id IS NULL;

-- Fallback via org_memberships(user_id)
UPDATE public.po_amazon_readiness ar
SET org_id = (SELECT om.org_id FROM public.org_memberships om WHERE om.user_id = ar.user_id ORDER BY om.created_at LIMIT 1)
WHERE ar.org_id IS NULL AND ar.user_id IS NOT NULL;

UPDATE public.po_shipments ps
SET org_id = (SELECT om.org_id FROM public.org_memberships om WHERE om.user_id = ps.user_id ORDER BY om.created_at LIMIT 1)
WHERE ps.org_id IS NULL AND ps.user_id IS NOT NULL;

-- B3) NOT NULL condicional + index
DO $$
DECLARE
  v_nulls bigint;
BEGIN
  SELECT COUNT(*) INTO v_nulls FROM public.po_amazon_readiness WHERE org_id IS NULL;
  IF v_nulls > 0 THEN
    RAISE WARNING 'S1.17: po_amazon_readiness té % files amb org_id NULL', v_nulls;
  ELSE
    ALTER TABLE public.po_amazon_readiness ALTER COLUMN org_id SET NOT NULL;
  END IF;
  SELECT COUNT(*) INTO v_nulls FROM public.po_shipments WHERE org_id IS NULL;
  IF v_nulls > 0 THEN
    RAISE WARNING 'S1.17: po_shipments té % files amb org_id NULL', v_nulls;
  ELSE
    ALTER TABLE public.po_shipments ALTER COLUMN org_id SET NOT NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_po_amazon_readiness_org_id ON public.po_amazon_readiness(org_id);
CREATE INDEX IF NOT EXISTS idx_po_shipments_org_id ON public.po_shipments(org_id);

-- B4) DROP is_demo (idempotent)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'po_amazon_readiness' AND column_name = 'is_demo') THEN
    ALTER TABLE public.po_amazon_readiness DROP COLUMN is_demo;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'po_shipments' AND column_name = 'is_demo') THEN
    ALTER TABLE public.po_shipments DROP COLUMN is_demo;
  END IF;
END $$;

-- B5) RLS — drop user-based, create org-based

ALTER TABLE public.po_amazon_readiness ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own amazon readiness" ON public.po_amazon_readiness;
CREATE POLICY "Org members can manage po_amazon_readiness"
ON public.po_amazon_readiness
FOR ALL
TO authenticated
USING (public.is_org_member(org_id))
WITH CHECK (public.is_org_member(org_id));

ALTER TABLE public.po_shipments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own shipments" ON public.po_shipments;
CREATE POLICY "Org members can manage po_shipments"
ON public.po_shipments
FOR ALL
TO authenticated
USING (public.is_org_member(org_id))
WITH CHECK (public.is_org_member(org_id));
