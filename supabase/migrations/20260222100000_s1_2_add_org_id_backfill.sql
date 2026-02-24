-- ============================================
-- S1.2 — Add org_id (nullable) + backfill — TENANT-DATA
-- ============================================
-- Taules que JA tenen org_id (no tocar): company_settings, projects, purchase_orders,
--   suppliers, supplier_quotes, supplier_sample_requests.
-- La resta de TENANT-DATA: add column + backfill segur (project_id / user_id / parent FK).
-- ============================================

-- ---------------------------------------------------------------------------
-- A) ADD COLUMN org_id (nullable) a totes les TENANT-DATA que no el tenen
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  t text;
  tenant_tables text[] := ARRAY[
    'alert_events','alert_rules','app_events','audit_log','briefings','briefs',
    'dashboard_preferences','decision_log','documents','events','expense_attachments',
    'expenses','finance_categories','financial_events','gtin_assignments','gtin_pool',
    'health_runs','incomes','inventory','inventory_movements','listings','logistics_flow',
    'order_items','orders','payments','po_amazon_readiness','po_shipments',
    'product_identifiers','product_variants','project_events','project_hypotheses',
    'project_marketplaces','project_phases','project_profitability_basic','project_tasks',
    'project_viability','recurring_expense_occurrences','recurring_expenses',
    'sales','signatures','sticky_notes','stock','supplier_price_estimates',
    'supplier_quote_price_breaks','tasks','user_counters','warehouses'
  ];
  has_org boolean;
BEGIN
  FOREACH t IN ARRAY tenant_tables
  LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = t) THEN
      SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = t AND column_name = 'org_id') INTO has_org;
      IF NOT has_org THEN
        EXECUTE format('ALTER TABLE public.%I ADD COLUMN org_id uuid', t);
      END IF;
    END IF;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- B) BACKFILL — project_id (org des de projects)
