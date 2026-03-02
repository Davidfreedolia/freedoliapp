-- =============================================================================
-- FASE 3 / F3 READINESS: comprovar si tenim dates i cash balance per Cash Gap
-- Executar al Supabase SQL Editor (un bloc o tots); resultats per interpretar
-- readiness per a Cash Gap real.
-- =============================================================================
-- NOTA des del repo (migracions):
--   expenses: bootstrap té expense_date (no due_date), amount, project_id, org_id (S1.11).
--             No hi ha payment_status, paid_at ni status a les migracions.
--   incomes:  bootstrap té income_date (no expected_date), amount, project_id, org_id (S1.11).
--             No hi ha received_at ni status a les migracions.
--   cash/balance: cap columna amb nom 'cash' o 'balance' a les migracions;
--                 company_settings no té camp de saldo.
-- Si la teva DB té columnes afegides manualment o per altres scripts, les
-- consultes 1 i 2 ho mostraran.
-- =============================================================================

-- 1) Columnes clau a expenses
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'expenses'
  AND column_name IN ('org_id','project_id','amount','status','payment_status','due_date','paid_at','created_at','expense_date')
ORDER BY column_name;

-- 2) Columnes clau a incomes
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'incomes'
  AND column_name IN ('org_id','project_id','amount','status','expected_date','received_at','created_at','income_date')
ORDER BY column_name;

-- 3) On guardem "cash" avui? (orgs o company_settings o altra)
SELECT
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND column_name ILIKE '%cash%'
ORDER BY table_name, column_name;

-- 4) El teu projecte real 2025: quines dates tenim realment (top 20)
SELECT id, org_id, created_at
FROM projects
WHERE created_at >= '2025-01-01'::timestamptz
ORDER BY created_at ASC
LIMIT 20;
