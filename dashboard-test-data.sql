-- ============================================
-- DADES DE TEST PER TRACKING LOGÍSTIC
-- ============================================
-- Aquest script crea dades de test per veure com funciona el widget de tracking al Dashboard
-- IMPORTANT: Executar dashboard-improvements.sql PRIMER
-- 
-- Aquest script:
-- 1. Busca el primer projecte actiu
-- 2. Busca el primer proveïdor
-- 3. Crea una PO de test amb tracking_number i logistics_status
-- 
-- Si no hi ha projectes o proveïdors, el script no farà res

DO $$
DECLARE
  test_project_id uuid;
  test_supplier_id uuid;
  test_po_id uuid;
  user_id_val uuid;
BEGIN
  -- Obtenir l'usuari actual
  user_id_val := auth.uid();
  
  IF user_id_val IS NULL THEN
    RAISE NOTICE 'No hi ha usuari autenticat. Assegura''t d''estar loguejat.';
    RETURN;
  END IF;

  -- Buscar el primer projecte actiu de l'usuari
  SELECT id INTO test_project_id
  FROM projects
  WHERE user_id = user_id_val AND status = 'active'
  ORDER BY created_at DESC
  LIMIT 1;

  -- Buscar el primer proveïdor de l'usuari
  SELECT id INTO test_supplier_id
  FROM suppliers
  WHERE user_id = user_id_val
  ORDER BY created_at DESC
  LIMIT 1;

  IF test_project_id IS NULL THEN
    RAISE NOTICE 'No s''ha trobat cap projecte actiu. Crea un projecte primer.';
    RETURN;
  END IF;

  IF test_supplier_id IS NULL THEN
    RAISE NOTICE 'No s''ha trobat cap proveïdor. Crea un proveïdor primer.';
    RETURN;
  END IF;

  -- Crear PO de test amb tracking
  -- Estat: in_transit (per veure el progrés)
  INSERT INTO purchase_orders (
    user_id,
    project_id,
    supplier_id,
    po_number,
    order_date,
    currency,
    incoterm,
    status,
    tracking_number,
    logistics_status,
    total_amount,
    items,
    created_at,
    updated_at
  ) VALUES (
    user_id_val,
    test_project_id,
    test_supplier_id,
    'TEST-PO-' || TO_CHAR(NOW(), 'YYYYMMDD-HH24MISS'),
    CURRENT_DATE,
    'USD',
    'FCA',
    'confirmed',
    'TEST-TRACK-123456789',
    'in_transit',
    1000.00,
    '[{"ref": "1", "description": "Producte de test", "qty": 100, "unit": "pcs", "unit_price": 10.00, "notes": ""}]',
    NOW(),
    NOW()
  )
  RETURNING id INTO test_po_id;

  RAISE NOTICE 'PO de test creada amb èxit!';
  RAISE NOTICE 'PO ID: %', test_po_id;
  RAISE NOTICE 'Project ID: %', test_project_id;
  RAISE NOTICE 'Tracking Number: TEST-TRACK-123456789';
  RAISE NOTICE 'Logistics Status: in_transit';
  RAISE NOTICE '';
  RAISE NOTICE 'Ara pots anar al Dashboard i veuràs el tracking logístic!';

END $$;

-- ============================================
-- CREAR MÚLTIPLES POS DE TEST (OPCIONAL)
-- ============================================
-- Descomenta aquest bloc si vols crear múltiples POs amb diferents estats

/*
DO $$
DECLARE
  test_project_id uuid;
  test_supplier_id uuid;
  user_id_val uuid;
  statuses text[] := ARRAY['production', 'pickup', 'in_transit', 'customs', 'amazon_fba'];
  status_names text[] := ARRAY['Producció', 'Recollida', 'En trànsit', 'Duanes', 'Amazon FBA'];
  i integer;
  test_po_id uuid;
BEGIN
  user_id_val := auth.uid();
  
  IF user_id_val IS NULL THEN RETURN; END IF;

  SELECT id INTO test_project_id
  FROM projects
  WHERE user_id = user_id_val AND status = 'active'
  ORDER BY created_at DESC
  LIMIT 1;

  SELECT id INTO test_supplier_id
  FROM suppliers
  WHERE user_id = user_id_val
  ORDER BY created_at DESC
  LIMIT 1;

  IF test_project_id IS NULL OR test_supplier_id IS NULL THEN
    RETURN;
  END IF;

  FOR i IN 1..array_length(statuses, 1) LOOP
    INSERT INTO purchase_orders (
      user_id, project_id, supplier_id, po_number, order_date,
      currency, incoterm, status, tracking_number, logistics_status,
      total_amount, items, created_at, updated_at
    ) VALUES (
      user_id_val, test_project_id, test_supplier_id,
      'TEST-PO-' || statuses[i] || '-' || TO_CHAR(NOW(), 'HH24MISS'),
      CURRENT_DATE, 'USD', 'FCA', 'confirmed',
      'TEST-' || UPPER(statuses[i]) || '-' || i,
      statuses[i],
      1000.00,
      '[{"ref": "1", "description": "Test ' || status_names[i] || '", "qty": 100, "unit": "pcs", "unit_price": 10.00}]',
      NOW(), NOW()
    )
    RETURNING id INTO test_po_id;
    
    RAISE NOTICE 'PO creada: % amb estat %', test_po_id, statuses[i];
  END LOOP;
END $$;
*/








