-- ============================================
-- F2 CBA — PAS 2: RLS billing gating
-- ============================================
-- 1) Funció org_billing_allows_access(p_org_id)
-- 2) Policies tenant amb gating; excepció owner per SELECT (recuperació)
-- 3) orgs + org_memberships: owner pot llegir/gestinar encara que billing bloquejat
-- No toquem taules REFERENCE, health_*, ni altres taules fora tenant-data.
-- ============================================

-- 1) Funció canònica: true només si billing_status IN ('trialing','active')
CREATE OR REPLACE FUNCTION public.org_billing_allows_access(p_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.orgs o
    WHERE o.id = p_org_id
      AND o.billing_status IN ('trialing', 'active')
  );
$$;

COMMENT ON FUNCTION public.org_billing_allows_access(uuid) IS 'True if org exists and billing_status is trialing or active (F2 CBA gating).';

-- 2) orgs: SELECT amb excepció owner (per poder anar a billing); UPDATE/DELETE ja són owner_or_admin
DROP POLICY IF EXISTS "Members can select org" ON public.orgs;
CREATE POLICY "Members can select org" ON public.orgs
  FOR SELECT TO authenticated
  USING (
    public.is_org_member(id)
    AND (public.org_billing_allows_access(id) OR public.is_org_owner_or_admin(id))
  );

-- 3) org_memberships: SELECT amb excepció owner (recuperació); insert/update/delete queden owner_or_admin
DROP POLICY IF EXISTS "Members can select org_memberships" ON public.org_memberships;
CREATE POLICY "Members can select org_memberships" ON public.org_memberships
  FOR SELECT TO authenticated
  USING (
    public.is_org_member(org_id)
    AND (public.org_billing_allows_access(org_id) OR public.is_org_owner_or_admin(org_id))
  );

-- 4) Taules tenant CORE: projects, suppliers, supplier_quotes, purchase_orders
--    SELECT: member AND (billing OR owner); INSERT/UPDATE/DELETE: member AND billing

-- projects
DROP POLICY IF EXISTS "Org members can select projects" ON public.projects;
DROP POLICY IF EXISTS "Org members can insert projects" ON public.projects;
DROP POLICY IF EXISTS "Org members can update projects" ON public.projects;
DROP POLICY IF EXISTS "Org members can delete projects" ON public.projects;
CREATE POLICY "Org members can select projects" ON public.projects
  FOR SELECT TO authenticated
  USING (public.is_org_member(org_id) AND (public.org_billing_allows_access(org_id) OR public.is_org_owner_or_admin(org_id)));
CREATE POLICY "Org members can insert projects" ON public.projects
  FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(org_id) AND public.org_billing_allows_access(org_id));
CREATE POLICY "Org members can update projects" ON public.projects
  FOR UPDATE TO authenticated
  USING (public.is_org_member(org_id) AND public.org_billing_allows_access(org_id))
  WITH CHECK (public.is_org_member(org_id) AND public.org_billing_allows_access(org_id));
CREATE POLICY "Org members can delete projects" ON public.projects
  FOR DELETE TO authenticated
  USING (public.is_org_member(org_id) AND public.org_billing_allows_access(org_id));

-- suppliers
DROP POLICY IF EXISTS "Org members can select suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Org members can insert suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Org members can update suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Org members can delete suppliers" ON public.suppliers;
CREATE POLICY "Org members can select suppliers" ON public.suppliers
  FOR SELECT TO authenticated
  USING (public.is_org_member(org_id) AND (public.org_billing_allows_access(org_id) OR public.is_org_owner_or_admin(org_id)));
CREATE POLICY "Org members can insert suppliers" ON public.suppliers
  FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(org_id) AND public.org_billing_allows_access(org_id));
CREATE POLICY "Org members can update suppliers" ON public.suppliers
  FOR UPDATE TO authenticated
  USING (public.is_org_member(org_id) AND public.org_billing_allows_access(org_id))
  WITH CHECK (public.is_org_member(org_id) AND public.org_billing_allows_access(org_id));
CREATE POLICY "Org members can delete suppliers" ON public.suppliers
  FOR DELETE TO authenticated
  USING (public.is_org_member(org_id) AND public.org_billing_allows_access(org_id));

