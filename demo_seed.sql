-- ============================================
-- DEMO DATA SEED SCRIPT
-- ============================================
-- Aquest script genera 10 projectes complets amb dades REALISTES
-- Executar al SQL Editor de Supabase després de l'autenticació
-- IMPORTANT: Aquest script utilitza auth.uid() per assignar user_id automàticament

-- ============================================
-- 1. NETEGAR DADES DEMO EXISTENTS (si existeixen)
-- ============================================
-- Eliminar en ordre invers de dependències
-- NOTA: Algunes taules no tenen is_demo, s'eliminen per project_id o entity_id

-- Eliminar decision_log per entity_id (projectes demo)
DELETE FROM decision_log 
WHERE entity_type = 'project' 
  AND user_id = auth.uid()
  AND entity_id IN (SELECT id FROM projects WHERE is_demo = true AND user_id = auth.uid());

-- Eliminar tasks amb is_demo
DELETE FROM tasks WHERE is_demo = true AND user_id = auth.uid();

-- Eliminar sticky_notes amb is_demo
DELETE FROM sticky_notes WHERE is_demo = true AND user_id = auth.uid();

-- Eliminar po_shipments amb is_demo
DELETE FROM po_shipments WHERE is_demo = true AND user_id = auth.uid();

-- Eliminar po_amazon_readiness amb is_demo
DELETE FROM po_amazon_readiness WHERE is_demo = true AND user_id = auth.uid();

-- Eliminar purchase_orders amb is_demo
DELETE FROM purchase_orders WHERE is_demo = true AND user_id = auth.uid();

-- Eliminar supplier_quote_price_breaks per quote_id (quotes demo)
DELETE FROM supplier_quote_price_breaks 
WHERE quote_id IN (SELECT id FROM supplier_quotes WHERE is_demo = true AND user_id = auth.uid());

-- Eliminar supplier_quotes amb is_demo
DELETE FROM supplier_quotes WHERE is_demo = true AND user_id = auth.uid();

-- Eliminar product_identifiers amb is_demo
DELETE FROM product_identifiers WHERE is_demo = true AND user_id = auth.uid();

-- Alliberar GTINs assignats a projectes demo
UPDATE gtin_pool 
SET assigned_to_project_id = NULL, status = 'available' 
WHERE (is_demo = true AND user_id = auth.uid()) 
   OR assigned_to_project_id IN (SELECT id FROM projects WHERE is_demo = true AND user_id = auth.uid());

-- Eliminar GTINs demo
DELETE FROM gtin_pool WHERE is_demo = true AND user_id = auth.uid();

-- Eliminar projectes demo
DELETE FROM projects WHERE is_demo = true AND user_id = auth.uid();

-- Eliminar suppliers demo
DELETE FROM suppliers WHERE is_demo = true AND user_id = auth.uid();

-- ============================================
-- 2. SUPPLIERS (8 suppliers variats)
-- ============================================
INSERT INTO suppliers (name, type, rating, contact_name, email, phone, incoterm, payment_terms, is_demo, user_id)
VALUES
  ('Premium Manufacturing Co', 'manufacturer', 5, 'John Smith', 'john@premiummfg.com', '+1-555-0101', 'FOB', 'T/T 30%', true, auth.uid()),
  ('Global Producer Ltd', 'manufacturer', 4, 'Maria Garcia', 'maria@globalprod.com', '+1-555-0102', 'FCA', 'L/C at sight', true, auth.uid()),
  ('Quality Factory Inc', 'manufacturer', 5, 'David Chen', 'david@qualityfactory.com', '+1-555-0103', 'EXW', 'Net 30', true, auth.uid()),
  ('Reliable Maker Corp', 'manufacturer', 4, 'Sarah Johnson', 'sarah@reliablemaker.com', '+1-555-0104', 'FOB', 'T/T 30%', true, auth.uid()),
  ('Fast Track Industries', 'manufacturer', 3, 'Michael Brown', 'michael@fasttrack.com', '+1-555-0105', 'FCA', 'Net 30', true, auth.uid()),
  ('Express Freight Solutions', 'freight', 5, 'Lisa Anderson', 'lisa@expressfreight.com', '+1-555-0106', 'FOB', 'T/T 30%', true, auth.uid()),
  ('Worldwide Logistics', 'freight', 4, 'Robert Wilson', 'robert@worldwide.com', '+1-555-0107', 'FCA', 'L/C at sight', true, auth.uid()),
  ('Quality Inspection Services', 'inspection', 5, 'Emma Davis', 'emma@qualityinsp.com', '+1-555-0108', 'EXW', 'Net 30', true, auth.uid())
