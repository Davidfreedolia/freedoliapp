-- ============================================
-- S1.19 — logistics_flow org-scoped, drop is_demo
-- ============================================

-- B1) Assegura org_id existeix (S1.2 pot haver-lo afegit)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'logistics_flow' AND column_name = 'org_id') THEN
    ALTER TABLE public.logistics_flow ADD COLUMN org_id uuid;
  END IF;
END $$;

-- B2) Backfill org_id: via purchase_orders(org_id) si order_id existeix
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'logistics_flow' AND column_name = 'order_id') THEN
    UPDATE public.logistics_flow lf
    SET org_id = po.org_id
    FROM public.purchase_orders po
    WHERE lf.order_id = po.id AND po.org_id IS NOT NULL AND lf.org_id IS NULL;
  END IF;
END $$;

-- Backfill via project_id -> projects(org_id)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'logistics_flow' AND column_name = 'project_id') THEN
    UPDATE public.logistics_flow lf
    SET org_id = p.org_id
    FROM public.projects p
    WHERE lf.project_id = p.id AND p.org_id IS NOT NULL AND lf.org_id IS NULL;
  END IF;
END $$;

-- Fallback via org_memberships(user_id)
UPDATE public.logistics_flow lf
SET org_id = (SELECT om.org_id FROM public.org_memberships om WHERE om.user_id = lf.user_id ORDER BY om.created_at LIMIT 1)
WHERE lf.org_id IS NULL AND lf.user_id IS NOT NULL;

-- B3) NOT NULL condicional + index
DO $$
DECLARE
  v_nulls bigint;
BEGIN
  SELECT COUNT(*) INTO v_nulls FROM public.logistics_flow WHERE org_id IS NULL;
  IF v_nulls > 0 THEN
    RAISE WARNING 'S1.19: logistics_flow té % files amb org_id NULL', v_nulls;
  ELSE
    ALTER TABLE public.logistics_flow ALTER COLUMN org_id SET NOT NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_logistics_flow_org_id ON public.logistics_flow(org_id);

-- B4) DROP is_demo (idempotent)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'logistics_flow' AND column_name = 'is_demo') THEN
    ALTER TABLE public.logistics_flow DROP COLUMN is_demo;
  END IF;
END $$;

-- B5) RLS — drop user-based, create org-based
ALTER TABLE public.logistics_flow ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own logistics flow" ON public.logistics_flow;
DROP POLICY IF EXISTS "Users can view own logistics flow" ON public.logistics_flow;
DROP POLICY IF EXISTS "Users can insert own logistics flow" ON public.logistics_flow;
DROP POLICY IF EXISTS "Users can update own logistics flow" ON public.logistics_flow;
DROP POLICY IF EXISTS "Users can delete own logistics flow" ON public.logistics_flow;

CREATE POLICY "Org members can manage logistics_flow"
ON public.logistics_flow
FOR ALL
TO authenticated
USING (public.is_org_member(org_id))
WITH CHECK (public.is_org_member(org_id));
