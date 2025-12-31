-- ============================================
-- QUICK PROFITABILITY CALCULATOR SETUP
-- ============================================
-- Crea la taula per calcular profitabilitat ràpida a la fase Research
-- Script IDEMPOTENT: Es pot executar múltiples vegades sense errors

-- ============================================
-- 1. TAULA PROJECT_PROFITABILITY_BASIC
-- ============================================
-- Un registre per projecte amb tots els inputs i outputs de profitabilitat

CREATE TABLE IF NOT EXISTS project_profitability_basic (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  
  -- Inputs
  selling_price numeric NULL,
  cogs numeric NULL, -- Cost of Goods Sold
  shipping_per_unit numeric NULL,
  referral_fee_percent numeric NULL, -- Amazon referral fee %
  fba_fee_per_unit numeric NULL,
  ppc_per_unit numeric NULL DEFAULT 0, -- Pay Per Click (advertising)
  
  -- Outputs (calculats per l'app, guardats per referència)
  total_fees_per_unit numeric NULL,
  net_profit_per_unit numeric NULL,
  margin_percent numeric NULL,
  roi_percent numeric NULL,
  
  UNIQUE(user_id, project_id)
);

-- ============================================
-- 2. ÍNDEXS
-- ============================================

CREATE INDEX IF NOT EXISTS idx_project_profitability_user_project 
ON project_profitability_basic(user_id, project_id);

CREATE INDEX IF NOT EXISTS idx_project_profitability_user_updated_at 
ON project_profitability_basic(user_id, updated_at DESC);

-- ============================================
-- 3. RLS POLICIES
-- ============================================

ALTER TABLE project_profitability_basic ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profitability" ON project_profitability_basic;
CREATE POLICY "Users can view own profitability" ON project_profitability_basic
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own profitability" ON project_profitability_basic;
CREATE POLICY "Users can insert own profitability" ON project_profitability_basic
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own profitability" ON project_profitability_basic;
CREATE POLICY "Users can update own profitability" ON project_profitability_basic
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own profitability" ON project_profitability_basic;
CREATE POLICY "Users can delete own profitability" ON project_profitability_basic
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- 4. TRIGGER PER UPDATED_AT
-- ============================================

CREATE OR REPLACE FUNCTION update_project_profitability_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_project_profitability_updated_at ON project_profitability_basic;
CREATE TRIGGER trigger_update_project_profitability_updated_at
  BEFORE UPDATE ON project_profitability_basic
  FOR EACH ROW
  EXECUTE FUNCTION update_project_profitability_updated_at();

-- ============================================
-- NOTES
-- ============================================
-- Aquesta taula permet calcular profitabilitat ràpida a la fase Research
-- 
-- Càlculs (fets a l'app):
-- - total_fees_per_unit = shipping_per_unit + (selling_price * referral_fee_percent / 100) + fba_fee_per_unit + ppc_per_unit
-- - net_profit_per_unit = selling_price - cogs - total_fees_per_unit
-- - margin_percent = (net_profit_per_unit / selling_price) * 100
-- - roi_percent = (net_profit_per_unit / cogs) * 100 (si cogs > 0)
--
-- Badges automàtics segons margin_percent:
-- - GO: margin >= 30%
-- - RISKY: margin >= 15% i < 30%
-- - NO-GO: margin < 15%


