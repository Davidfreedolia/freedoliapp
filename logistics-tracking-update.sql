-- ============================================
-- ⚠️ IMPORTANT: AQUEST ÉS EL FITXER SQL CORRECTE ⚠️
-- ============================================
-- NO executis el fitxer .md (documentació), executa AQUEST fitxer .sql
-- 
-- LOGISTICS TRACKING UPDATE TIMESTAMP
-- ============================================
-- Aquest script afegeix logistics_updated_at a purchase_orders
-- i un trigger per actualitzar-lo automàticament quan canvien
-- logistics_status o tracking_number
-- Script IDEMPOTENT: Es pot executar múltiples vegades sense errors

-- ============================================
-- 1. AFEGIR COLUMNA logistics_updated_at
-- ============================================

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='purchase_orders' AND column_name='logistics_updated_at') THEN
    ALTER TABLE purchase_orders ADD COLUMN logistics_updated_at timestamp with time zone;
    
    -- Inicialitzar amb updated_at si existeix, sinó amb created_at
    UPDATE purchase_orders 
    SET logistics_updated_at = COALESCE(updated_at, created_at)
    WHERE logistics_updated_at IS NULL;
  END IF;
END $$;

-- Índex per millorar consultes
CREATE INDEX IF NOT EXISTS idx_purchase_orders_logistics_updated_at ON purchase_orders(logistics_updated_at);

-- ============================================
-- 2. FUNCIÓ TRIGGER PER ACTUALITZAR logistics_updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_logistics_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  -- Actualitzar logistics_updated_at si logistics_status o tracking_number han canviat
  IF (OLD.logistics_status IS DISTINCT FROM NEW.logistics_status) OR
     (OLD.tracking_number IS DISTINCT FROM NEW.tracking_number) THEN
    NEW.logistics_updated_at = now();
  END IF;
  
  -- Si logistics_status o tracking_number s'estableixen per primera vegada
  IF (OLD.logistics_status IS NULL AND NEW.logistics_status IS NOT NULL) OR
     (OLD.tracking_number IS NULL AND NEW.tracking_number IS NOT NULL) THEN
    NEW.logistics_updated_at = now();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 3. CREAR TRIGGER
-- ============================================

DROP TRIGGER IF EXISTS trigger_update_logistics_updated_at ON purchase_orders;
CREATE TRIGGER trigger_update_logistics_updated_at
  BEFORE UPDATE ON purchase_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_logistics_updated_at();

-- ============================================
-- NOTES
-- ============================================
-- logistics_updated_at s'actualitza automàticament quan:
-- - Canvia logistics_status
-- - Canvia tracking_number
-- - S'estableix logistics_status per primera vegada (de NULL a valor)
-- - S'estableix tracking_number per primera vegada (de NULL a valor)
--
-- Per valors existents, s'inicialitza amb updated_at o created_at si logistics_updated_at és NULL

