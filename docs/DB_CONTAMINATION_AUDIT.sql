-- ============================================
-- DB CONTAMINATION AUDIT — DEMO DATA FIX
-- ============================================
-- Run these queries in Supabase SQL Editor
-- BEFORE and AFTER running the fix queries

-- ============================================
-- A) Check DEMO purchase_orders and their flags
-- ============================================
SELECT 
  id, 
  po_number, 
  reference, 
  supplier_name, 
  is_demo, 
  created_at
FROM public.purchase_orders
WHERE po_number ILIKE 'DEMO-%'
   OR reference ILIKE 'DEMO-%'
ORDER BY created_at DESC;

-- ============================================
-- B) Identify contaminated DEMO POs (wrong flag)
-- ============================================
SELECT 
  id, 
  po_number, 
  reference, 
  is_demo, 
  created_at
FROM public.purchase_orders
WHERE (po_number ILIKE 'DEMO-%' OR reference ILIKE 'DEMO-%')
  AND is_demo IS DISTINCT FROM true
ORDER BY created_at DESC;

-- Count contaminated
SELECT COUNT(*) as contaminated_count
FROM public.purchase_orders
WHERE (po_number ILIKE 'DEMO-%' OR reference ILIKE 'DEMO-%')
  AND is_demo IS DISTINCT FROM true;

-- ============================================
-- C) Check if po_shipments are aligned with PO flag
-- ============================================
SELECT 
  s.id, 
  s.purchase_order_id, 
  s.is_demo AS shipment_is_demo, 
  po.is_demo AS po_is_demo, 
  po.po_number,
  s.created_at
FROM public.po_shipments s
JOIN public.purchase_orders po ON po.id = s.purchase_order_id
WHERE po.po_number ILIKE 'DEMO-%'
ORDER BY s.created_at DESC;

-- Count misaligned shipments
SELECT COUNT(*) as misaligned_count
FROM public.po_shipments s
JOIN public.purchase_orders po ON po.id = s.purchase_order_id
WHERE po.po_number ILIKE 'DEMO-%'
  AND s.is_demo IS DISTINCT FROM po.is_demo;

-- ============================================
-- D) Check DEMO projects contamination
-- ============================================
SELECT 
  id, 
  name, 
  sku, 
  is_demo, 
  created_at
FROM public.projects
WHERE (name ILIKE 'DEMO-%' OR sku ILIKE 'DEMO-%')
  AND is_demo IS DISTINCT FROM true
ORDER BY created_at DESC;

-- ============================================
-- E) Check DEMO tasks contamination
-- ============================================
SELECT 
  id, 
  title, 
  is_demo, 
  created_at
FROM public.tasks
WHERE (title ILIKE 'DEMO-%' OR title ILIKE '%DEMO%')
  AND is_demo IS DISTINCT FROM true
ORDER BY created_at DESC;

-- ============================================
-- F) Check DEMO suppliers contamination
-- ============================================
SELECT 
  id, 
  name, 
  is_demo, 
  created_at
FROM public.suppliers
WHERE name ILIKE 'DEMO-%'
  AND is_demo IS DISTINCT FROM true
ORDER BY created_at DESC;

-- ============================================
-- G) Check DEMO quotes contamination
-- ============================================
SELECT 
  id, 
  project_id, 
  is_demo, 
  created_at
FROM public.supplier_quotes
WHERE id IN (
  SELECT sq.id 
  FROM supplier_quotes sq
  JOIN projects p ON p.id = sq.project_id
  WHERE p.name ILIKE 'DEMO-%' OR p.sku ILIKE 'DEMO-%'
)
AND is_demo IS DISTINCT FROM true
ORDER BY created_at DESC;


