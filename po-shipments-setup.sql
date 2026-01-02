-- ============================================
-- SHIPMENT TRACKING PER PO SETUP
-- ============================================
-- Script idempotent per crear la taula po_shipments
-- Gestiona tracking d'enviaments per Purchase Order (SPD/LTL/FTL)

-- ============================================
-- 1. TAULA PO_SHIPMENTS
-- ============================================

CREATE TABLE IF NOT EXISTS po_shipments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  purchase_order_id uuid NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  shipment_type text NOT NULL DEFAULT 'SPD' CHECK (shipment_type IN ('SPD','LTL','FTL')),
  carrier text NULL,
  tracking_number text NULL,
  pro_number text NULL,
  pickup_date date NULL,
  eta_date date NULL,
  status text NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','booked','picked_up','in_transit','delivered')),
  notes text NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, purchase_order_id)
);

-- ============================================
-- 2. ÍNDEXS
-- ============================================

CREATE INDEX IF NOT EXISTS idx_po_shipments_user_id_status ON po_shipments(user_id, status);
CREATE INDEX IF NOT EXISTS idx_po_shipments_user_id_eta_date ON po_shipments(user_id, eta_date);
CREATE INDEX IF NOT EXISTS idx_po_shipments_user_id_po_id ON po_shipments(user_id, purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_po_shipments_status ON po_shipments(status) WHERE status IN ('picked_up', 'in_transit');

-- ============================================
-- 3. TRIGGER PER UPDATED_AT
-- ============================================

CREATE OR REPLACE FUNCTION update_po_shipments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_po_shipments_updated_at ON po_shipments;
CREATE TRIGGER trigger_update_po_shipments_updated_at
  BEFORE UPDATE ON po_shipments
  FOR EACH ROW
  EXECUTE FUNCTION update_po_shipments_updated_at();

-- ============================================
-- 4. ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE po_shipments ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view own shipments
DROP POLICY IF EXISTS "Users can view own shipments" ON po_shipments;
CREATE POLICY "Users can view own shipments" ON po_shipments
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can insert own shipments
DROP POLICY IF EXISTS "Users can insert own shipments" ON po_shipments;
CREATE POLICY "Users can insert own shipments" ON po_shipments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update own shipments
DROP POLICY IF EXISTS "Users can update own shipments" ON po_shipments;
CREATE POLICY "Users can update own shipments" ON po_shipments
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete own shipments
DROP POLICY IF EXISTS "Users can delete own shipments" ON po_shipments;
CREATE POLICY "Users can delete own shipments" ON po_shipments
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- NOTES
-- ============================================
-- Shipment types:
--   - SPD: Small Parcel Delivery (tracking_number required)
--   - LTL: Less Than Truckload (pro_number required)
--   - FTL: Full Truckload (pro_number required)
--
-- Status flow:
--   planned -> booked -> picked_up -> in_transit -> delivered
--
-- Validations (aplicades a nivell aplicació):
--   - SPD: tracking_number required si status != 'planned'
--   - LTL/FTL: pro_number required si status != 'planned'





