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
  selling_price numeric NOT NULL DEFAULT 0,
  cogs numeric NOT NULL DEFAULT 0, -- Cost of Goods Sold
  shipping_per_unit numeric NOT NULL DEFAULT 0,
  referral_fee_percent numeric NOT NULL DEFAULT 15, -- Amazon referral fee %
  fba_fee_per_unit numeric NOT NULL DEFAULT 0,
  ppc_per_unit numeric NOT NULL DEFAULT 0, -- Pay Per Click (advertising)
  other_costs_per_unit numeric NOT NULL DEFAULT 0,
  
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
