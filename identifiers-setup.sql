-- ============================================
-- ⚠️ IMPORTANT: AQUEST ÉS EL FITXER SQL CORRECTE ⚠️
-- ============================================
-- NO executis el fitxer .md (documentació), executa AQUEST fitxer .sql
-- 
-- IDENTIFIERS SETUP - GTIN POOL + PRODUCT IDENTIFIERS
-- ============================================
-- Aquest script crea les taules per gestionar codis Amazon (GTIN, ASIN, FNSKU)
-- Script IDEMPOTENT: Es pot executar múltiples vegades sense errors

-- ============================================
-- 1. TAULA GTIN_POOL
-- ============================================
-- Pool de codis GTIN disponibles per assignar a projectes/SKUs

CREATE TABLE IF NOT EXISTS gtin_pool (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  gtin_code text NOT NULL,
  gtin_type text NOT NULL CHECK (gtin_type IN ('EAN', 'UPC', 'GTIN_EXEMPT')),
  status text NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'assigned', 'archived')),
  assigned_to_project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  exemption_reason text, -- Nullable, només si gtin_type = 'GTIN_EXEMPT'
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  -- Un GTIN no es pot assignar a 2 SKUs (a nivell de user_id)
  UNIQUE(user_id, gtin_code)
);

-- Índexs per millorar consultes
CREATE INDEX IF NOT EXISTS idx_gtin_pool_user_id ON gtin_pool(user_id);
CREATE INDEX IF NOT EXISTS idx_gtin_pool_status ON gtin_pool(status);
CREATE INDEX IF NOT EXISTS idx_gtin_pool_assigned_to_project_id ON gtin_pool(assigned_to_project_id);
CREATE INDEX IF NOT EXISTS idx_gtin_pool_gtin_type ON gtin_pool(gtin_type);

-- Habilitar RLS
ALTER TABLE gtin_pool ENABLE ROW LEVEL SECURITY;

-- Policies RLS
DROP POLICY IF EXISTS "Users can view own gtin pool" ON gtin_pool;
CREATE POLICY "Users can view own gtin pool" ON gtin_pool
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own gtin pool" ON gtin_pool;
CREATE POLICY "Users can insert own gtin pool" ON gtin_pool
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own gtin pool" ON gtin_pool;
CREATE POLICY "Users can update own gtin pool" ON gtin_pool
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own gtin pool" ON gtin_pool;
CREATE POLICY "Users can delete own gtin pool" ON gtin_pool
  FOR DELETE USING (auth.uid() = user_id);

-- Trigger per actualitzar updated_at
CREATE OR REPLACE FUNCTION update_gtin_pool_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_gtin_pool_updated_at ON gtin_pool;
CREATE TRIGGER trigger_update_gtin_pool_updated_at
  BEFORE UPDATE ON gtin_pool
  FOR EACH ROW
  EXECUTE FUNCTION update_gtin_pool_updated_at();

-- ============================================
-- 2. TAULA PRODUCT_IDENTIFIERS
-- ============================================
-- Identificadors assignats a cada projecte/SKU

CREATE TABLE IF NOT EXISTS product_identifiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  gtin_type text CHECK (gtin_type IN ('EAN', 'UPC', 'GTIN_EXEMPT')),
  gtin_code text, -- Nullable (obligatori null si GTIN_EXEMPT)
  exemption_reason text, -- Nullable, només si gtin_type = 'GTIN_EXEMPT'
  asin text,
  fnsku text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  -- Un projecte només pot tenir un registre d'identifiers
  UNIQUE(user_id, project_id)
);

-- Índexs per millorar consultes
CREATE INDEX IF NOT EXISTS idx_product_identifiers_user_id ON product_identifiers(user_id);
CREATE INDEX IF NOT EXISTS idx_product_identifiers_project_id ON product_identifiers(project_id);
CREATE INDEX IF NOT EXISTS idx_product_identifiers_gtin_code ON product_identifiers(gtin_code);
CREATE INDEX IF NOT EXISTS idx_product_identifiers_asin ON product_identifiers(asin);
CREATE INDEX IF NOT EXISTS idx_product_identifiers_fnsku ON product_identifiers(fnsku);

-- Habilitar RLS
ALTER TABLE product_identifiers ENABLE ROW LEVEL SECURITY;

-- Policies RLS
DROP POLICY IF EXISTS "Users can view own product identifiers" ON product_identifiers;
CREATE POLICY "Users can view own product identifiers" ON product_identifiers
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own product identifiers" ON product_identifiers;
CREATE POLICY "Users can insert own product identifiers" ON product_identifiers
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own product identifiers" ON product_identifiers;
CREATE POLICY "Users can update own product identifiers" ON product_identifiers
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own product identifiers" ON product_identifiers;
CREATE POLICY "Users can delete own product identifiers" ON product_identifiers
  FOR DELETE USING (auth.uid() = user_id);

-- Trigger per actualitzar updated_at
CREATE OR REPLACE FUNCTION update_product_identifiers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_product_identifiers_updated_at ON product_identifiers;
CREATE TRIGGER trigger_update_product_identifiers_updated_at
  BEFORE UPDATE ON product_identifiers
  FOR EACH ROW
  EXECUTE FUNCTION update_product_identifiers_updated_at();

-- ============================================
-- 3. CONSTRAINT: Si GTIN_EXEMPT → gtin_code ha de ser NULL
-- ============================================

CREATE OR REPLACE FUNCTION check_gtin_exempt_constraint()
RETURNS TRIGGER AS $$
BEGIN
  -- Si és GTIN_EXEMPT, gtin_code ha de ser NULL
  IF NEW.gtin_type = 'GTIN_EXEMPT' AND NEW.gtin_code IS NOT NULL THEN
    RAISE EXCEPTION 'GTIN_EXEMPT requereix que gtin_code sigui NULL';
  END IF;
  -- Si NO és GTIN_EXEMPT i gtin_type està definit, gtin_code és obligatori
  IF NEW.gtin_type IS NOT NULL AND NEW.gtin_type != 'GTIN_EXEMPT' AND (NEW.gtin_code IS NULL OR NEW.gtin_code = '') THEN
    RAISE EXCEPTION 'gtin_code és obligatori si gtin_type no és GTIN_EXEMPT';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_check_gtin_exempt_product_identifiers ON product_identifiers;
CREATE TRIGGER trigger_check_gtin_exempt_product_identifiers
  BEFORE INSERT OR UPDATE ON product_identifiers
  FOR EACH ROW
  EXECUTE FUNCTION check_gtin_exempt_constraint();

DROP TRIGGER IF EXISTS trigger_check_gtin_exempt_gtin_pool ON gtin_pool;
CREATE TRIGGER trigger_check_gtin_exempt_gtin_pool
  BEFORE INSERT OR UPDATE ON gtin_pool
  FOR EACH ROW
  EXECUTE FUNCTION check_gtin_exempt_constraint();

-- ============================================
-- NOTES
-- ============================================
-- gtin_type valors:
-- - EAN: European Article Number
-- - UPC: Universal Product Code
-- - GTIN_EXEMPT: Exempt de GTIN (necessita exemption_reason)
--
-- Validacions:
-- - GTIN_EXEMPT requereix gtin_code = NULL
-- - GTIN_EXEMPT requereix exemption_reason
-- - Un GTIN no es pot assignar a 2 projectes (via gtin_pool.assigned_to_project_id)
-- - Un projecte només pot tenir un product_identifiers