RETURNING id, name;

-- ============================================
-- 3. PROJECTES (10 projectes amb fases variades)
-- ============================================
-- 3 Research (GO / RISKY / DISCARDED)
-- 2 Sourcing (phase 2)
-- 2 Production (phase 3-4)
-- 2 In Transit (phase 5-6)
-- 1 Live (phase 7)

INSERT INTO projects (
  project_code, sku, sku_internal, name, description, current_phase, decision, status, is_demo, user_id
)
VALUES
  -- Research (phase 1)
  ('PR-FRDL250001', 'FRDL-001', 'FRDL-001-INT', 'Wireless Bluetooth Earbuds Pro', 'Premium wireless earbuds with noise cancellation', 1, 'GO', 'active', true, auth.uid()),
  ('PR-FRDL250002', 'FRDL-002', 'FRDL-002-INT', 'Smart Fitness Tracker', 'Advanced fitness tracker with heart rate monitor', 1, 'RISKY', 'active', true, auth.uid()),
  ('PR-FRDL250003', 'FRDL-003', 'FRDL-003-INT', 'USB-C Hub Multiport', 'USB-C hub with HDMI, USB 3.0, and SD card reader', 1, 'DISCARDED', 'inactive', true, auth.uid()),
  
  -- Sourcing (phase 2)
  ('PR-FRDL250004', 'FRDL-004', 'FRDL-004-INT', 'Phone Case with Stand', 'Protective phone case with built-in kickstand', 2, 'GO', 'active', true, auth.uid()),
  ('PR-FRDL250005', 'FRDL-005', 'FRDL-005-INT', 'Laptop Stand Aluminum', 'Ergonomic aluminum laptop stand adjustable height', 2, 'GO', 'active', true, auth.uid()),
  
  -- Production (phase 3-4)
  ('PR-FRDL250006', 'FRDL-006', 'FRDL-006-INT', 'Wireless Charging Pad', 'Fast wireless charging pad compatible with Qi', 3, 'GO', 'active', true, auth.uid()),
  ('PR-FRDL250007', 'FRDL-007', 'FRDL-007-INT', 'Portable Power Bank 20000mAh', 'High capacity power bank with fast charging', 4, 'GO', 'active', true, auth.uid()),
  
  -- In Transit (phase 5-6)
  ('PR-FRDL250008', 'FRDL-008', 'FRDL-008-INT', 'Tablet Keyboard Case', 'Detachable keyboard case for tablets', 5, 'GO', 'active', true, auth.uid()),
  ('PR-FRDL250009', 'FRDL-009', 'FRDL-009-INT', 'Webcam HD 1080p', 'Full HD webcam with microphone and privacy shutter', 6, 'GO', 'active', true, auth.uid()),
  
  -- Live (phase 7)
  ('PR-FRDL250010', 'FRDL-010', 'FRDL-010-INT', 'Mechanical Keyboard RGB', 'RGB mechanical keyboard with blue switches', 7, 'GO', 'active', true, auth.uid())
RETURNING id, name, current_phase;

-- ============================================
-- 4. PROFITABILITY DATA (per projectes Research)
-- ============================================
-- Només per projectes phase 1 amb decision GO o RISKY

INSERT INTO project_profitability (
  project_id, selling_price, cogs, shipping_per_unit, referral_fee_percent,
  fba_fee_per_unit, ppc_per_unit, other_costs_per_unit, fixed_costs, user_id
)
SELECT 
  p.id,
  CASE 
    WHEN p.decision = 'GO' THEN 29.99
    WHEN p.decision = 'RISKY' THEN 19.99
    ELSE 24.99
  END,
  CASE 
    WHEN p.decision = 'GO' THEN 8.50
    WHEN p.decision = 'RISKY' THEN 12.00
    ELSE 10.00
  END,
  2.50,
  15,
  CASE 
    WHEN p.decision = 'GO' THEN 3.50
    WHEN p.decision = 'RISKY' THEN 2.50
    ELSE 3.00
  END,
  CASE 
    WHEN p.decision = 'GO' THEN 1.50
    WHEN p.decision = 'RISKY' THEN 2.00
    ELSE 1.75
  END,
  0.50,
  500,
  auth.uid()
