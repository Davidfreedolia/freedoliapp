-- ============================================
-- SUPPLIER PRICE ESTIMATES SETUP
-- ============================================
-- Taula per guardar estimacions ràpides de preus de proveïdors
-- Utilitzat a la fase Research per tenir una idea inicial dels costos

CREATE TABLE IF NOT EXISTS supplier_price_estimates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  source text NOT NULL CHECK (source IN ('1688', 'Alibaba', 'Zentrada', 'Other')),
  price numeric(12, 2) NOT NULL,
  currency text NOT NULL DEFAULT 'EUR' CHECK (currency IN ('EUR', 'USD', 'CNY', 'GBP')),
  moq integer, -- Minimum Order Quantity (nullable)
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  -- Un usuari pot tenir múltiples estimacions per projecte
  UNIQUE(user_id, project_id, source, price, currency, moq) -- Evitar duplicats exactes
);

-- Índexs per millorar consultes
CREATE INDEX IF NOT EXISTS idx_supplier_price_estimates_user_id ON supplier_price_estimates(user_id);
CREATE INDEX IF NOT EXISTS idx_supplier_price_estimates_project_id ON supplier_price_estimates(project_id);
CREATE INDEX IF NOT EXISTS idx_supplier_price_estimates_source ON supplier_price_estimates(source);

-- Habilitar RLS
ALTER TABLE supplier_price_estimates ENABLE ROW LEVEL SECURITY;

-- Policies RLS
DROP POLICY IF EXISTS "Users can view own supplier price estimates" ON supplier_price_estimates;
CREATE POLICY "Users can view own supplier price estimates" ON supplier_price_estimates
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own supplier price estimates" ON supplier_price_estimates;
CREATE POLICY "Users can insert own supplier price estimates" ON supplier_price_estimates
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own supplier price estimates" ON supplier_price_estimates;
CREATE POLICY "Users can update own supplier price estimates" ON supplier_price_estimates
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own supplier price estimates" ON supplier_price_estimates;
CREATE POLICY "Users can delete own supplier price estimates" ON supplier_price_estimates
  FOR DELETE USING (auth.uid() = user_id);

-- Trigger per actualitzar updated_at
CREATE OR REPLACE FUNCTION update_supplier_price_estimates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_supplier_price_estimates_updated_at ON supplier_price_estimates;
CREATE TRIGGER trigger_update_supplier_price_estimates_updated_at
  BEFORE UPDATE ON supplier_price_estimates
  FOR EACH ROW
  EXECUTE FUNCTION update_supplier_price_estimates_updated_at();




