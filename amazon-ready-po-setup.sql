-- ============================================
-- ⚠️ IMPORTANT: AQUEST ÉS EL FITXER SQL CORRECTE ⚠️
-- ============================================
-- NO executis el fitxer .md (documentació), executa AQUEST fitxer .sql
-- 
-- AMAZON READY PO SETUP
-- ============================================
-- Aquest script crea la taula per gestionar l'estat "Amazon Ready" de les Purchase Orders
-- Script IDEMPOTENT: Es pot executar múltiples vegades sense errors

-- ============================================
-- 1. TAULA PO_AMAZON_READINESS
-- ============================================
-- Un registre per Purchase Order amb tota la informació necessària per enviar a Amazon

CREATE TABLE IF NOT EXISTS po_amazon_readiness (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  purchase_order_id uuid NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  needs_fnsku boolean NOT NULL DEFAULT true,
  labels_generated_at timestamp with time zone NULL,
  labels_qty int NULL,
  labels_template text NULL CHECK (labels_template IN ('AVERY_5160', 'LABEL_40x30', 'ZEBRA_40x30')),
  units_per_carton int NULL,
  cartons_count int NULL,
  carton_length_cm numeric NULL,
  carton_width_cm numeric NULL,
  carton_height_cm numeric NULL,
  carton_weight_kg numeric NULL,
  prep_type text NULL, -- 'none', 'polybag', 'bubblewrap', 'labeling', etc.
  notes text NULL,
  UNIQUE(user_id, purchase_order_id)
);

-- Índexs per millorar consultes
CREATE INDEX IF NOT EXISTS idx_po_amazon_readiness_user_id_po_id ON po_amazon_readiness(user_id, purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_po_amazon_readiness_user_id_project_id ON po_amazon_readiness(user_id, project_id);
CREATE INDEX IF NOT EXISTS idx_po_amazon_readiness_user_id_updated_at ON po_amazon_readiness(user_id, updated_at DESC);

-- Habilitar RLS
ALTER TABLE po_amazon_readiness ENABLE ROW LEVEL SECURITY;

-- Policies RLS
DROP POLICY IF EXISTS "Users can view own po amazon readiness" ON po_amazon_readiness;
CREATE POLICY "Users can view own po amazon readiness" ON po_amazon_readiness
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own po amazon readiness" ON po_amazon_readiness;
CREATE POLICY "Users can insert own po amazon readiness" ON po_amazon_readiness
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own po amazon readiness" ON po_amazon_readiness;
CREATE POLICY "Users can update own po amazon readiness" ON po_amazon_readiness
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own po amazon readiness" ON po_amazon_readiness;
CREATE POLICY "Users can delete own po amazon readiness" ON po_amazon_readiness
  FOR DELETE USING (auth.uid() = user_id);

-- Trigger per actualitzar updated_at
CREATE OR REPLACE FUNCTION update_po_amazon_readiness_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_po_amazon_readiness_updated_at ON po_amazon_readiness;
CREATE TRIGGER trigger_update_po_amazon_readiness_updated_at
  BEFORE UPDATE ON po_amazon_readiness
  FOR EACH ROW
  EXECUTE FUNCTION update_po_amazon_readiness_updated_at();

-- ============================================
-- NOTES
-- ============================================
-- Aquesta taula gestiona l'estat "Amazon Ready" de cada Purchase Order
-- 
-- Regles:
-- - needs_fnsku=true → requereix FNSKU al projecte + etiquetes generades
-- - needs_fnsku=false → per casos d'Amazon barcode o no labeling
-- - Packaging mínim: units_per_carton, cartons_count, dimensions, weight
-- 
-- Quan es generen etiquetes, s'actualitza automàticament:
-- - labels_generated_at = now()
-- - labels_qty = quantitat generada
-- - labels_template = plantilla utilitzada


