# D10 — Verification Scripts

Status: stable  

## Check org_id nulls

SELECT count(*) FROM {table} WHERE org_id IS NULL;

## Check RLS enabled

SELECT relname, relrowsecurity
FROM pg_class
WHERE relnamespace = 'public'::regnamespace;

## Check policies

SELECT * FROM pg_policies WHERE schemaname='public';

---

## S2: Auditability restoration checks (restore_* tables)

-- =========================================================
-- S2: Auditability restoration checks (restore_* tables)
-- =========================================================

-- 1) List tables with RLS disabled (should be empty for tenant tables)
SELECT n.nspname AS schema, c.relname AS table, c.relrowsecurity AS rls_enabled
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND c.relname IN (
    'orders','order_items','sales','inventory_movements',
    'project_viability','project_phases','project_marketplaces','project_tasks',
    'supplier_quote_price_breaks'
  )
ORDER BY c.relname;

-- 2) Check policies exist for each restored table
SELECT tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE schemaname='public'
  AND tablename IN (
    'orders','order_items','sales','inventory_movements',
    'project_viability','project_phases','project_marketplaces','project_tasks',
    'supplier_quote_price_breaks'
  )
ORDER BY tablename, policyname;

-- 3) Check org_id is NOT NULL for restored tables
SELECT table_name, column_name, is_nullable
FROM information_schema.columns
WHERE table_schema='public'
  AND column_name='org_id'
  AND table_name IN (
    'orders','order_items','sales','inventory_movements',
    'project_viability','project_phases','project_marketplaces','project_tasks',
    'supplier_quote_price_breaks'
  )
ORDER BY table_name;

-- 4) Check FK constraints exist (basic)
SELECT tc.table_name, tc.constraint_name, kcu.column_name,
       ccu.table_name AS foreign_table_name, ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.table_schema='public'
  AND tc.constraint_type='FOREIGN KEY'
  AND tc.table_name IN (
    'order_items','sales','inventory_movements',
    'project_viability','project_phases','project_marketplaces','project_tasks',
    'supplier_quote_price_breaks'
  )
ORDER BY tc.table_name, tc.constraint_name;

-- 5) Orphan checks (should return 0 rows)

-- order_items → orders
SELECT oi.id
FROM public.order_items oi
LEFT JOIN public.orders o ON o.id = oi.order_id
WHERE o.id IS NULL
LIMIT 50;

-- sales → orders (optional FK, so only check non-null order_id)
SELECT s.id
FROM public.sales s
LEFT JOIN public.orders o ON o.id = s.order_id
WHERE s.order_id IS NOT NULL AND o.id IS NULL
LIMIT 50;

-- inventory_movements → warehouses
SELECT im.id
FROM public.inventory_movements im
LEFT JOIN public.warehouses w ON w.id = im.warehouse_id
WHERE w.id IS NULL
LIMIT 50;

-- project_* → projects
SELECT pv.id
FROM public.project_viability pv
LEFT JOIN public.projects p ON p.id = pv.project_id
WHERE p.id IS NULL
LIMIT 50;

SELECT pp.id
FROM public.project_phases pp
LEFT JOIN public.projects p ON p.id = pp.project_id
WHERE p.id IS NULL
LIMIT 50;

SELECT pm.id
FROM public.project_marketplaces pm
LEFT JOIN public.projects p ON p.id = pm.project_id
WHERE p.id IS NULL
LIMIT 50;

SELECT pt.id
FROM public.project_tasks pt
LEFT JOIN public.projects p ON p.id = pt.project_id
WHERE p.id IS NULL
LIMIT 50;

-- supplier_quote_price_breaks → supplier_quotes
SELECT b.id
FROM public.supplier_quote_price_breaks b
LEFT JOIN public.supplier_quotes q ON q.id = b.quote_id
WHERE q.id IS NULL
LIMIT 50;
