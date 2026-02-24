-- ============================================
-- MULTI-TENANT PAS 3: org_id NOT NULL + FKs + RLS + policies
-- ============================================

-- Cleanup any remaining NULL org_id (from project for sample_requests)
UPDATE public.supplier_sample_requests ss
SET org_id = p.org_id
FROM public.projects p
WHERE ss.project_id = p.id AND p.org_id IS NOT NULL AND ss.org_id IS NULL;

-- Set NOT NULL and add FK (order: tables with no dependency on others first)
ALTER TABLE public.orgs ALTER COLUMN id SET DEFAULT gen_random_uuid();

ALTER TABLE public.company_settings
  ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE public.company_settings
  ADD CONSTRAINT fk_company_settings_org
  FOREIGN KEY (org_id) REFERENCES public.orgs(id) ON DELETE CASCADE;

ALTER TABLE public.projects
  ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE public.projects
  ADD CONSTRAINT fk_projects_org
  FOREIGN KEY (org_id) REFERENCES public.orgs(id) ON DELETE CASCADE;

ALTER TABLE public.purchase_orders
  ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE public.purchase_orders
  ADD CONSTRAINT fk_purchase_orders_org
  FOREIGN KEY (org_id) REFERENCES public.orgs(id) ON DELETE CASCADE;

ALTER TABLE public.suppliers
  ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE public.suppliers
  ADD CONSTRAINT fk_suppliers_org
  FOREIGN KEY (org_id) REFERENCES public.orgs(id) ON DELETE CASCADE;

ALTER TABLE public.supplier_quotes
  ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE public.supplier_quotes
  ADD CONSTRAINT fk_supplier_quotes_org
  FOREIGN KEY (org_id) REFERENCES public.orgs(id) ON DELETE CASCADE;