FROM projects p
WHERE p.is_demo = true 
  AND p.user_id = auth.uid()
  AND p.current_phase = 1 
  AND p.decision IN ('GO', 'RISKY');

-- ============================================
-- 5. GTIN POOL (80 GTINs: 60 disponibles, 20 assignats)
-- ============================================
INSERT INTO gtin_pool (gtin_code, gtin_type, status, is_demo, assigned_to_project_id, user_id)
SELECT 
  '7' || LPAD((FLOOR(RANDOM() * 9000000000000) + 1000000000000)::text, 12, '0'),
  CASE WHEN (ROW_NUMBER() OVER ()) % 3 = 0 THEN 'UPC' ELSE 'EAN' END,
  CASE WHEN (ROW_NUMBER() OVER ()) <= 60 THEN 'available' ELSE 'assigned' END,
  true,
  CASE 
    WHEN (ROW_NUMBER() OVER ()) > 60 THEN 
      (SELECT id FROM projects WHERE is_demo = true AND user_id = auth.uid() ORDER BY created_at LIMIT 1 OFFSET ((ROW_NUMBER() OVER ()) - 61) % 10)
    ELSE NULL
  END,
  auth.uid()
FROM generate_series(1, 80);

-- ============================================
-- 6. PRODUCT IDENTIFIERS (per projectes phase 2+)
-- ============================================
INSERT INTO product_identifiers (project_id, gtin_code, gtin_type, fnsku, asin, is_demo, user_id)
SELECT 
  p.id,
  g.gtin_code,
  g.gtin_type,
  'X00' || LPAD((ROW_NUMBER() OVER ())::text, 9, '0'),
  'B0' || LPAD((FLOOR(RANDOM() * 90000000) + 10000000)::text, 8, '0'),
  true,
  auth.uid()
FROM projects p
LEFT JOIN gtin_pool g ON g.assigned_to_project_id = p.id AND g.is_demo = true AND g.user_id = auth.uid()
WHERE p.is_demo = true 
  AND p.user_id = auth.uid()
  AND p.current_phase >= 2
  AND g.id IS NOT NULL
LIMIT 7;

-- ============================================
-- 7. SUPPLIER QUOTES (3 projectes amb 2 quotes cadascun)
-- ============================================
-- Projectes phase 2-4 amb quotes comparats

WITH quote_projects AS (
  SELECT id, name FROM projects WHERE is_demo = true AND user_id = auth.uid() AND current_phase BETWEEN 2 AND 4 LIMIT 3
),
supplier_list AS (
  SELECT id, name, incoterm, payment_terms FROM suppliers WHERE is_demo = true AND user_id = auth.uid() AND type = 'manufacturer' LIMIT 2
)
INSERT INTO supplier_quotes (
  project_id, supplier_id, currency, incoterm, payment_terms, lead_time_days, moq, shipping_estimate, notes, is_demo, user_id
)
SELECT 
  qp.id,
  sl.id,
  'USD',
  sl.incoterm,
  sl.payment_terms,
  CASE WHEN ROW_NUMBER() OVER (PARTITION BY qp.id) = 1 THEN 45 ELSE 30 END,
  CASE WHEN ROW_NUMBER() OVER (PARTITION BY qp.id) = 1 THEN 2000 ELSE 500 END,
  500,
  'Demo quote ' || ROW_NUMBER() OVER (PARTITION BY qp.id) || ' for ' || qp.name,
  true,
  auth.uid()
FROM quote_projects qp
CROSS JOIN supplier_list sl
RETURNING id, project_id;

-- Price breaks per quotes
-- NOTA: supplier_quote_price_breaks no té columna is_demo, però es pot identificar per quote_id
INSERT INTO supplier_quote_price_breaks (quote_id, min_qty, unit_price)
SELECT 
  q.id,
  pb.min_qty,
  pb.unit_price
FROM supplier_quotes q
CROSS JOIN (VALUES (500, 12.50), (1000, 11.50), (2000, 10.50)) AS pb(min_qty, unit_price)
WHERE q.is_demo = true
  AND q.user_id = auth.uid()
  AND ROW_NUMBER() OVER (PARTITION BY q.id ORDER BY pb.min_qty) <= 3;

