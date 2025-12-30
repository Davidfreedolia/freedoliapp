-- ============================================
-- ⚠️ IMPORTANT: AQUEST ÉS EL FITXER SQL CORRECTE ⚠️
-- ============================================
-- NO executis el fitxer .md (documentació), executa AQUEST fitxer .sql
-- 
-- DASHBOARD IMPROVEMENTS SQL
-- ============================================
-- Aquest script afegeix:
-- 1. tracking_number i logistics_status a purchase_orders
-- 2. Taula dashboard_preferences per widgets personalitzables
-- Script IDEMPOTENT: Es pot executar múltiples vegades sense errors

-- ============================================
-- 1. AFEGIR TRACKING NUMBER I LOGISTICS STATUS A PURCHASE_ORDERS
-- ============================================

-- Tracking number (text, opcional)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='purchase_orders' AND column_name='tracking_number') THEN
    ALTER TABLE purchase_orders ADD COLUMN tracking_number text;
  END IF;
END $$;

-- Logistics status (text controlat, opcional)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='purchase_orders' AND column_name='logistics_status') THEN
    ALTER TABLE purchase_orders ADD COLUMN logistics_status text;
    -- Valors possibles: production, pickup, in_transit, customs, amazon_fba, delivered
    -- S'hauria de fer CHECK constraint, però per MVP deixem text lliure
  END IF;
END $$;

-- Índex per millorar consultes
CREATE INDEX IF NOT EXISTS idx_purchase_orders_logistics_status ON purchase_orders(logistics_status);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_tracking_number ON purchase_orders(tracking_number);

-- ============================================
-- 2. CREAR TAULA DASHBOARD_PREFERENCES
-- ============================================

CREATE TABLE IF NOT EXISTS dashboard_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  widgets jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id)
);

-- Índex per millorar consultes
CREATE INDEX IF NOT EXISTS idx_dashboard_preferences_user_id ON dashboard_preferences(user_id);

-- Habilitar RLS
ALTER TABLE dashboard_preferences ENABLE ROW LEVEL SECURITY;

-- Policies RLS
DROP POLICY IF EXISTS "Users can view own dashboard preferences" ON dashboard_preferences;
CREATE POLICY "Users can view own dashboard preferences" ON dashboard_preferences
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own dashboard preferences" ON dashboard_preferences;
CREATE POLICY "Users can insert own dashboard preferences" ON dashboard_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own dashboard preferences" ON dashboard_preferences;
CREATE POLICY "Users can update own dashboard preferences" ON dashboard_preferences
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own dashboard preferences" ON dashboard_preferences;
CREATE POLICY "Users can delete own dashboard preferences" ON dashboard_preferences
  FOR DELETE USING (auth.uid() = user_id);

-- Trigger per actualitzar updated_at
CREATE OR REPLACE FUNCTION update_dashboard_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_dashboard_preferences_updated_at ON dashboard_preferences;
CREATE TRIGGER trigger_update_dashboard_preferences_updated_at
  BEFORE UPDATE ON dashboard_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_dashboard_preferences_updated_at();

-- ============================================
-- NOTES
-- ============================================
-- logistics_status valors esperats:
-- - production: En producció
-- - pickup: Recollida
-- - in_transit: En trànsit
-- - customs: A duanes
-- - amazon_fba: A Amazon FBA
-- - delivered: Lliurat
--
-- widgets JSONB estructura esperada:
-- {
--   "logistics_tracking": true,
--   "finance_chart": true,
--   "orders_in_progress": true,
--   "activity_feed": false
-- }



