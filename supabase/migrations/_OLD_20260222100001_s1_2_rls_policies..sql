-- ============================================
-- S1.2 — org_id NOT NULL + FK + RLS + policies — TENANT-DATA
-- ============================================
-- Per cada taula TENANT-DATA: NOT NULL, FK a orgs, índex, RLS, policies is_org_member.
-- Eliminar policies permissives (allow_all%, "Allow all").
-- Verificació inicial: fallar si queden NULL o allow_all% (abans d’aplicar NOT NULL).
-- ============================================

-- ============================================
-- VERIFICACIÓ PREVIA: fallar si TENANT-DATA amb org_id té files NULL o policy allow_all%
-- ============================================
DO $$
DECLARE
  tenant_tables text[] := ARRAY[
    'company_settings','projects','purchase_orders','suppliers','supplier_quotes','supplier_sample_requests',
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
  t text;
  cnt bigint;
  allow_all_count int;
BEGIN
  FOREACH t IN ARRAY tenant_tables
  LOOP
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = t) THEN
      CONTINUE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = t AND column_name = 'org_id') THEN
      CONTINUE;
    END IF;

    EXECUTE format('SELECT COUNT(*) FROM public.%I WHERE org_id IS NULL', t) INTO cnt;
    IF cnt > 0 THEN
      RAISE EXCEPTION 'S1.2 verificació: taula % té % files amb org_id NULL. Corrigeix el backfill abans d’executar aquesta migració.', t, cnt;
    END IF;

    SELECT COUNT(*) INTO allow_all_count
    FROM pg_policies p
    WHERE p.schemaname = 'public' AND p.tablename = t AND p.policyname ILIKE 'allow_all%';
    IF allow_all_count > 0 THEN
      RAISE EXCEPTION 'S1.2 verificació: taula % encara té % policy(s) amb nom allow_all%. Elimina-les abans.', t, allow_all_count;
    END IF;
  END LOOP;
END $$;

-- Llista de totes les taules TENANT-DATA (inclou les 6 que ja tenen org_id)
DO $$
DECLARE
  t text;
  tenant_tables text[] := ARRAY[
    'company_settings','projects','purchase_orders','suppliers','supplier_quotes','supplier_sample_requests',
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
  has_not_null boolean;
  con_exists boolean;
  pol record;
BEGIN
  FOREACH t IN ARRAY tenant_tables
  LOOP
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = t) THEN
      CONTINUE;
    END IF;
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = t AND column_name = 'org_id') INTO has_org;
    IF NOT has_org THEN
      CONTINUE;
    END IF;

    -- A) NOT NULL (només si la columna és nullable)
    SELECT (is_nullable = 'YES') INTO has_not_null
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = t AND column_name = 'org_id';
    IF has_not_null THEN
      EXECUTE format('ALTER TABLE public.%I ALTER COLUMN org_id SET NOT NULL', t);
    END IF;

    -- B) FK (només si no existeix)
    SELECT EXISTS (SELECT 1 FROM pg_constraint c
      JOIN pg_class r ON r.oid = c.conrelid
      JOIN pg_namespace n ON n.oid = r.relnamespace
      WHERE n.nspname = 'public' AND r.relname = t AND c.conname = 'fk_' || replace(t, '-', '_') || '_org')
    INTO con_exists;
    IF NOT con_exists THEN
      EXECUTE format(
        'ALTER TABLE public.%I ADD CONSTRAINT fk_%s_org FOREIGN KEY (org_id) REFERENCES public.orgs(id) ON DELETE CASCADE',
        t, replace(t, '-', '_')
      );
    END IF;

    -- C) Índex
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_org_id ON public.%I(org_id)', replace(t, '-', '_'), t);

    -- D) RLS
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);

    -- E) Eliminar policies permissives (allow_all%, "Allow all", qual NULL)
    FOR pol IN (
      SELECT p.policyname
      FROM pg_policies p
      WHERE p.schemaname = 'public' AND p.tablename = t
        AND (
          p.policyname ILIKE 'allow_all%'
          OR p.policyname ILIKE '%allow all%'
          OR p.qual IS NULL
          OR (p.qual::text ILIKE '%true%' AND p.cmd IN ('SELECT', 'ALL', '*'))
        )
    )
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, t);
    END LOOP;

    -- F) Eliminar totes les policies existents i crear les 4 org (unificat)
    FOR pol IN (SELECT p.policyname FROM pg_policies p WHERE p.schemaname = 'public' AND p.tablename = t)
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, t);
    END LOOP;

    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (public.is_org_member(org_id))',
      's1_org_select_' || t, t
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (public.is_org_member(org_id))',
      's1_org_insert_' || t, t
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (public.is_org_member(org_id)) WITH CHECK (public.is_org_member(org_id))',
      's1_org_update_' || t, t
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (public.is_org_member(org_id))',
      's1_org_delete_' || t, t
    );
  END LOOP;
END $$;

-- ============================================
-- VERIFICACIÓ FINAL: totes les TENANT-DATA amb org_id tenen RLS ON
-- ============================================
DO $$
DECLARE
  tenant_tables text[] := ARRAY[
    'company_settings','projects','purchase_orders','suppliers','supplier_quotes','supplier_sample_requests',
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
  t text;
  rls_off boolean;
BEGIN
  FOREACH t IN ARRAY tenant_tables
  LOOP
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = t) THEN
      CONTINUE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = t AND column_name = 'org_id') THEN
      CONTINUE;
    END IF;

    SELECT NOT c.relrowsecurity INTO rls_off
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = t;
    IF rls_off THEN
      RAISE EXCEPTION 'S1.2 verificació final: taula % té RLS OFF.', t;
    END IF;
  END LOOP;
END $$;