-- ============================================
-- 8. PURCHASE ORDERS (6 projectes amb 1-2 POs)
-- ============================================
INSERT INTO purchase_orders (
  po_number, project_id, supplier_id, order_date, status, currency, incoterm, payment_terms, items, total_amount, is_demo, user_id
)
SELECT 
  'PO-' || LPAD((ROW_NUMBER() OVER ())::text, 6, '0'),
  p.id,
  s.id,
  CURRENT_DATE - (INTERVAL '1 day' * (30 * (ROW_NUMBER() OVER (PARTITION BY p.id) - 1))),
  CASE 
    WHEN p.current_phase = 2 THEN 'draft'
    WHEN p.current_phase = 3 THEN 'confirmed'
    WHEN p.current_phase = 4 THEN 'in_production'
    WHEN p.current_phase = 5 THEN 'shipped'
    WHEN p.current_phase = 6 THEN 'received'
    ELSE 'confirmed'
  END,
  'USD',
  s.incoterm,
  s.payment_terms,
  jsonb_build_array(
    jsonb_build_object(
      'sku', p.sku,
      'description', p.name,
      'quantity', 1000 + ((ROW_NUMBER() OVER (PARTITION BY p.id) - 1) * 500),
      'unit_price', 12.50 - ((ROW_NUMBER() OVER (PARTITION BY p.id) - 1) * 0.50),
      'total', (1000 + ((ROW_NUMBER() OVER (PARTITION BY p.id) - 1) * 500)) * (12.50 - ((ROW_NUMBER() OVER (PARTITION BY p.id) - 1) * 0.50))
    )
  ),
  (1000 + ((ROW_NUMBER() OVER (PARTITION BY p.id) - 1) * 500)) * (12.50 - ((ROW_NUMBER() OVER (PARTITION BY p.id) - 1) * 0.50)),
  true,
  auth.uid()
FROM projects p
CROSS JOIN LATERAL (
  SELECT id, incoterm, payment_terms 
  FROM suppliers 
  WHERE is_demo = true AND user_id = auth.uid() AND type = 'manufacturer' 
  LIMIT 1 OFFSET (ROW_NUMBER() OVER (PARTITION BY p.id) % 5)
) s
WHERE p.is_demo = true 
  AND p.user_id = auth.uid()
  AND p.current_phase >= 2
  AND (ROW_NUMBER() OVER (PARTITION BY p.id) <= CASE WHEN p.current_phase <= 3 THEN 1 ELSE 2 END)
RETURNING id, project_id;

-- ============================================
-- 9. AMAZON READINESS (per POs)
-- ============================================
INSERT INTO po_amazon_readiness (
  purchase_order_id, project_id, needs_fnsku, units_per_carton, cartons_count,
  carton_length_cm, carton_width_cm, carton_height_cm, carton_weight_kg, prep_type, is_demo, user_id
)
SELECT 
  po.id,
  po.project_id,
  true,
  CASE WHEN (ROW_NUMBER() OVER ()) % 2 = 0 THEN 24 ELSE NULL END,
  CASE WHEN (ROW_NUMBER() OVER ()) % 2 = 0 THEN CEIL((po.items->0->>'quantity')::int / 24.0) ELSE NULL END,
  CASE WHEN (ROW_NUMBER() OVER ()) % 2 = 0 THEN 30 ELSE NULL END,
  CASE WHEN (ROW_NUMBER() OVER ()) % 2 = 0 THEN 20 ELSE NULL END,
  CASE WHEN (ROW_NUMBER() OVER ()) % 2 = 0 THEN 15 ELSE NULL END,
  CASE WHEN (ROW_NUMBER() OVER ()) % 2 = 0 THEN 5.5 ELSE NULL END,
  'none',
  true,
  auth.uid()
FROM purchase_orders po
WHERE po.is_demo = true AND po.user_id = auth.uid();

-- Manufacturer Pack (4 POs amb generated_at, 2 amb sent_at)
UPDATE po_amazon_readiness
SET 
  manufacturer_pack_generated_at = NOW() - (INTERVAL '1 day' * (7 * (subq.row_num - 1))),
  manufacturer_pack_sent_at = CASE 
    WHEN subq.row_num <= 2 THEN 
      NOW() - (INTERVAL '1 day' * (7 * (subq.row_num - 1) + 2))
    ELSE NULL
  END,
  manufacturer_pack_version = CASE WHEN subq.row_num % 2 = 0 THEN 1 ELSE 2 END
FROM (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as row_num
  FROM po_amazon_readiness 
  WHERE is_demo = true AND user_id = auth.uid()
  ORDER BY created_at LIMIT 4
) subq
WHERE po_amazon_readiness.id = subq.id
  AND po_amazon_readiness.is_demo = true
  AND po_amazon_readiness.user_id = auth.uid();

