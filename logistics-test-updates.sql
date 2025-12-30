-- ============================================
-- ⚠️ IMPORTANT: AQUEST ÉS EL FITXER SQL CORRECTE ⚠️
-- ============================================
-- NO executis el fitxer .md (documentació), executa AQUEST fitxer .sql
-- 
-- SCRIPT DE TEST PER PROVAR BADGES DE TRACKING
-- ============================================
-- Aquest script actualitza logistics_updated_at de POs existents
-- per poder provar els badges taronja i vermell al Dashboard
-- 
-- IMPORTANT: Executar logistics-tracking-update.sql PRIMER

DO $$
DECLARE
  test_po_id uuid;
  user_id_val uuid;
BEGIN
  -- Obtenir l'usuari actual
  user_id_val := auth.uid();
  
  IF user_id_val IS NULL THEN
    RAISE NOTICE 'No hi ha usuari autenticat. Assegura''t d''estar loguejat.';
    RETURN;
  END IF;

  -- Buscar una PO amb tracking per provar
  SELECT id INTO test_po_id
  FROM purchase_orders
  WHERE user_id = user_id_val 
    AND logistics_status IS NOT NULL
    AND status NOT IN ('cancelled', 'received')
  ORDER BY created_at DESC
  LIMIT 1;

  IF test_po_id IS NULL THEN
    RAISE NOTICE 'No s''ha trobat cap PO amb tracking. Crea una PO amb logistics_status primer.';
    RETURN;
  END IF;

  -- Actualitzar amb 8 dies (per veure badge taronja)
  UPDATE purchase_orders 
  SET logistics_updated_at = now() - interval '8 days'
  WHERE id = test_po_id;

  RAISE NOTICE 'PO actualitzada amb 8 dies: %', test_po_id;
  RAISE NOTICE 'Ara hauries de veure badge TARONJA "Needs update" al Dashboard';
  RAISE NOTICE '';
  RAISE NOTICE 'Per provar badge VERMELL, executa aquest altre UPDATE:';
  RAISE NOTICE 'UPDATE purchase_orders SET logistics_updated_at = now() - interval ''15 days'' WHERE id = ''%'';', test_po_id;

END $$;

-- ============================================
-- OPCIONAL: Actualitzar TOTES les POs amb tracking
-- per veure com es comporta amb múltiples comandes
-- ============================================
-- Descomenta si vols actualitzar totes les POs:
/*
UPDATE purchase_orders 
SET logistics_updated_at = now() - interval '10 days'
WHERE user_id = auth.uid()
  AND logistics_status IS NOT NULL
  AND status NOT IN ('cancelled', 'received');
*/

