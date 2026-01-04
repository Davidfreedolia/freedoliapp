-- ============================================
-- DB REPAIR - Safe Data Repairs
-- ============================================
-- ⚠️ WARNING: Review these queries before running
-- These are SAFE repairs that set is_demo=false where NULL
-- and fix incorrectly marked demo data

-- ============================================
-- 1. FIX NULL is_demo VALUES (SAFE)
-- ============================================
-- Set is_demo=false where NULL (these are real data)

UPDATE projects SET is_demo = false WHERE is_demo IS NULL;
UPDATE purchase_orders SET is_demo = false WHERE is_demo IS NULL;
UPDATE suppliers SET is_demo = false WHERE is_demo IS NULL;
UPDATE expenses SET is_demo = false WHERE is_demo IS NULL;
UPDATE incomes SET is_demo = false WHERE is_demo IS NULL;
UPDATE tasks SET is_demo = false WHERE is_demo IS NULL;
UPDATE sticky_notes SET is_demo = false WHERE is_demo IS NULL;
UPDATE recurring_expenses SET is_demo = false WHERE is_demo IS NULL;
UPDATE payments SET is_demo = false WHERE is_demo IS NULL;
UPDATE warehouses SET is_demo = false WHERE is_demo IS NULL;
UPDATE supplier_quotes SET is_demo = false WHERE is_demo IS NULL;
UPDATE supplier_price_estimates SET is_demo = false WHERE is_demo IS NULL;
UPDATE product_identifiers SET is_demo = false WHERE is_demo IS NULL;
UPDATE gtin_pool SET is_demo = false WHERE is_demo IS NULL;
UPDATE documents SET is_demo = false WHERE is_demo IS NULL;
UPDATE po_shipments SET is_demo = false WHERE is_demo IS NULL;
UPDATE audit_log SET is_demo = false WHERE is_demo IS NULL;

-- ============================================
-- 2. FIX INCORRECTLY MARKED REAL PROJECTS
-- ============================================
-- If a REAL project (name doesn't start with DEMO-) was marked is_demo=true,
-- fix it back to false
-- ⚠️ REVIEW THIS QUERY CAREFULLY BEFORE RUNNING

-- First, see what would be affected:
SELECT 
  id, 
  name, 
  sku, 
  project_code,
  user_id, 
  is_demo, 
  created_at
FROM projects
WHERE is_demo = true
  AND (name NOT LIKE 'DEMO-%' AND sku NOT LIKE 'DEMO-%' AND project_code NOT LIKE 'DEMO-%')
ORDER BY created_at DESC;

-- If the above shows REAL projects incorrectly marked, run:
-- UPDATE projects 
-- SET is_demo = false 
-- WHERE is_demo = true
--   AND (name NOT LIKE 'DEMO-%' AND sku NOT LIKE 'DEMO-%' AND project_code NOT LIKE 'DEMO-%');

-- ============================================
-- 3. FIX REAL-TEST PROJECTS
-- ============================================
-- If REAL-TEST projects were created with is_demo=true, fix them
-- ⚠️ REVIEW THIS QUERY CAREFULLY BEFORE RUNNING

-- First, see what would be affected:
SELECT 
  id, 
  name, 
  sku, 
  user_id, 
  is_demo, 
  created_at
FROM projects
WHERE is_demo = true
  AND (name LIKE 'REAL-TEST%' OR name LIKE 'REAL-TEST-%')
ORDER BY created_at DESC;

-- If the above shows REAL-TEST projects incorrectly marked, run:
-- UPDATE projects 
-- SET is_demo = false 
-- WHERE is_demo = true
--   AND (name LIKE 'REAL-TEST%' OR name LIKE 'REAL-TEST-%');

-- ============================================
-- 4. VERIFY REPAIRS
-- ============================================
-- After running repairs, verify no NULLs remain:
SELECT 'projects' as table_name, COUNT(*) as null_count FROM projects WHERE is_demo IS NULL
UNION ALL
SELECT 'purchase_orders', COUNT(*) FROM purchase_orders WHERE is_demo IS NULL
UNION ALL
SELECT 'tasks', COUNT(*) FROM tasks WHERE is_demo IS NULL
UNION ALL
SELECT 'sticky_notes', COUNT(*) FROM sticky_notes WHERE is_demo IS NULL
UNION ALL
SELECT 'recurring_expenses', COUNT(*) FROM recurring_expenses WHERE is_demo IS NULL;



