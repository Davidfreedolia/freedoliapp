-- ============================================
-- DB CONTAMINATION FIX — DEMO DATA CLEANUP
-- ============================================
-- Run AFTER audit confirms contamination
-- This script fixes is_demo flags for DEMO data

-- ============================================
-- A) Fix purchase_orders flags for DEMO-PO rows
-- ============================================
UPDATE public.purchase_orders
SET is_demo = true
WHERE (po_number ILIKE 'DEMO-%' OR reference ILIKE 'DEMO-%')
  AND is_demo IS DISTINCT FROM true;

-- Verify fix
SELECT COUNT(*) as remaining_contaminated
FROM public.purchase_orders
WHERE (po_number ILIKE 'DEMO-%' OR reference ILIKE 'DEMO-%')
  AND is_demo IS DISTINCT FROM true;
-- Should return 0

-- ============================================
-- B) Align po_shipments flag to parent PO (safe)
-- ============================================
UPDATE public.po_shipments s
SET is_demo = po.is_demo
FROM public.purchase_orders po
WHERE s.purchase_order_id = po.id
  AND s.is_demo IS DISTINCT FROM po.is_demo;

-- Verify fix
SELECT COUNT(*) as remaining_misaligned
FROM public.po_shipments s
JOIN public.purchase_orders po ON po.id = s.purchase_order_id
WHERE po.po_number ILIKE 'DEMO-%'
  AND s.is_demo IS DISTINCT FROM po.is_demo;
-- Should return 0

-- ============================================
-- C) Fix DEMO projects flags
-- ============================================
UPDATE public.projects
SET is_demo = true
WHERE (name ILIKE 'DEMO-%' OR sku ILIKE 'DEMO-%')
  AND is_demo IS DISTINCT FROM true;

-- Verify fix
SELECT COUNT(*) as remaining_contaminated
FROM public.projects
WHERE (name ILIKE 'DEMO-%' OR sku ILIKE 'DEMO-%')
  AND is_demo IS DISTINCT FROM true;
-- Should return 0

-- ============================================
-- D) Fix DEMO tasks flags
-- ============================================
UPDATE public.tasks
SET is_demo = true
WHERE (title ILIKE 'DEMO-%' OR title ILIKE '%DEMO%')
  AND is_demo IS DISTINCT FROM true;

-- Verify fix
SELECT COUNT(*) as remaining_contaminated
FROM public.tasks
WHERE (title ILIKE 'DEMO-%' OR title ILIKE '%DEMO%')
  AND is_demo IS DISTINCT FROM true;
-- Should return 0

-- ============================================
-- E) Fix DEMO suppliers flags
-- ============================================
UPDATE public.suppliers
SET is_demo = true
WHERE name ILIKE 'DEMO-%'
  AND is_demo IS DISTINCT FROM true;

-- Verify fix
SELECT COUNT(*) as remaining_contaminated
FROM public.suppliers
WHERE name ILIKE 'DEMO-%'
  AND is_demo IS DISTINCT FROM true;
-- Should return 0

-- ============================================
-- F) Fix DEMO quotes flags (via project relation)
-- ============================================
UPDATE public.supplier_quotes sq
SET is_demo = true
FROM public.projects p
WHERE sq.project_id = p.id
  AND (p.name ILIKE 'DEMO-%' OR p.sku ILIKE 'DEMO-%')
  AND sq.is_demo IS DISTINCT FROM true;

-- Verify fix
SELECT COUNT(*) as remaining_contaminated
FROM public.supplier_quotes sq
JOIN public.projects p ON p.id = sq.project_id
WHERE (p.name ILIKE 'DEMO-%' OR p.sku ILIKE 'DEMO-%')
  AND sq.is_demo IS DISTINCT FROM true;
-- Should return 0

-- ============================================
-- FINAL VERIFICATION
-- ============================================
-- Run this to confirm all contamination is fixed
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

-- All counts should be 0