-- ---------------------------------------------------------------------------
-- briefings, documents, expenses, incomes, payments, project_events, project_profitability_basic,
-- product_identifiers, signatures, sticky_notes, supplier_price_estimates, tasks
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='briefings' AND column_name='project_id') THEN
    UPDATE public.briefings b SET org_id = p.org_id FROM public.projects p WHERE b.project_id = p.id AND p.org_id IS NOT NULL AND b.org_id IS NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='documents' AND column_name='project_id') THEN
    UPDATE public.documents d SET org_id = p.org_id FROM public.projects p WHERE d.project_id = p.id AND p.org_id IS NOT NULL AND d.org_id IS NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='expenses' AND column_name='project_id') THEN
    UPDATE public.expenses e SET org_id = p.org_id FROM public.projects p WHERE e.project_id = p.id AND p.org_id IS NOT NULL AND e.org_id IS NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='incomes' AND column_name='project_id') THEN
    UPDATE public.incomes i SET org_id = p.org_id FROM public.projects p WHERE i.project_id = p.id AND p.org_id IS NOT NULL AND i.org_id IS NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='payments' AND column_name='project_id') THEN
    UPDATE public.payments py SET org_id = p.org_id FROM public.projects p WHERE py.project_id = p.id AND p.org_id IS NOT NULL AND py.org_id IS NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='project_events' AND column_name='project_id') THEN
    UPDATE public.project_events pe SET org_id = p.org_id FROM public.projects p WHERE pe.project_id = p.id AND p.org_id IS NOT NULL AND pe.org_id IS NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='project_profitability_basic' AND column_name='project_id') THEN
    UPDATE public.project_profitability_basic ppb SET org_id = p.org_id FROM public.projects p WHERE ppb.project_id = p.id AND p.org_id IS NOT NULL AND ppb.org_id IS NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='product_identifiers' AND column_name='project_id') THEN
    UPDATE public.product_identifiers pi SET org_id = p.org_id FROM public.projects p WHERE pi.project_id = p.id AND p.org_id IS NOT NULL AND pi.org_id IS NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='signatures' AND column_name='project_id') THEN
    UPDATE public.signatures s SET org_id = p.org_id FROM public.projects p WHERE s.project_id = p.id AND p.org_id IS NOT NULL AND s.org_id IS NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='sticky_notes' AND column_name='project_id') THEN
    UPDATE public.sticky_notes sn SET org_id = p.org_id FROM public.projects p WHERE sn.project_id = p.id AND p.org_id IS NOT NULL AND sn.org_id IS NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='supplier_price_estimates' AND column_name='project_id') THEN
    UPDATE public.supplier_price_estimates spe SET org_id = p.org_id FROM public.projects p WHERE spe.project_id = p.id AND p.org_id IS NOT NULL AND spe.org_id IS NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='tasks' AND column_name='project_id') THEN
    UPDATE public.tasks tk SET org_id = p.org_id FROM public.projects p WHERE tk.project_id = p.id AND p.org_id IS NOT NULL AND tk.org_id IS NULL;
  END IF;
  -- project_viability, project_phases, project_hypotheses, project_marketplaces, project_tasks (if separate table)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='project_viability')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='project_viability' AND column_name='project_id') THEN
    UPDATE public.project_viability pv SET org_id = p.org_id FROM public.projects p WHERE pv.project_id = p.id AND p.org_id IS NOT NULL AND pv.org_id IS NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='project_phases')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='project_phases' AND column_name='project_id') THEN
    UPDATE public.project_phases pph SET org_id = p.org_id FROM public.projects p WHERE pph.project_id = p.id AND p.org_id IS NOT NULL AND pph.org_id IS NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='project_hypotheses')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='project_hypotheses' AND column_name='project_id') THEN
    UPDATE public.project_hypotheses ph SET org_id = p.org_id FROM public.projects p WHERE ph.project_id = p.id AND p.org_id IS NOT NULL AND ph.org_id IS NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='project_marketplaces')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='project_marketplaces' AND column_name='project_id') THEN
    UPDATE public.project_marketplaces pm SET org_id = p.org_id FROM public.projects p WHERE pm.project_id = p.id AND p.org_id IS NOT NULL AND pm.org_id IS NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='project_tasks')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='project_tasks' AND column_name='project_id') THEN
    UPDATE public.project_tasks pt SET org_id = p.org_id FROM public.projects p WHERE pt.project_id = p.id AND p.org_id IS NOT NULL AND pt.org_id IS NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='gtin_assignments')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='gtin_assignments' AND column_name='project_id') THEN
    UPDATE public.gtin_assignments ga SET org_id = p.org_id FROM public.projects p WHERE ga.project_id = p.id AND p.org_id IS NOT NULL AND ga.org_id IS NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='product_variants')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='product_variants' AND column_name='project_id') THEN
    UPDATE public.product_variants pvar SET org_id = p.org_id FROM public.projects p WHERE pvar.project_id = p.id AND p.org_id IS NOT NULL AND pvar.org_id IS NULL;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- C) BACKFILL — purchase_order_id (org des de purchase_orders)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='po_amazon_readiness' AND column_name='purchase_order_id') THEN
    UPDATE public.po_amazon_readiness ar SET org_id = po.org_id FROM public.purchase_orders po WHERE ar.purchase_order_id = po.id AND po.org_id IS NOT NULL AND ar.org_id IS NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='po_shipments' AND column_name='purchase_order_id') THEN
    UPDATE public.po_shipments ps SET org_id = po.org_id FROM public.purchase_orders po WHERE ps.purchase_order_id = po.id AND po.org_id IS NOT NULL AND ps.org_id IS NULL;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- D) BACKFILL — supplier_id (org des de suppliers)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='supplier_quote_price_breaks')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='supplier_quote_price_breaks' AND column_name='quote_id') THEN
    UPDATE public.supplier_quote_price_breaks sqpb SET org_id = sq.org_id FROM public.supplier_quotes sq WHERE sqpb.quote_id = sq.id AND sq.org_id IS NOT NULL AND sqpb.org_id IS NULL;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- E) BACKFILL — quote_id (org des de supplier_quotes)