-- supplier_quotes
DROP POLICY IF EXISTS "Org members can select supplier_quotes" ON public.supplier_quotes;
DROP POLICY IF EXISTS "Org members can insert supplier_quotes" ON public.supplier_quotes;
DROP POLICY IF EXISTS "Org members can update supplier_quotes" ON public.supplier_quotes;
DROP POLICY IF EXISTS "Org members can delete supplier_quotes" ON public.supplier_quotes;
CREATE POLICY "Org members can select supplier_quotes" ON public.supplier_quotes
  FOR SELECT TO authenticated
  USING (public.is_org_member(org_id) AND (public.org_billing_allows_access(org_id) OR public.is_org_owner_or_admin(org_id)));
CREATE POLICY "Org members can insert supplier_quotes" ON public.supplier_quotes
  FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(org_id) AND public.org_billing_allows_access(org_id));
CREATE POLICY "Org members can update supplier_quotes" ON public.supplier_quotes
  FOR UPDATE TO authenticated
  USING (public.is_org_member(org_id) AND public.org_billing_allows_access(org_id))
  WITH CHECK (public.is_org_member(org_id) AND public.org_billing_allows_access(org_id));
CREATE POLICY "Org members can delete supplier_quotes" ON public.supplier_quotes
  FOR DELETE TO authenticated
  USING (public.is_org_member(org_id) AND public.org_billing_allows_access(org_id));

-- purchase_orders
DROP POLICY IF EXISTS "Org members can select purchase_orders" ON public.purchase_orders;
DROP POLICY IF EXISTS "Org members can insert purchase_orders" ON public.purchase_orders;
DROP POLICY IF EXISTS "Org members can update purchase_orders" ON public.purchase_orders;
DROP POLICY IF EXISTS "Org members can delete purchase_orders" ON public.purchase_orders;
CREATE POLICY "Org members can select purchase_orders" ON public.purchase_orders
  FOR SELECT TO authenticated
  USING (public.is_org_member(org_id) AND (public.org_billing_allows_access(org_id) OR public.is_org_owner_or_admin(org_id)));
CREATE POLICY "Org members can insert purchase_orders" ON public.purchase_orders
  FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(org_id) AND public.org_billing_allows_access(org_id));
CREATE POLICY "Org members can update purchase_orders" ON public.purchase_orders
  FOR UPDATE TO authenticated
  USING (public.is_org_member(org_id) AND public.org_billing_allows_access(org_id))
  WITH CHECK (public.is_org_member(org_id) AND public.org_billing_allows_access(org_id));
CREATE POLICY "Org members can delete purchase_orders" ON public.purchase_orders
  FOR DELETE TO authenticated
  USING (public.is_org_member(org_id) AND public.org_billing_allows_access(org_id));

-- 5) tasks, sticky_notes (policy única "Org members can manage X" -> cal substituir per 4)
-- tasks
DROP POLICY IF EXISTS "Org members can manage tasks" ON public.tasks;
CREATE POLICY "Org members can select tasks" ON public.tasks
  FOR SELECT TO authenticated
  USING (public.is_org_member(org_id) AND (public.org_billing_allows_access(org_id) OR public.is_org_owner_or_admin(org_id)));
CREATE POLICY "Org members can insert tasks" ON public.tasks
  FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(org_id) AND public.org_billing_allows_access(org_id));
CREATE POLICY "Org members can update tasks" ON public.tasks
  FOR UPDATE TO authenticated
  USING (public.is_org_member(org_id) AND public.org_billing_allows_access(org_id))
  WITH CHECK (public.is_org_member(org_id) AND public.org_billing_allows_access(org_id));
CREATE POLICY "Org members can delete tasks" ON public.tasks
  FOR DELETE TO authenticated
  USING (public.is_org_member(org_id) AND public.org_billing_allows_access(org_id));

-- sticky_notes
DROP POLICY IF EXISTS "Org members can manage sticky notes" ON public.sticky_notes;
CREATE POLICY "Org members can select sticky_notes" ON public.sticky_notes
  FOR SELECT TO authenticated
  USING (public.is_org_member(org_id) AND (public.org_billing_allows_access(org_id) OR public.is_org_owner_or_admin(org_id)));
CREATE POLICY "Org members can insert sticky_notes" ON public.sticky_notes
  FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(org_id) AND public.org_billing_allows_access(org_id));
CREATE POLICY "Org members can update sticky_notes" ON public.sticky_notes
  FOR UPDATE TO authenticated
  USING (public.is_org_member(org_id) AND public.org_billing_allows_access(org_id))
  WITH CHECK (public.is_org_member(org_id) AND public.org_billing_allows_access(org_id));
CREATE POLICY "Org members can delete sticky_notes" ON public.sticky_notes
  FOR DELETE TO authenticated
  USING (public.is_org_member(org_id) AND public.org_billing_allows_access(org_id));

