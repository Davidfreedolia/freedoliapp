-- ============================================
-- DB CONTAMINATION FIX — COMPLETE SCRIPT
-- ============================================
-- Run this ENTIRE script in Supabase SQL Editor
-- This fixes ALL contaminated DEMO data

-- ============================================
-- STEP 1: AUDIT (Before Fix)
-- ============================================
-- Run this first to see contamination

SELECT 
  'purchase_orders' as table_name,
  COUNT(*) as contaminated_count
FROM public.purchase_orders
WHERE (po_number ILIKE 'DEMO-%' OR reference ILIKE 'DEMO-%')
  AND is_demo IS DISTINCT FROM true

UNION ALL

SELECT 
  'po_shipments' as table_name,
  COUNT(*) as contaminated_count
FROM public.po_shipments s
JOIN public.purchase_orders po ON po.id = s.purchase_order_id
WHERE po.po_number ILIKE 'DEMO-%'
  AND s.is_demo IS DISTINCT FROM po.is_demo

UNION ALL

SELECT 
  'projects' as table_name,
  COUNT(*) as contaminated_count
FROM public.projects
WHERE (name ILIKE 'DEMO-%' OR sku ILIKE 'DEMO-%')
  AND is_demo IS DISTINCT FROM true

UNION ALL

SELECT 
  'tasks' as table_name,
  COUNT(*) as contaminated_count
FROM public.tasks
WHERE (title ILIKE 'DEMO-%' OR title ILIKE '%DEMO%')
  AND is_demo IS DISTINCT FROM true

UNION ALL

SELECT 
  'suppliers' as table_name,
  COUNT(*) as contaminated_count
FROM public.suppliers
WHERE name ILIKE 'DEMO-%'
  AND is_demo IS DISTINCT FROM true

UNION ALL

SELECT 
  'supplier_quotes' as table_name,
  COUNT(*) as contaminated_count
FROM public.supplier_quotes sq
JOIN public.projects p ON p.id = sq.project_id
WHERE (p.name ILIKE 'DEMO-%' OR p.sku ILIKE 'DEMO-%')
  AND sq.is_demo IS DISTINCT FROM true;

-- ============================================
-- STEP 2: FIX CONTAMINATION
-- ============================================

-- A) Fix purchase_orders flags for DEMO-PO rows
UPDATE public.purchase_orders
SET is_demo = true
WHERE (po_number ILIKE 'DEMO-%' OR reference ILIKE 'DEMO-%')
  AND is_demo IS DISTINCT FROM true;

-- B) Align po_shipments flag to parent PO
UPDATE public.po_shipments s
SET is_demo = po.is_demo
FROM public.purchase_orders po
WHERE s.purchase_order_id = po.id
  AND s.is_demo IS DISTINCT FROM po.is_demo;

-- C) Fix DEMO projects flags
UPDATE public.projects
SET is_demo = true
WHERE (name ILIKE 'DEMO-%' OR sku ILIKE 'DEMO-%')
  AND is_demo IS DISTINCT FROM true;

-- D) Fix DEMO tasks flags
UPDATE public.tasks
SET is_demo = true
WHERE (title ILIKE 'DEMO-%' OR title ILIKE '%DEMO%')
  AND is_demo IS DISTINCT FROM true;

-- E) Fix DEMO suppliers flags
UPDATE public.suppliers
SET is_demo = true
WHERE name ILIKE 'DEMO-%'
  AND is_demo IS DISTINCT FROM true;

-- F) Fix DEMO quotes flags (via project relation)
UPDATE public.supplier_quotes sq
SET is_demo = true
FROM public.projects p
WHERE sq.project_id = p.id
  AND (p.name ILIKE 'DEMO-%' OR p.sku ILIKE 'DEMO-%')
  AND sq.is_demo IS DISTINCT FROM true;

-- ============================================
-- STEP 3: VERIFY FIX (After Fix)
-- ============================================
-- All counts should be 0

SELECT 
  'purchase_orders' as table_name,
  COUNT(*) as remaining_contaminated
FROM public.purchase_orders
WHERE (po_number ILIKE 'DEMO-%' OR reference ILIKE 'DEMO-%')
  AND is_demo IS DISTINCT FROM true

UNION ALL

SELECT 
  'po_shipments' as table_name,
  COUNT(*) as remaining_contaminated
FROM public.po_shipments s
JOIN public.purchase_orders po ON po.id = s.purchase_order_id
WHERE po.po_number ILIKE 'DEMO-%'
  AND s.is_demo IS DISTINCT FROM po.is_demo

UNION ALL

SELECT 
  'projects' as table_name,
  COUNT(*) as remaining_contaminated
FROM public.projects
WHERE (name ILIKE 'DEMO-%' OR sku ILIKE 'DEMO-%')
  AND is_demo IS DISTINCT FROM true

UNION ALL

SELECT 
  'tasks' as table_name,
  COUNT(*) as remaining_contaminated
FROM public.tasks
WHERE (title ILIKE 'DEMO-%' OR title ILIKE '%DEMO%')
  AND is_demo IS DISTINCT FROM true

UNION ALL

SELECT 
  'suppliers' as table_name,
  COUNT(*) as remaining_contaminated
FROM public.suppliers
WHERE name ILIKE 'DEMO-%'
  AND is_demo IS DISTINCT FROM true

UNION ALL

SELECT 
  'supplier_quotes' as table_name,
  COUNT(*) as remaining_contaminated
FROM public.supplier_quotes sq
JOIN public.projects p ON p.id = sq.project_id
WHERE (p.name ILIKE 'DEMO-%' OR p.sku ILIKE 'DEMO-%')
  AND sq.is_demo IS DISTINCT FROM true;

-- ============================================
-- EXPECTED RESULT
-- ============================================
-- All remaining_contaminated should be 0
-- If any is > 0, investigate that table