-- ============================================
-- 10. SHIPMENTS (4 shipments variats)
-- ============================================
INSERT INTO po_shipments (
  purchase_order_id, shipment_type, carrier, tracking_number, pro_number,
  pickup_date, eta_date, status, notes, updated_at, is_demo, user_id
)
SELECT 
  po.id,
  CASE (ROW_NUMBER() OVER ()) % 3
    WHEN 0 THEN 'SPD'
    WHEN 1 THEN 'LTL'
    ELSE 'FTL'
  END,
  CASE (ROW_NUMBER() OVER ()) % 3
    WHEN 0 THEN 'UPS'
    WHEN 1 THEN 'Demo Freight Co'
    ELSE 'Worldwide Logistics'
  END,
  CASE (ROW_NUMBER() OVER ()) % 3
    WHEN 0 THEN '1Z' || UPPER(SUBSTRING(MD5(RANDOM()::text) FROM 1 FOR 16))
    ELSE NULL
  END,
  CASE (ROW_NUMBER() OVER ()) % 3
    WHEN 0 THEN NULL
    ELSE 'PRO' || LPAD((ROW_NUMBER() OVER ())::text, 8, '0')
  END,
  CASE (ROW_NUMBER() OVER ())
    WHEN 1 THEN CURRENT_DATE + INTERVAL '7 days'
    WHEN 2 THEN CURRENT_DATE - INTERVAL '3 days'
    WHEN 3 THEN CURRENT_DATE - INTERVAL '5 days'
    ELSE CURRENT_DATE - INTERVAL '14 days'
  END,
  CASE (ROW_NUMBER() OVER ())
    WHEN 1 THEN NULL
    WHEN 2 THEN CURRENT_DATE + INTERVAL '5 days'
    WHEN 3 THEN CURRENT_DATE + INTERVAL '3 days'
    ELSE CURRENT_DATE - INTERVAL '7 days'
  END,
  CASE (ROW_NUMBER() OVER ())
    WHEN 1 THEN 'planned'
    WHEN 2 THEN 'in_transit'
    WHEN 3 THEN 'in_transit'
    ELSE 'delivered'
  END,
  CASE (ROW_NUMBER() OVER ())
    WHEN 3 THEN 'Demo shipment (stale tracking)'
    ELSE 'Demo shipment ' || (ROW_NUMBER() OVER ())
  END,
  CASE (ROW_NUMBER() OVER ())
    WHEN 3 THEN NOW() - INTERVAL '8 days'
    ELSE NOW()
  END,
  true,
  auth.uid()
FROM purchase_orders po
WHERE po.is_demo = true AND po.user_id = auth.uid()
LIMIT 4;

-- ============================================
-- 11. TASKS (25 tasks variades)
-- ============================================
INSERT INTO tasks (
  entity_type, entity_id, title, notes, due_date, status, priority, source, is_demo, user_id
)
SELECT 
  CASE (ROW_NUMBER() OVER ()) % 4
    WHEN 0 THEN 'project'
    WHEN 1 THEN 'purchase_order'
    WHEN 2 THEN 'supplier'
    ELSE 'shipment'
  END,
  CASE (ROW_NUMBER() OVER ()) % 4
    WHEN 0 THEN (SELECT id FROM projects WHERE is_demo = true AND user_id = auth.uid() ORDER BY created_at LIMIT 1 OFFSET ((ROW_NUMBER() OVER ()) % 8))
    WHEN 1 THEN (SELECT id FROM purchase_orders WHERE is_demo = true AND user_id = auth.uid() ORDER BY created_at LIMIT 1 OFFSET ((ROW_NUMBER() OVER ()) % 6))
    WHEN 2 THEN (SELECT id FROM suppliers WHERE is_demo = true AND user_id = auth.uid() ORDER BY created_at LIMIT 1 OFFSET ((ROW_NUMBER() OVER ()) % 5))
    ELSE (SELECT id FROM po_shipments WHERE is_demo = true AND user_id = auth.uid() ORDER BY created_at LIMIT 1 OFFSET ((ROW_NUMBER() OVER ()) % 4))
  END,
  'Demo Task ' || (ROW_NUMBER() OVER ()) || ': ' || 
  CASE (ROW_NUMBER() OVER ()) % 4
    WHEN 0 THEN 'project'
    WHEN 1 THEN 'purchase_order'
    WHEN 2 THEN 'supplier'
    ELSE 'shipment'
  END,
  'Demo task for testing',
  CASE 
    WHEN (ROW_NUMBER() OVER ()) < 8 THEN CURRENT_DATE
    WHEN (ROW_NUMBER() OVER ()) < 16 THEN CURRENT_DATE + INTERVAL '3 days'
    ELSE CURRENT_DATE + INTERVAL '10 days'
  END,
  CASE (ROW_NUMBER() OVER ()) % 3
    WHEN 0 THEN 'open'
    WHEN 1 THEN 'done'
    ELSE 'snoozed'
  END,
  CASE (ROW_NUMBER() OVER ()) % 3
    WHEN 0 THEN 'low'
    WHEN 1 THEN 'normal'
    ELSE 'high'
  END,
  CASE WHEN (ROW_NUMBER() OVER ()) < 5 THEN 'sticky_note' ELSE NULL END,
  true,
  auth.uid()