-- ---------------------------------------------------------------------------
-- (supplier_quote_price_breaks ja fet a D si té quote_id)

-- ---------------------------------------------------------------------------
-- F) BACKFILL — child: expense_id -> expenses.org_id
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='expense_attachments' AND column_name='expense_id') THEN
    UPDATE public.expense_attachments ea SET org_id = e.org_id FROM public.expenses e WHERE ea.expense_id = e.id AND e.org_id IS NOT NULL AND ea.org_id IS NULL;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- G) BACKFILL — child: recurring_expense_id -> recurring_expenses.org_id
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='recurring_expense_occurrences' AND column_name='recurring_expense_id') THEN
    UPDATE public.recurring_expense_occurrences ro SET org_id = r.org_id FROM public.recurring_expenses r WHERE ro.recurring_expense_id = r.id AND r.org_id IS NOT NULL AND ro.org_id IS NULL;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- H) BACKFILL — user_id (org des de org_memberships, primer org del user)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  -- audit_log, dashboard_preferences, decision_log, finance_categories, gtin_pool,
  -- recurring_expenses, user_counters, warehouses; + fallback per qualsevol amb user_id
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='audit_log' AND column_name='user_id') THEN
    UPDATE public.audit_log al SET org_id = (SELECT om.org_id FROM public.org_memberships om WHERE om.user_id = al.user_id ORDER BY om.created_at LIMIT 1) WHERE al.org_id IS NULL AND al.user_id IS NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='briefings' AND column_name='user_id') THEN
    UPDATE public.briefings b SET org_id = (SELECT om.org_id FROM public.org_memberships om WHERE om.user_id = b.user_id ORDER BY om.created_at LIMIT 1) WHERE b.org_id IS NULL AND b.user_id IS NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='dashboard_preferences' AND column_name='user_id') THEN
    UPDATE public.dashboard_preferences dp SET org_id = (SELECT om.org_id FROM public.org_memberships om WHERE om.user_id = dp.user_id ORDER BY om.created_at LIMIT 1) WHERE dp.org_id IS NULL AND dp.user_id IS NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='decision_log' AND column_name='user_id') THEN
    UPDATE public.decision_log dl SET org_id = (SELECT om.org_id FROM public.org_memberships om WHERE om.user_id = dl.user_id ORDER BY om.created_at LIMIT 1) WHERE dl.org_id IS NULL AND dl.user_id IS NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='documents' AND column_name='user_id') THEN
    UPDATE public.documents d SET org_id = (SELECT om.org_id FROM public.org_memberships om WHERE om.user_id = d.user_id ORDER BY om.created_at LIMIT 1) WHERE d.org_id IS NULL AND d.user_id IS NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='expense_attachments' AND column_name='user_id') THEN
    UPDATE public.expense_attachments ea SET org_id = (SELECT om.org_id FROM public.org_memberships om WHERE om.user_id = ea.user_id ORDER BY om.created_at LIMIT 1) WHERE ea.org_id IS NULL AND ea.user_id IS NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='expenses' AND column_name='user_id') THEN
    UPDATE public.expenses e SET org_id = (SELECT om.org_id FROM public.org_memberships om WHERE om.user_id = e.user_id ORDER BY om.created_at LIMIT 1) WHERE e.org_id IS NULL AND e.user_id IS NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='finance_categories' AND column_name='user_id') THEN
    UPDATE public.finance_categories fc SET org_id = (SELECT om.org_id FROM public.org_memberships om WHERE om.user_id = fc.user_id ORDER BY om.created_at LIMIT 1) WHERE fc.org_id IS NULL AND fc.user_id IS NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='gtin_pool' AND column_name='user_id') THEN
    UPDATE public.gtin_pool gp SET org_id = (SELECT om.org_id FROM public.org_memberships om WHERE om.user_id = gp.user_id ORDER BY om.created_at LIMIT 1) WHERE gp.org_id IS NULL AND gp.user_id IS NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='incomes' AND column_name='user_id') THEN
    UPDATE public.incomes i SET org_id = (SELECT om.org_id FROM public.org_memberships om WHERE om.user_id = i.user_id ORDER BY om.created_at LIMIT 1) WHERE i.org_id IS NULL AND i.user_id IS NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='payments' AND column_name='user_id') THEN
    UPDATE public.payments py SET org_id = (SELECT om.org_id FROM public.org_memberships om WHERE om.user_id = py.user_id ORDER BY om.created_at LIMIT 1) WHERE py.org_id IS NULL AND py.user_id IS NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='po_amazon_readiness' AND column_name='user_id') THEN
    UPDATE public.po_amazon_readiness ar SET org_id = (SELECT om.org_id FROM public.org_memberships om WHERE om.user_id = ar.user_id ORDER BY om.created_at LIMIT 1) WHERE ar.org_id IS NULL AND ar.user_id IS NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='po_shipments' AND column_name='user_id') THEN
    UPDATE public.po_shipments ps SET org_id = (SELECT om.org_id FROM public.org_memberships om WHERE om.user_id = ps.user_id ORDER BY om.created_at LIMIT 1) WHERE ps.org_id IS NULL AND ps.user_id IS NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='product_identifiers' AND column_name='user_id') THEN
    UPDATE public.product_identifiers pi SET org_id = (SELECT om.org_id FROM public.org_memberships om WHERE om.user_id = pi.user_id ORDER BY om.created_at LIMIT 1) WHERE pi.org_id IS NULL AND pi.user_id IS NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='project_events' AND column_name='user_id') THEN
    UPDATE public.project_events pe SET org_id = (SELECT om.org_id FROM public.org_memberships om WHERE om.user_id = pe.user_id ORDER BY om.created_at LIMIT 1) WHERE pe.org_id IS NULL AND pe.user_id IS NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='project_profitability_basic' AND column_name='user_id') THEN
    UPDATE public.project_profitability_basic ppb SET org_id = (SELECT om.org_id FROM public.org_memberships om WHERE om.user_id = ppb.user_id ORDER BY om.created_at LIMIT 1) WHERE ppb.org_id IS NULL AND ppb.user_id IS NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='recurring_expenses' AND column_name='user_id') THEN
    UPDATE public.recurring_expenses r SET org_id = (SELECT om.org_id FROM public.org_memberships om WHERE om.user_id = r.user_id ORDER BY om.created_at LIMIT 1) WHERE r.org_id IS NULL AND r.user_id IS NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='recurring_expense_occurrences' AND column_name='user_id') THEN
    UPDATE public.recurring_expense_occurrences ro SET org_id = (SELECT om.org_id FROM public.org_memberships om WHERE om.user_id = ro.user_id ORDER BY om.created_at LIMIT 1) WHERE ro.org_id IS NULL AND ro.user_id IS NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='signatures' AND column_name='user_id') THEN
    UPDATE public.signatures s SET org_id = (SELECT om.org_id FROM public.org_memberships om WHERE om.user_id = s.user_id ORDER BY om.created_at LIMIT 1) WHERE s.org_id IS NULL AND s.user_id IS NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='sticky_notes' AND column_name='user_id') THEN
    UPDATE public.sticky_notes sn SET org_id = (SELECT om.org_id FROM public.org_memberships om WHERE om.user_id = sn.user_id ORDER BY om.created_at LIMIT 1) WHERE sn.org_id IS NULL AND sn.user_id IS NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='supplier_price_estimates' AND column_name='user_id') THEN
    UPDATE public.supplier_price_estimates spe SET org_id = (SELECT om.org_id FROM public.org_memberships om WHERE om.user_id = spe.user_id ORDER BY om.created_at LIMIT 1) WHERE spe.org_id IS NULL AND spe.user_id IS NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='tasks' AND column_name='user_id') THEN
    UPDATE public.tasks tk SET org_id = (SELECT om.org_id FROM public.org_memberships om WHERE om.user_id = tk.user_id ORDER BY om.created_at LIMIT 1) WHERE tk.org_id IS NULL AND tk.user_id IS NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='user_counters' AND column_name='user_id') THEN
    UPDATE public.user_counters uc SET org_id = (SELECT om.org_id FROM public.org_memberships om WHERE om.user_id = uc.user_id ORDER BY om.created_at LIMIT 1) WHERE uc.org_id IS NULL AND uc.user_id IS NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='warehouses' AND column_name='user_id') THEN
    UPDATE public.warehouses w SET org_id = (SELECT om.org_id FROM public.org_memberships om WHERE om.user_id = w.user_id ORDER BY om.created_at LIMIT 1) WHERE w.org_id IS NULL AND w.user_id IS NOT NULL;
  END IF;
  -- Taules opcionals
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='alert_events') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='alert_events' AND column_name='user_id') THEN
    UPDATE public.alert_events ae SET org_id = (SELECT om.org_id FROM public.org_memberships om WHERE om.user_id = ae.user_id ORDER BY om.created_at LIMIT 1) WHERE ae.org_id IS NULL AND ae.user_id IS NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='alert_rules') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='alert_rules' AND column_name='user_id') THEN
    UPDATE public.alert_rules ar SET org_id = (SELECT om.org_id FROM public.org_memberships om WHERE om.user_id = ar.user_id ORDER BY om.created_at LIMIT 1) WHERE ar.org_id IS NULL AND ar.user_id IS NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='app_events') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='app_events' AND column_name='user_id') THEN
    UPDATE public.app_events ae SET org_id = (SELECT om.org_id FROM public.org_memberships om WHERE om.user_id = ae.user_id ORDER BY om.created_at LIMIT 1) WHERE ae.org_id IS NULL AND ae.user_id IS NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='events') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='events' AND column_name='user_id') THEN
    UPDATE public.events ev SET org_id = (SELECT om.org_id FROM public.org_memberships om WHERE om.user_id = ev.user_id ORDER BY om.created_at LIMIT 1) WHERE ev.org_id IS NULL AND ev.user_id IS NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='logistics_flow') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='logistics_flow' AND column_name='user_id') THEN
    UPDATE public.logistics_flow lf SET org_id = (SELECT om.org_id FROM public.org_memberships om WHERE om.user_id = lf.user_id ORDER BY om.created_at LIMIT 1) WHERE lf.org_id IS NULL AND lf.user_id IS NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='health_runs') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='health_runs' AND column_name='user_id') THEN
    UPDATE public.health_runs hr SET org_id = (SELECT om.org_id FROM public.org_memberships om WHERE om.user_id = hr.user_id ORDER BY om.created_at LIMIT 1) WHERE hr.org_id IS NULL AND hr.user_id IS NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='health_runs') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='health_runs' AND column_name='project_id') THEN
    UPDATE public.health_runs hr SET org_id = p.org_id FROM public.projects p WHERE hr.project_id = p.id AND p.org_id IS NOT NULL AND hr.org_id IS NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='product_variants') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='product_variants' AND column_name='user_id') THEN
    UPDATE public.product_variants pv SET org_id = (SELECT om.org_id FROM public.org_memberships om WHERE om.user_id = pv.user_id ORDER BY om.created_at LIMIT 1) WHERE pv.org_id IS NULL AND pv.user_id IS NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='briefs') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='briefs' AND column_name='user_id') THEN
    UPDATE public.briefs br SET org_id = (SELECT om.org_id FROM public.org_memberships om WHERE om.user_id = br.user_id ORDER BY om.created_at LIMIT 1) WHERE br.org_id IS NULL AND br.user_id IS NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='financial_events') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='financial_events' AND column_name='user_id') THEN
    UPDATE public.financial_events fe SET org_id = (SELECT om.org_id FROM public.org_memberships om WHERE om.user_id = fe.user_id ORDER BY om.created_at LIMIT 1) WHERE fe.org_id IS NULL AND fe.user_id IS NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='orders') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orders' AND column_name='user_id') THEN
    UPDATE public.orders o SET org_id = (SELECT om.org_id FROM public.org_memberships om WHERE om.user_id = o.user_id ORDER BY om.created_at LIMIT 1) WHERE o.org_id IS NULL AND o.user_id IS NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='orders') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orders' AND column_name='project_id') THEN
    UPDATE public.orders o SET org_id = p.org_id FROM public.projects p WHERE o.project_id = p.id AND p.org_id IS NOT NULL AND o.org_id IS NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='sales') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='sales' AND column_name='user_id') THEN
    UPDATE public.sales sal SET org_id = (SELECT om.org_id FROM public.org_memberships om WHERE om.user_id = sal.user_id ORDER BY om.created_at LIMIT 1) WHERE sal.org_id IS NULL AND sal.user_id IS NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='inventory') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='inventory' AND column_name='warehouse_id') THEN
    UPDATE public.inventory inv SET org_id = w.org_id FROM public.warehouses w WHERE inv.warehouse_id = w.id AND w.org_id IS NOT NULL AND inv.org_id IS NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='inventory') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='inventory' AND column_name='user_id') THEN
    UPDATE public.inventory inv SET org_id = (SELECT om.org_id FROM public.org_memberships om WHERE om.user_id = inv.user_id ORDER BY om.created_at LIMIT 1) WHERE inv.org_id IS NULL AND inv.user_id IS NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='order_items') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='order_items' AND column_name='order_id') THEN
    UPDATE public.order_items oi SET org_id = o.org_id FROM public.orders o WHERE oi.order_id = o.id AND o.org_id IS NOT NULL AND oi.org_id IS NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='inventory_movements') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='inventory_movements' AND column_name='warehouse_id') THEN
    UPDATE public.inventory_movements im SET org_id = w.org_id FROM public.warehouses w WHERE im.warehouse_id = w.id AND w.org_id IS NOT NULL AND im.org_id IS NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='listings') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='listings' AND column_name='project_id') THEN
    UPDATE public.listings lst SET org_id = p.org_id FROM public.projects p WHERE lst.project_id = p.id AND p.org_id IS NOT NULL AND lst.org_id IS NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='stock') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='stock' AND column_name='warehouse_id') THEN
    UPDATE public.stock st SET org_id = w.org_id FROM public.warehouses w WHERE st.warehouse_id = w.id AND w.org_id IS NOT NULL AND st.org_id IS NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='supplier_quote_price_breaks') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='supplier_quote_price_breaks' AND column_name='supplier_id') THEN
    UPDATE public.supplier_quote_price_breaks sqpb SET org_id = s.org_id FROM public.suppliers s WHERE sqpb.supplier_id = s.id AND s.org_id IS NOT NULL AND sqpb.org_id IS NULL;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- I) DETECCIÓ: files amb org_id NULL (WARNING; no abortar aquí)
--    El segon fitxer (RLS) farà la verificació final abans de NOT NULL.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  r record;
  cnt bigint;
  tenant_tables text[] := ARRAY[
    'expenses','documents','payments','briefings','warehouses','expense_attachments',
    'recurring_expenses','recurring_expense_occurrences','tasks','sticky_notes',
    'project_events','project_profitability_basic','user_counters','gtin_pool',
    'product_identifiers','decision_log','supplier_price_estimates','po_amazon_readiness',
    'po_shipments','dashboard_preferences','finance_categories','audit_log','signatures','incomes'
  ];
  t text;
BEGIN
  FOREACH t IN ARRAY tenant_tables
  LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name = t)
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name = t AND column_name = 'org_id') THEN
      EXECUTE format('SELECT COUNT(*) FROM public.%I WHERE org_id IS NULL', t) INTO cnt;
      IF cnt > 0 THEN
        RAISE WARNING 'S1.2 backfill: taula % té % files amb org_id NULL', t, cnt;
      END IF;
    END IF;
  END LOOP;
END $$;