-- supplier_sample_requests: rows still NULL get org from project, then from user's first org
UPDATE public.supplier_sample_requests ss
SET org_id = p.org_id
FROM public.projects p
WHERE ss.project_id = p.id AND p.org_id IS NOT NULL AND ss.org_id IS NULL;
UPDATE public.supplier_sample_requests ss
SET org_id = (SELECT om.org_id FROM public.org_memberships om WHERE om.user_id = ss.user_id LIMIT 1)
WHERE ss.org_id IS NULL;
ALTER TABLE public.supplier_sample_requests
  ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE public.supplier_sample_requests
  ADD CONSTRAINT fk_supplier_sample_requests_org
  FOREIGN KEY (org_id) REFERENCES public.orgs(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_company_settings_org_id ON public.company_settings(org_id);
CREATE INDEX IF NOT EXISTS idx_projects_org_id ON public.projects(org_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_org_id ON public.purchase_orders(org_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_org_id ON public.suppliers(org_id);
CREATE INDEX IF NOT EXISTS idx_supplier_quotes_org_id ON public.supplier_quotes(org_id);
CREATE INDEX IF NOT EXISTS idx_supplier_sample_requests_org_id ON public.supplier_sample_requests(org_id);

-- ============================================
-- RLS: orgs
-- ============================================
ALTER TABLE public.orgs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can select org" ON public.orgs;
CREATE POLICY "Members can select org" ON public.orgs
  FOR SELECT TO authenticated
  USING (public.is_org_member(id));

DROP POLICY IF EXISTS "Authenticated can insert org" ON public.orgs;
CREATE POLICY "Authenticated can insert org" ON public.orgs
  FOR INSERT TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Owner or admin can update org" ON public.orgs;
CREATE POLICY "Owner or admin can update org" ON public.orgs
  FOR UPDATE TO authenticated
  USING (public.is_org_owner_or_admin(id))
  WITH CHECK (public.is_org_owner_or_admin(id));

DROP POLICY IF EXISTS "Owner or admin can delete org" ON public.orgs;
CREATE POLICY "Owner or admin can delete org" ON public.orgs
  FOR DELETE TO authenticated
  USING (public.is_org_owner_or_admin(id));

-- ============================================
-- RLS: org_memberships
-- ============================================
ALTER TABLE public.org_memberships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can select org_memberships" ON public.org_memberships;
CREATE POLICY "Members can select org_memberships" ON public.org_memberships
  FOR SELECT TO authenticated
  USING (public.is_org_member(org_id));

DROP POLICY IF EXISTS "Owner or admin can insert org_memberships" ON public.org_memberships;
CREATE POLICY "Owner or admin can insert org_memberships" ON public.org_memberships
  FOR INSERT TO authenticated
  WITH CHECK (public.is_org_owner_or_admin(org_id));

DROP POLICY IF EXISTS "Owner or admin can update org_memberships" ON public.org_memberships;
CREATE POLICY "Owner or admin can update org_memberships" ON public.org_memberships
  FOR UPDATE TO authenticated
  USING (public.is_org_owner_or_admin(org_id))
  WITH CHECK (public.is_org_owner_or_admin(org_id));

DROP POLICY IF EXISTS "Owner or admin can delete org_memberships" ON public.org_memberships;
CREATE POLICY "Owner or admin can delete org_memberships" ON public.org_memberships
  FOR DELETE TO authenticated
  USING (public.is_org_owner_or_admin(org_id));

-- ============================================
-- RLS: company_settings (replace user_id policies with org)
-- ============================================
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own company_settings" ON public.company_settings;
DROP POLICY IF EXISTS "Users can insert own company_settings" ON public.company_settings;
DROP POLICY IF EXISTS "Users can update own company_settings" ON public.company_settings;
DROP POLICY IF EXISTS "Users can delete own company_settings" ON public.company_settings;

CREATE POLICY "Org members can select company_settings" ON public.company_settings
  FOR SELECT TO authenticated USING (public.is_org_member(org_id));
CREATE POLICY "Org members can insert company_settings" ON public.company_settings
  FOR INSERT TO authenticated WITH CHECK (public.is_org_member(org_id));
CREATE POLICY "Org members can update company_settings" ON public.company_settings
  FOR UPDATE TO authenticated USING (public.is_org_member(org_id)) WITH CHECK (public.is_org_member(org_id));
CREATE POLICY "Org members can delete company_settings" ON public.company_settings
  FOR DELETE TO authenticated USING (public.is_org_member(org_id));

-- ============================================
-- RLS: projects
-- ============================================
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can insert own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can update own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can delete own projects" ON public.projects;

CREATE POLICY "Org members can select projects" ON public.projects
  FOR SELECT TO authenticated USING (public.is_org_member(org_id));
CREATE POLICY "Org members can insert projects" ON public.projects
  FOR INSERT TO authenticated WITH CHECK (public.is_org_member(org_id));
CREATE POLICY "Org members can update projects" ON public.projects
  FOR UPDATE TO authenticated USING (public.is_org_member(org_id)) WITH CHECK (public.is_org_member(org_id));
CREATE POLICY "Org members can delete projects" ON public.projects
  FOR DELETE TO authenticated USING (public.is_org_member(org_id));

-- ============================================
-- RLS: purchase_orders
-- ============================================
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own purchase_orders" ON public.purchase_orders;
DROP POLICY IF EXISTS "Users can insert own purchase_orders" ON public.purchase_orders;
DROP POLICY IF EXISTS "Users can update own purchase_orders" ON public.purchase_orders;
DROP POLICY IF EXISTS "Users can delete own purchase_orders" ON public.purchase_orders;

CREATE POLICY "Org members can select purchase_orders" ON public.purchase_orders
  FOR SELECT TO authenticated USING (public.is_org_member(org_id));
CREATE POLICY "Org members can insert purchase_orders" ON public.purchase_orders
  FOR INSERT TO authenticated WITH CHECK (public.is_org_member(org_id));
CREATE POLICY "Org members can update purchase_orders" ON public.purchase_orders
  FOR UPDATE TO authenticated USING (public.is_org_member(org_id)) WITH CHECK (public.is_org_member(org_id));
CREATE POLICY "Org members can delete purchase_orders" ON public.purchase_orders
  FOR DELETE TO authenticated USING (public.is_org_member(org_id));

-- ============================================
-- RLS: suppliers
-- ============================================
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Users can insert own suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Users can update own suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Users can delete own suppliers" ON public.suppliers;

CREATE POLICY "Org members can select suppliers" ON public.suppliers
  FOR SELECT TO authenticated USING (public.is_org_member(org_id));
CREATE POLICY "Org members can insert suppliers" ON public.suppliers
  FOR INSERT TO authenticated WITH CHECK (public.is_org_member(org_id));
CREATE POLICY "Org members can update suppliers" ON public.suppliers
  FOR UPDATE TO authenticated USING (public.is_org_member(org_id)) WITH CHECK (public.is_org_member(org_id));
CREATE POLICY "Org members can delete suppliers" ON public.suppliers
  FOR DELETE TO authenticated USING (public.is_org_member(org_id));

-- ============================================
-- RLS: supplier_quotes
-- ============================================
ALTER TABLE public.supplier_quotes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own supplier quotes" ON public.supplier_quotes;

CREATE POLICY "Org members can select supplier_quotes" ON public.supplier_quotes
  FOR SELECT TO authenticated USING (public.is_org_member(org_id));
CREATE POLICY "Org members can insert supplier_quotes" ON public.supplier_quotes
  FOR INSERT TO authenticated WITH CHECK (public.is_org_member(org_id));
CREATE POLICY "Org members can update supplier_quotes" ON public.supplier_quotes
  FOR UPDATE TO authenticated USING (public.is_org_member(org_id)) WITH CHECK (public.is_org_member(org_id));
CREATE POLICY "Org members can delete supplier_quotes" ON public.supplier_quotes
  FOR DELETE TO authenticated USING (public.is_org_member(org_id));

-- ============================================
-- RLS: supplier_sample_requests
-- ============================================
ALTER TABLE public.supplier_sample_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can select supplier_sample_requests" ON public.supplier_sample_requests
  FOR SELECT TO authenticated USING (public.is_org_member(org_id));
CREATE POLICY "Org members can insert supplier_sample_requests" ON public.supplier_sample_requests
  FOR INSERT TO authenticated WITH CHECK (public.is_org_member(org_id));
CREATE POLICY "Org members can update supplier_sample_requests" ON public.supplier_sample_requests
  FOR UPDATE TO authenticated USING (public.is_org_member(org_id)) WITH CHECK (public.is_org_member(org_id));
CREATE POLICY "Org members can delete supplier_sample_requests" ON public.supplier_sample_requests
  FOR DELETE TO authenticated USING (public.is_org_member(org_id));