FROM generate_series(1, 25);

-- ============================================
-- 12. STICKY NOTES (12 notes: 8 open+pinned, 1 done, 3 converted)
-- ============================================
INSERT INTO sticky_notes (
  title, content, status, pinned, priority, linked_task_id, converted_to_task_at, is_demo, user_id
)
SELECT 
  'Demo Note ' || (ROW_NUMBER() OVER ()),
  'Demo sticky note content ' || (ROW_NUMBER() OVER ()),
  CASE 
    WHEN (ROW_NUMBER() OVER ()) = 8 THEN 'done'
    ELSE 'open'
  END,
  CASE 
    WHEN (ROW_NUMBER() OVER ()) <= 8 THEN true
    ELSE false
  END,
  CASE (ROW_NUMBER() OVER ()) % 3
    WHEN 0 THEN 'low'
    WHEN 1 THEN 'normal'
    ELSE 'high'
  END,
  CASE 
    WHEN (ROW_NUMBER() OVER ()) BETWEEN 9 AND 11 THEN 
      (SELECT id FROM tasks WHERE is_demo = true AND user_id = auth.uid() ORDER BY created_at LIMIT 1 OFFSET ((ROW_NUMBER() OVER ()) - 9))
    ELSE NULL
  END,
  CASE 
    WHEN (ROW_NUMBER() OVER ()) BETWEEN 9 AND 11 THEN NOW() - INTERVAL '1 day' * ((ROW_NUMBER() OVER ()) - 9)
    ELSE NULL
  END,
  true,
  auth.uid()
FROM generate_series(1, 12);

-- ============================================
-- 13. DECISION LOG (per projectes amb decisions)
-- ============================================
-- NOTA: decision_log no té columna is_demo, però es pot identificar per entity_id
INSERT INTO decision_log (
  entity_type, entity_id, decision, reason, notes, user_id
)
SELECT 
  'project',
  p.id,
  p.decision,
  CASE p.decision
    WHEN 'GO' THEN 'Profitability analysis shows positive ROI'
    WHEN 'RISKY' THEN 'Low margins, high competition risk'
    WHEN 'DISCARDED' THEN 'Market saturation, not viable'
    ELSE 'Pending review'
  END,
  'Demo decision log entry for ' || p.name,
  auth.uid()
FROM projects p
WHERE p.is_demo = true 
  AND p.user_id = auth.uid()
  AND p.decision IS NOT NULL;

-- ============================================
-- FINAL: Verificar dades generades
-- ============================================
SELECT 
  'Projects' as entity, COUNT(*) as count FROM projects WHERE is_demo = true AND user_id = auth.uid()
UNION ALL
SELECT 'Suppliers', COUNT(*) FROM suppliers WHERE is_demo = true AND user_id = auth.uid()
UNION ALL
SELECT 'GTINs', COUNT(*) FROM gtin_pool WHERE is_demo = true AND user_id = auth.uid()
UNION ALL
SELECT 'Quotes', COUNT(*) FROM supplier_quotes WHERE is_demo = true AND user_id = auth.uid()
UNION ALL
SELECT 'POs', COUNT(*) FROM purchase_orders WHERE is_demo = true AND user_id = auth.uid()
UNION ALL
SELECT 'Shipments', COUNT(*) FROM po_shipments WHERE is_demo = true AND user_id = auth.uid()
UNION ALL
SELECT 'Tasks', COUNT(*) FROM tasks WHERE is_demo = true AND user_id = auth.uid()
UNION ALL
SELECT 'Sticky Notes', COUNT(*) FROM sticky_notes WHERE is_demo = true AND user_id = auth.uid();
