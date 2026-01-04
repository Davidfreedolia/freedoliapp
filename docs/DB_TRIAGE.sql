-- ============================================
-- DB TRIAGE - Diagnostic Queries
-- ============================================
-- Run these queries in Supabase SQL Editor to diagnose data issues
-- DO NOT modify data - these are read-only diagnostics

-- ============================================
-- 1. PROJECTS DIAGNOSTIC
-- ============================================
-- Find last 50 projects with key fields
SELECT 
  id, 
  name, 
  sku, 
  project_code,
  user_id, 
  is_demo, 
  created_at,
  updated_at
FROM projects
ORDER BY created_at DESC
LIMIT 50;

-- Find projects where is_demo IS NULL
SELECT 
  id, 
  name, 
  sku, 
  user_id, 
  is_demo, 
  created_at
FROM projects
WHERE is_demo IS NULL
ORDER BY created_at DESC;

-- Count projects by is_demo status
SELECT 
  is_demo,
  COUNT(*) as count
FROM projects
GROUP BY is_demo;

-- Find REAL projects that might have been marked as demo
SELECT 
  id, 
  name, 
  sku, 
  user_id, 
  is_demo, 
  created_at
FROM projects
WHERE is_demo = true
  AND (name NOT LIKE 'DEMO-%' AND sku NOT LIKE 'DEMO-%')
ORDER BY created_at DESC;

-- ============================================
-- 2. PURCHASE ORDERS DIAGNOSTIC
-- ============================================
-- Last 50 purchase orders
SELECT 
  id, 
  po_number, 
  project_id,
  user_id, 
  is_demo, 
  created_at
FROM purchase_orders
ORDER BY created_at DESC
LIMIT 50;

-- Purchase orders with NULL is_demo
SELECT 
  id, 
  po_number, 
  user_id, 
  is_demo, 
  created_at
FROM purchase_orders
WHERE is_demo IS NULL
ORDER BY created_at DESC;

-- Count by is_demo
SELECT 
  is_demo,
  COUNT(*) as count
FROM purchase_orders
GROUP BY is_demo;

-- ============================================
-- 3. TASKS DIAGNOSTIC
-- ============================================
-- Last 50 tasks
SELECT 
  id, 
  title, 
  entity_type,
  entity_id,
  user_id, 
  is_demo, 
  created_at
FROM tasks
ORDER BY created_at DESC
LIMIT 50;

-- Tasks with NULL is_demo
SELECT 
  id, 
  title, 
  user_id, 
  is_demo, 
  created_at
FROM tasks
WHERE is_demo IS NULL
ORDER BY created_at DESC;

-- Count by is_demo
SELECT 
  is_demo,
  COUNT(*) as count
FROM tasks
GROUP BY is_demo;

-- ============================================
-- 4. STICKY NOTES DIAGNOSTIC
-- ============================================
-- Last 50 sticky notes
SELECT 
  id, 
  content, 
  entity_type,
  entity_id,
  user_id, 
  is_demo, 
  created_at
FROM sticky_notes
ORDER BY created_at DESC
LIMIT 50;

-- Sticky notes with NULL is_demo
SELECT 
  id, 
  content, 
  user_id, 
  is_demo, 
  created_at
FROM sticky_notes
WHERE is_demo IS NULL
ORDER BY created_at DESC;

-- Count by is_demo
SELECT 
  is_demo,
  COUNT(*) as count
FROM sticky_notes
GROUP BY is_demo;

-- ============================================
-- 5. RECURRING EXPENSES DIAGNOSTIC
-- ============================================
-- Last 50 recurring expenses
SELECT 
  id, 
  description, 
  amount,
  user_id, 
  is_demo, 
  created_at
FROM recurring_expenses
ORDER BY created_at DESC
LIMIT 50;

-- Recurring expenses with NULL is_demo
SELECT 
  id, 
  description, 
  user_id, 
  is_demo, 
  created_at
FROM recurring_expenses
WHERE is_demo IS NULL
ORDER BY created_at DESC;

-- Count by is_demo
SELECT 
  is_demo,
  COUNT(*) as count
FROM recurring_expenses
GROUP BY is_demo;

-- ============================================
-- 6. SHIPMENTS DIAGNOSTIC (for Calendar)
-- ============================================
-- Last 50 shipments with PO info
SELECT 
  s.id, 
  s.pickup_date,
  s.eta_date,
  s.user_id,
  po.id as po_id,
  po.po_number,
  po.is_demo as po_is_demo,
  s.created_at
FROM po_shipments s
LEFT JOIN purchase_orders po ON s.purchase_order_id = po.id
ORDER BY s.created_at DESC
LIMIT 50;

-- Shipments linked to DEMO purchase orders (when Demo OFF, these should not appear)
SELECT 
  s.id, 
  s.pickup_date,
  s.eta_date,
  po.po_number,
  po.is_demo as po_is_demo
FROM po_shipments s
INNER JOIN purchase_orders po ON s.purchase_order_id = po.id
WHERE po.is_demo = true
ORDER BY s.created_at DESC;

-- ============================================
-- 7. USER DATA SUMMARY
-- ============================================
-- Summary of data by user and demo mode
SELECT 
  user_id,
  is_demo,
  COUNT(*) as count,
  'projects' as table_name
FROM projects
GROUP BY user_id, is_demo
UNION ALL
SELECT 
  user_id,
  is_demo,
  COUNT(*) as count,
  'purchase_orders' as table_name
FROM purchase_orders
GROUP BY user_id, is_demo
UNION ALL
SELECT 
  user_id,
  is_demo,
  COUNT(*) as count,
  'tasks' as table_name
FROM tasks
GROUP BY user_id, is_demo
UNION ALL
SELECT 
  user_id,
  is_demo,
  COUNT(*) as count,
  'sticky_notes' as table_name
FROM sticky_notes
GROUP BY user_id, is_demo
ORDER BY user_id, table_name, is_demo;



