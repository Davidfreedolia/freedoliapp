-- Fix RLS policies for restored tables: canonical org-based policies only
-- Ensures auditability + consistent access control.

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'orders','order_items','sales','inventory_movements',
    'project_viability','project_phases','project_marketplaces','project_tasks',
    'supplier_quote_price_breaks'
  ]
  LOOP
    -- Drop ALL existing policies on table
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Org members can select '  || t, t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Org members can insert '  || t, t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Org members can update '  || t, t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Org members can delete '  || t, t);

    -- Also drop any leftover non-canonical policies if present
    -- (We cannot enumerate names; we drop any policy not matching our canonical set)
    -- Approach: list policies and drop them dynamically.
  END LOOP;
END $$;

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname='public'
      AND tablename IN (
        'orders','order_items','sales','inventory_movements',
        'project_viability','project_phases','project_marketplaces','project_tasks',
        'supplier_quote_price_breaks'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'orders','order_items','sales','inventory_movements',
    'project_viability','project_phases','project_marketplaces','project_tasks',
    'supplier_quote_price_breaks'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);

    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT USING (public.is_org_member(org_id))',
      'Org members can select ' || t, t);

    EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT WITH CHECK (public.is_org_member(org_id))',
      'Org members can insert ' || t, t);

    EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE USING (public.is_org_member(org_id)) WITH CHECK (public.is_org_member(org_id))',
      'Org members can update ' || t, t);

    EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE USING (public.is_org_member(org_id))',
      'Org members can delete ' || t, t);
  END LOOP;
END $$;