-- 6) expenses, incomes (finances)
DROP POLICY IF EXISTS "Org members can manage expenses" ON public.expenses;
CREATE POLICY "Org members can select expenses" ON public.expenses
  FOR SELECT TO authenticated
  USING (public.is_org_member(org_id) AND (public.org_billing_allows_access(org_id) OR public.is_org_owner_or_admin(org_id)));
CREATE POLICY "Org members can insert expenses" ON public.expenses
  FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(org_id) AND public.org_billing_allows_access(org_id));
CREATE POLICY "Org members can update expenses" ON public.expenses
  FOR UPDATE TO authenticated
  USING (public.is_org_member(org_id) AND public.org_billing_allows_access(org_id))
  WITH CHECK (public.is_org_member(org_id) AND public.org_billing_allows_access(org_id));
CREATE POLICY "Org members can delete expenses" ON public.expenses
  FOR DELETE TO authenticated
  USING (public.is_org_member(org_id) AND public.org_billing_allows_access(org_id));

DROP POLICY IF EXISTS "Org members can manage incomes" ON public.incomes;
CREATE POLICY "Org members can select incomes" ON public.incomes
  FOR SELECT TO authenticated
  USING (public.is_org_member(org_id) AND (public.org_billing_allows_access(org_id) OR public.is_org_owner_or_admin(org_id)));
CREATE POLICY "Org members can insert incomes" ON public.incomes
  FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(org_id) AND public.org_billing_allows_access(org_id));
CREATE POLICY "Org members can update incomes" ON public.incomes
  FOR UPDATE TO authenticated
  USING (public.is_org_member(org_id) AND public.org_billing_allows_access(org_id))
  WITH CHECK (public.is_org_member(org_id) AND public.org_billing_allows_access(org_id));
CREATE POLICY "Org members can delete incomes" ON public.incomes
  FOR DELETE TO authenticated
  USING (public.is_org_member(org_id) AND public.org_billing_allows_access(org_id));

-- 7) logistics_flow
DROP POLICY IF EXISTS "Org members can manage logistics_flow" ON public.logistics_flow;
CREATE POLICY "Org members can select logistics_flow" ON public.logistics_flow
  FOR SELECT TO authenticated
  USING (public.is_org_member(org_id) AND (public.org_billing_allows_access(org_id) OR public.is_org_owner_or_admin(org_id)));
CREATE POLICY "Org members can insert logistics_flow" ON public.logistics_flow
  FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(org_id) AND public.org_billing_allows_access(org_id));
CREATE POLICY "Org members can update logistics_flow" ON public.logistics_flow
  FOR UPDATE TO authenticated
  USING (public.is_org_member(org_id) AND public.org_billing_allows_access(org_id))
  WITH CHECK (public.is_org_member(org_id) AND public.org_billing_allows_access(org_id));
CREATE POLICY "Org members can delete logistics_flow" ON public.logistics_flow
  FOR DELETE TO authenticated
  USING (public.is_org_member(org_id) AND public.org_billing_allows_access(org_id));

-- ============================================
-- PENDENTS (iteració següent): company_settings, supplier_sample_requests,
-- orders, order_items, sales, project_events, product_identifiers, gtin_pool,
-- payments, po_amazon_readiness, po_shipments, supplier_price_estimates,
-- recurring_expenses, recurring_expense_occurrences, documents, expense_attachments,
-- warehouses, project_viability, project_phases, project_marketplaces, project_tasks,
-- supplier_quote_price_breaks, inventory_movements, etc.
-- Aplicar el mateix patró: SELECT (billing OR owner), INSERT/UPDATE/DELETE (billing).
-- ============================================
--
-- VALIDACIÓ (smoke test manual després de db push):
-- 1) Usuari MEMBER en org amb billing_status = 'past_due':
--    - SELECT a public.projects (org_id d'aquesta org) -> 0 rows esperat.
-- 2) Usuari OWNER en org amb billing_status = 'past_due':
--    - SELECT a public.orgs WHERE id = org_id -> 1 row.
--    - SELECT a public.org_memberships WHERE org_id = org_id -> rows de l'org.
--    - (Opcional) DELETE un membership per reduir seats -> permès.
-- 3) Usuari MEMBER en org amb billing_status = 'active':
--    - SELECT a public.projects -> rows de l'org.
-- Queries (substituir :org_id_past_due, :org_id_active pels UUID reals):
--   SELECT org_billing_allows_access(:org_id_past_due);  -- false
--   SELECT org_billing_allows_access(:org_id_active);     -- true
-- ============================================
