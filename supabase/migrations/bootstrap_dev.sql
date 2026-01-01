-- ============================================
-- BOOTSTRAP DEV ENVIRONMENT - Freedoliapp
-- ============================================
-- Aquest script crea tot l'entorn DEV de Supabase
-- Script IDEMPOTENT: Es pot executar múltiples vegades sense errors
-- 
-- ORDRE D'EXECUCIÓ:
-- 1. Crear nou projecte Supabase (DEV)
-- 2. Crear almenys 1 usuari a Auth (Authentication > Users)
-- 3. Executar aquest script al SQL Editor (aquest fitxer)
-- 4. (Opcional) Executar seed_dev_data.sql per tenir dades de prova
-- 5. Configurar variables d'entorn a Vercel (Preview)
--
-- IMPORTANT: 
-- - Aquest script NO toca PROD
-- - Veure docs/DEV_SETUP_ORDER.md per guia completa
-- ============================================

-- ============================================
-- PART 0: CREATE BASE TABLES (if they don't exist)
-- ============================================
-- Aquestes són les taules base que necessita l'aplicació

-- Projects
CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  name text NOT NULL,
  project_code text,
  sku text,
  sku_internal text,
  phase integer DEFAULT 1,
  decision text CHECK (decision IN ('GO', 'HOLD', 'DISCARDED', 'RISKY')),
  status text DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
  notes text,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Suppliers
CREATE TABLE IF NOT EXISTS suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  name text NOT NULL,
  type text CHECK (type IN ('manufacturer', 'freight', 'inspection', 'warehouse', 'other')),
  contact_name text,
  email text,
  phone text,
  address text,
  country text,
  city text,
  incoterm text,
  payment_terms text,
  rating integer CHECK (rating >= 1 AND rating <= 5),
  notes text,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Purchase Orders
CREATE TABLE IF NOT EXISTS purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  supplier_id uuid REFERENCES suppliers(id) ON DELETE SET NULL,
  po_number text NOT NULL,
  order_date date,
  currency text DEFAULT 'EUR',
  incoterm text,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'confirmed', 'production', 'shipped', 'delivered', 'cancelled')),
  total_amount numeric DEFAULT 0,
  items jsonb DEFAULT '[]'::jsonb,
  tracking_number text,
  logistics_status text CHECK (logistics_status IN ('pending', 'production', 'pickup', 'in_transit', 'at_customs', 'delivered', 'amazon_fba')),
  notes text,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Documents
CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text,
  file_url text,
  file_path text,
  drive_file_id text,
  notes text,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Payments
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  purchase_order_id uuid REFERENCES purchase_orders(id) ON DELETE SET NULL,
  amount numeric NOT NULL,
  currency text DEFAULT 'EUR',
  payment_date date,
  payment_method text,
  notes text,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Warehouses
CREATE TABLE IF NOT EXISTS warehouses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  name text NOT NULL,
  address text,
  country text,
  city text,
  contact_name text,
  email text,
  phone text,
  notes text,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Company Settings
CREATE TABLE IF NOT EXISTS company_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  company_name text,
  company_address text,
  company_phone text,
  company_email text,
  company_vat text,
  company_logo_url text,
  currency text DEFAULT 'EUR',
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  UNIQUE(user_id)
);

-- Briefings
CREATE TABLE IF NOT EXISTS briefings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  content jsonb DEFAULT '{}'::jsonb,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Expenses
CREATE TABLE IF NOT EXISTS expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  category_id uuid,
  amount numeric NOT NULL,
  currency text DEFAULT 'EUR',
  description text,
  expense_date date DEFAULT CURRENT_DATE,
  notes text,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Incomes
CREATE TABLE IF NOT EXISTS incomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  category_id uuid,
  amount numeric NOT NULL,
  currency text DEFAULT 'EUR',
  description text,
  income_date date DEFAULT CURRENT_DATE,
  notes text,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Signatures
CREATE TABLE IF NOT EXISTS signatures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  document_id uuid REFERENCES documents(id) ON DELETE CASCADE,
  signer_name text,
  signer_email text,
  signature_data text,
  signed_at timestamp with time zone,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE
);

-- ============================================
-- PART 1: AUTH + RLS SETUP
-- ============================================
-- Afegir user_id si no existeix (per taules que ja existien abans)
-- Nota: Les taules creades a PART 0 ja tenen user_id, aquesta secció només
-- s'aplica si les taules existien abans sense user_id

-- Projects
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='projects') THEN
    -- Afegir user_id si no existeix
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='projects' AND column_name='user_id') THEN
      ALTER TABLE projects ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
    
    -- Afegir phase si no existeix
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='projects' AND column_name='phase') THEN
      ALTER TABLE projects ADD COLUMN phase integer DEFAULT 1;
    END IF;
    
    -- Afegir decision si no existeix
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='projects' AND column_name='decision') THEN
      ALTER TABLE projects ADD COLUMN decision text CHECK (decision IN ('GO', 'HOLD', 'DISCARDED', 'RISKY'));
    END IF;
    
    -- Afegir status si no existeix
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='projects' AND column_name='status') THEN
      ALTER TABLE projects ADD COLUMN status text DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived'));
    END IF;
    
    -- Afegir project_code si no existeix
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='projects' AND column_name='project_code') THEN
      ALTER TABLE projects ADD COLUMN project_code text;
    END IF;
    
    -- Afegir sku si no existeix
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='projects' AND column_name='sku') THEN
      ALTER TABLE projects ADD COLUMN sku text;
    END IF;
    
    -- Afegir sku_internal si no existeix
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='projects' AND column_name='sku_internal') THEN
      ALTER TABLE projects ADD COLUMN sku_internal text;
    END IF;
    
    -- Afegir notes si no existeix
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='projects' AND column_name='notes') THEN
      ALTER TABLE projects ADD COLUMN notes text;
    END IF;
  END IF;
END $$;

-- Suppliers
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='suppliers') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='suppliers' AND column_name='user_id') THEN
      ALTER TABLE suppliers ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

-- Purchase Orders
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='purchase_orders') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='purchase_orders' AND column_name='user_id') THEN
      ALTER TABLE purchase_orders ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

-- Documents
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='documents') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='documents' AND column_name='user_id') THEN
      ALTER TABLE documents ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

-- Payments
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='payments') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='payments' AND column_name='user_id') THEN
      ALTER TABLE payments ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

-- Warehouses
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='warehouses') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='warehouses' AND column_name='user_id') THEN
      ALTER TABLE warehouses ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

-- Company Settings
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='company_settings') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='company_settings' AND column_name='user_id') THEN
      ALTER TABLE company_settings ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

-- Briefings
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='briefings') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='briefings' AND column_name='user_id') THEN
      ALTER TABLE briefings ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

-- Expenses
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='expenses') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='expenses' AND column_name='user_id') THEN
      ALTER TABLE expenses ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

-- Incomes
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='incomes') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='incomes' AND column_name='user_id') THEN
      ALTER TABLE incomes ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

-- Signatures
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='signatures') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='signatures' AND column_name='user_id') THEN
      ALTER TABLE signatures ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

-- Assignar user_id NULL al primer usuari (si existeix)
-- Això només s'aplica si les taules ja existien abans sense user_id
DO $$
DECLARE
  first_user_id uuid;
BEGIN
  SELECT id INTO first_user_id FROM auth.users ORDER BY created_at ASC LIMIT 1;
  IF first_user_id IS NOT NULL THEN
    -- Només actualitzar si la taula i la columna existeixen
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='projects') 
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='user_id') THEN
      UPDATE projects SET user_id = first_user_id WHERE user_id IS NULL;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='suppliers') 
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='suppliers' AND column_name='user_id') THEN
      UPDATE suppliers SET user_id = first_user_id WHERE user_id IS NULL;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='purchase_orders') 
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='purchase_orders' AND column_name='user_id') THEN
      UPDATE purchase_orders SET user_id = first_user_id WHERE user_id IS NULL;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='documents') 
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='documents' AND column_name='user_id') THEN
      UPDATE documents SET user_id = first_user_id WHERE user_id IS NULL;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='payments') 
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payments' AND column_name='user_id') THEN
      UPDATE payments SET user_id = first_user_id WHERE user_id IS NULL;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='warehouses') 
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='warehouses' AND column_name='user_id') THEN
      UPDATE warehouses SET user_id = first_user_id WHERE user_id IS NULL;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='company_settings') 
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='company_settings' AND column_name='user_id') THEN
      UPDATE company_settings SET user_id = first_user_id WHERE user_id IS NULL;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='briefings') 
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='briefings' AND column_name='user_id') THEN
      UPDATE briefings SET user_id = first_user_id WHERE user_id IS NULL;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='expenses') 
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='expenses' AND column_name='user_id') THEN
      UPDATE expenses SET user_id = first_user_id WHERE user_id IS NULL;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='incomes') 
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='incomes' AND column_name='user_id') THEN
      UPDATE incomes SET user_id = first_user_id WHERE user_id IS NULL;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='signatures') 
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='signatures' AND column_name='user_id') THEN
      UPDATE signatures SET user_id = first_user_id WHERE user_id IS NULL;
    END IF;
  END IF;
END $$;

-- Aplicar DEFAULT auth.uid() i NOT NULL
-- Només si la columna user_id existeix i no és ja NOT NULL
DO $$
BEGIN
  -- Projects
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name='projects' AND column_name='user_id'
             AND is_nullable='YES') THEN
    ALTER TABLE projects 
      ALTER COLUMN user_id SET DEFAULT auth.uid();
    -- Intentar SET NOT NULL només si no hi ha valors NULL
    BEGIN
      ALTER TABLE projects ALTER COLUMN user_id SET NOT NULL;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'No es pot fer NOT NULL a projects.user_id (pot haver-hi NULLs)';
    END;
  ELSIF EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name='projects' AND column_name='user_id') THEN
    -- Columna existeix però ja és NOT NULL, només actualitzar DEFAULT
    ALTER TABLE projects ALTER COLUMN user_id SET DEFAULT auth.uid();
  END IF;
  
  -- Suppliers
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name='suppliers' AND column_name='user_id'
             AND is_nullable='YES') THEN
    ALTER TABLE suppliers ALTER COLUMN user_id SET DEFAULT auth.uid();
    BEGIN
      ALTER TABLE suppliers ALTER COLUMN user_id SET NOT NULL;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'No es pot fer NOT NULL a suppliers.user_id';
    END;
  ELSIF EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name='suppliers' AND column_name='user_id') THEN
    ALTER TABLE suppliers ALTER COLUMN user_id SET DEFAULT auth.uid();
  END IF;
  
  -- Purchase Orders
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name='purchase_orders' AND column_name='user_id'
             AND is_nullable='YES') THEN
    ALTER TABLE purchase_orders ALTER COLUMN user_id SET DEFAULT auth.uid();
    BEGIN
      ALTER TABLE purchase_orders ALTER COLUMN user_id SET NOT NULL;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'No es pot fer NOT NULL a purchase_orders.user_id';
    END;
  ELSIF EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name='purchase_orders' AND column_name='user_id') THEN
    ALTER TABLE purchase_orders ALTER COLUMN user_id SET DEFAULT auth.uid();
  END IF;
  
  -- Documents
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name='documents' AND column_name='user_id'
             AND is_nullable='YES') THEN
    ALTER TABLE documents ALTER COLUMN user_id SET DEFAULT auth.uid();
    BEGIN
      ALTER TABLE documents ALTER COLUMN user_id SET NOT NULL;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'No es pot fer NOT NULL a documents.user_id';
    END;
  ELSIF EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name='documents' AND column_name='user_id') THEN
    ALTER TABLE documents ALTER COLUMN user_id SET DEFAULT auth.uid();
  END IF;
  
  -- Payments
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name='payments' AND column_name='user_id'
             AND is_nullable='YES') THEN
    ALTER TABLE payments ALTER COLUMN user_id SET DEFAULT auth.uid();
    BEGIN
      ALTER TABLE payments ALTER COLUMN user_id SET NOT NULL;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'No es pot fer NOT NULL a payments.user_id';
    END;
  ELSIF EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name='payments' AND column_name='user_id') THEN
    ALTER TABLE payments ALTER COLUMN user_id SET DEFAULT auth.uid();
  END IF;
  
  -- Warehouses
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name='warehouses' AND column_name='user_id'
             AND is_nullable='YES') THEN
    ALTER TABLE warehouses ALTER COLUMN user_id SET DEFAULT auth.uid();
    BEGIN
      ALTER TABLE warehouses ALTER COLUMN user_id SET NOT NULL;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'No es pot fer NOT NULL a warehouses.user_id';
    END;
  ELSIF EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name='warehouses' AND column_name='user_id') THEN
    ALTER TABLE warehouses ALTER COLUMN user_id SET DEFAULT auth.uid();
  END IF;
  
  -- Company Settings
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name='company_settings' AND column_name='user_id'
             AND is_nullable='YES') THEN
    ALTER TABLE company_settings ALTER COLUMN user_id SET DEFAULT auth.uid();
    BEGIN
      ALTER TABLE company_settings ALTER COLUMN user_id SET NOT NULL;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'No es pot fer NOT NULL a company_settings.user_id';
    END;
  ELSIF EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name='company_settings' AND column_name='user_id') THEN
    ALTER TABLE company_settings ALTER COLUMN user_id SET DEFAULT auth.uid();
  END IF;
  
  -- Briefings
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name='briefings' AND column_name='user_id'
             AND is_nullable='YES') THEN
    ALTER TABLE briefings ALTER COLUMN user_id SET DEFAULT auth.uid();
    BEGIN
      ALTER TABLE briefings ALTER COLUMN user_id SET NOT NULL;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'No es pot fer NOT NULL a briefings.user_id';
    END;
  ELSIF EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name='briefings' AND column_name='user_id') THEN
    ALTER TABLE briefings ALTER COLUMN user_id SET DEFAULT auth.uid();
  END IF;
  
  -- Expenses
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name='expenses' AND column_name='user_id'
             AND is_nullable='YES') THEN
    ALTER TABLE expenses ALTER COLUMN user_id SET DEFAULT auth.uid();
    BEGIN
      ALTER TABLE expenses ALTER COLUMN user_id SET NOT NULL;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'No es pot fer NOT NULL a expenses.user_id';
    END;
  ELSIF EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name='expenses' AND column_name='user_id') THEN
    ALTER TABLE expenses ALTER COLUMN user_id SET DEFAULT auth.uid();
  END IF;
  
  -- Incomes
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name='incomes' AND column_name='user_id'
             AND is_nullable='YES') THEN
    ALTER TABLE incomes ALTER COLUMN user_id SET DEFAULT auth.uid();
    BEGIN
      ALTER TABLE incomes ALTER COLUMN user_id SET NOT NULL;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'No es pot fer NOT NULL a incomes.user_id';
    END;
  ELSIF EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name='incomes' AND column_name='user_id') THEN
    ALTER TABLE incomes ALTER COLUMN user_id SET DEFAULT auth.uid();
  END IF;
  
  -- Signatures
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name='signatures' AND column_name='user_id'
             AND is_nullable='YES') THEN
    ALTER TABLE signatures ALTER COLUMN user_id SET DEFAULT auth.uid();
    BEGIN
      ALTER TABLE signatures ALTER COLUMN user_id SET NOT NULL;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'No es pot fer NOT NULL a signatures.user_id';
    END;
  ELSIF EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name='signatures' AND column_name='user_id') THEN
    ALTER TABLE signatures ALTER COLUMN user_id SET DEFAULT auth.uid();
  END IF;
END $$;

-- Índexs (només si la columna user_id existeix)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='user_id') THEN
    CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='suppliers' AND column_name='user_id') THEN
    CREATE INDEX IF NOT EXISTS idx_suppliers_user_id ON suppliers(user_id);
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='purchase_orders' AND column_name='user_id') THEN
    CREATE INDEX IF NOT EXISTS idx_purchase_orders_user_id ON purchase_orders(user_id);
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='documents' AND column_name='user_id') THEN
    CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payments' AND column_name='user_id') THEN
    CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='warehouses' AND column_name='user_id') THEN
    CREATE INDEX IF NOT EXISTS idx_warehouses_user_id ON warehouses(user_id);
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='company_settings' AND column_name='user_id') THEN
    CREATE INDEX IF NOT EXISTS idx_company_settings_user_id ON company_settings(user_id);
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='briefings' AND column_name='user_id') THEN
    CREATE INDEX IF NOT EXISTS idx_briefings_user_id ON briefings(user_id);
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='expenses' AND column_name='user_id') THEN
    CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON expenses(user_id);
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='incomes' AND column_name='user_id') THEN
    CREATE INDEX IF NOT EXISTS idx_incomes_user_id ON incomes(user_id);
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='signatures' AND column_name='user_id') THEN
    CREATE INDEX IF NOT EXISTS idx_signatures_user_id ON signatures(user_id);
  END IF;
END $$;

-- Habilitar RLS (només si la taula existeix)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='projects') THEN
    ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='suppliers') THEN
    ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='purchase_orders') THEN
    ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='documents') THEN
    ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='payments') THEN
    ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='warehouses') THEN
    ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='company_settings') THEN
    ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='briefings') THEN
    ALTER TABLE briefings ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='expenses') THEN
    ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='incomes') THEN
    ALTER TABLE incomes ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='signatures') THEN
    ALTER TABLE signatures ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Policies RLS (només si la taula i la columna user_id existeixen)
-- Projects
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='projects')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='user_id') THEN
    DROP POLICY IF EXISTS "Users can view own projects" ON projects;
    CREATE POLICY "Users can view own projects" ON projects
      FOR SELECT USING (auth.uid() = user_id);

    DROP POLICY IF EXISTS "Users can insert own projects" ON projects;
    CREATE POLICY "Users can insert own projects" ON projects
      FOR INSERT WITH CHECK (auth.uid() = user_id);

    DROP POLICY IF EXISTS "Users can update own projects" ON projects;
    CREATE POLICY "Users can update own projects" ON projects
      FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

    DROP POLICY IF EXISTS "Users can delete own projects" ON projects;
    CREATE POLICY "Users can delete own projects" ON projects
      FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- Suppliers
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='suppliers')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='suppliers' AND column_name='user_id') THEN
    DROP POLICY IF EXISTS "Users can view own suppliers" ON suppliers;
    CREATE POLICY "Users can view own suppliers" ON suppliers
      FOR SELECT USING (auth.uid() = user_id);

    DROP POLICY IF EXISTS "Users can insert own suppliers" ON suppliers;
    CREATE POLICY "Users can insert own suppliers" ON suppliers
      FOR INSERT WITH CHECK (auth.uid() = user_id);

    DROP POLICY IF EXISTS "Users can update own suppliers" ON suppliers;
    CREATE POLICY "Users can update own suppliers" ON suppliers
      FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

    DROP POLICY IF EXISTS "Users can delete own suppliers" ON suppliers;
    CREATE POLICY "Users can delete own suppliers" ON suppliers
      FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- Purchase Orders
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='purchase_orders')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='purchase_orders' AND column_name='user_id') THEN
    DROP POLICY IF EXISTS "Users can view own purchase_orders" ON purchase_orders;
    CREATE POLICY "Users can view own purchase_orders" ON purchase_orders
      FOR SELECT USING (auth.uid() = user_id);
    DROP POLICY IF EXISTS "Users can insert own purchase_orders" ON purchase_orders;
    CREATE POLICY "Users can insert own purchase_orders" ON purchase_orders
      FOR INSERT WITH CHECK (auth.uid() = user_id);
    DROP POLICY IF EXISTS "Users can update own purchase_orders" ON purchase_orders;
    CREATE POLICY "Users can update own purchase_orders" ON purchase_orders
      FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
    DROP POLICY IF EXISTS "Users can delete own purchase_orders" ON purchase_orders;
    CREATE POLICY "Users can delete own purchase_orders" ON purchase_orders
      FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- Documents
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='documents')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='documents' AND column_name='user_id') THEN
    DROP POLICY IF EXISTS "Users can view own documents" ON documents;
    CREATE POLICY "Users can view own documents" ON documents
      FOR SELECT USING (auth.uid() = user_id);
    DROP POLICY IF EXISTS "Users can insert own documents" ON documents;
    CREATE POLICY "Users can insert own documents" ON documents
      FOR INSERT WITH CHECK (auth.uid() = user_id);
    DROP POLICY IF EXISTS "Users can update own documents" ON documents;
    CREATE POLICY "Users can update own documents" ON documents
      FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
    DROP POLICY IF EXISTS "Users can delete own documents" ON documents;
    CREATE POLICY "Users can delete own documents" ON documents
      FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- Payments
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='payments')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payments' AND column_name='user_id') THEN
    DROP POLICY IF EXISTS "Users can view own payments" ON payments;
    CREATE POLICY "Users can view own payments" ON payments
      FOR SELECT USING (auth.uid() = user_id);
    DROP POLICY IF EXISTS "Users can insert own payments" ON payments;
    CREATE POLICY "Users can insert own payments" ON payments
      FOR INSERT WITH CHECK (auth.uid() = user_id);
    DROP POLICY IF EXISTS "Users can update own payments" ON payments;
    CREATE POLICY "Users can update own payments" ON payments
      FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
    DROP POLICY IF EXISTS "Users can delete own payments" ON payments;
    CREATE POLICY "Users can delete own payments" ON payments
      FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- Warehouses
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='warehouses')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='warehouses' AND column_name='user_id') THEN
    DROP POLICY IF EXISTS "Users can view own warehouses" ON warehouses;
    CREATE POLICY "Users can view own warehouses" ON warehouses
      FOR SELECT USING (auth.uid() = user_id);
    DROP POLICY IF EXISTS "Users can insert own warehouses" ON warehouses;
    CREATE POLICY "Users can insert own warehouses" ON warehouses
      FOR INSERT WITH CHECK (auth.uid() = user_id);
    DROP POLICY IF EXISTS "Users can update own warehouses" ON warehouses;
    CREATE POLICY "Users can update own warehouses" ON warehouses
      FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
    DROP POLICY IF EXISTS "Users can delete own warehouses" ON warehouses;
    CREATE POLICY "Users can delete own warehouses" ON warehouses
      FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- Company Settings
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='company_settings')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='company_settings' AND column_name='user_id') THEN
    DROP POLICY IF EXISTS "Users can view own company_settings" ON company_settings;
    CREATE POLICY "Users can view own company_settings" ON company_settings
      FOR SELECT USING (auth.uid() = user_id);
    DROP POLICY IF EXISTS "Users can insert own company_settings" ON company_settings;
    CREATE POLICY "Users can insert own company_settings" ON company_settings
      FOR INSERT WITH CHECK (auth.uid() = user_id);
    DROP POLICY IF EXISTS "Users can update own company_settings" ON company_settings;
    CREATE POLICY "Users can update own company_settings" ON company_settings
      FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
    DROP POLICY IF EXISTS "Users can delete own company_settings" ON company_settings;
    CREATE POLICY "Users can delete own company_settings" ON company_settings
      FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- Briefings
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='briefings')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='briefings' AND column_name='user_id') THEN
    DROP POLICY IF EXISTS "Users can view own briefings" ON briefings;
    CREATE POLICY "Users can view own briefings" ON briefings
      FOR SELECT USING (auth.uid() = user_id);
    DROP POLICY IF EXISTS "Users can insert own briefings" ON briefings;
    CREATE POLICY "Users can insert own briefings" ON briefings
      FOR INSERT WITH CHECK (auth.uid() = user_id);
    DROP POLICY IF EXISTS "Users can update own briefings" ON briefings;
    CREATE POLICY "Users can update own briefings" ON briefings
      FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
    DROP POLICY IF EXISTS "Users can delete own briefings" ON briefings;
    CREATE POLICY "Users can delete own briefings" ON briefings
      FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- Expenses
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='expenses')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='expenses' AND column_name='user_id') THEN
    DROP POLICY IF EXISTS "Users can view own expenses" ON expenses;
    CREATE POLICY "Users can view own expenses" ON expenses
      FOR SELECT USING (auth.uid() = user_id);
    DROP POLICY IF EXISTS "Users can insert own expenses" ON expenses;
    CREATE POLICY "Users can insert own expenses" ON expenses
      FOR INSERT WITH CHECK (auth.uid() = user_id);
    DROP POLICY IF EXISTS "Users can update own expenses" ON expenses;
    CREATE POLICY "Users can update own expenses" ON expenses
      FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
    DROP POLICY IF EXISTS "Users can delete own expenses" ON expenses;
    CREATE POLICY "Users can delete own expenses" ON expenses
      FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- Incomes
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='incomes')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='incomes' AND column_name='user_id') THEN
    DROP POLICY IF EXISTS "Users can view own incomes" ON incomes;
    CREATE POLICY "Users can view own incomes" ON incomes
      FOR SELECT USING (auth.uid() = user_id);
    DROP POLICY IF EXISTS "Users can insert own incomes" ON incomes;
    CREATE POLICY "Users can insert own incomes" ON incomes
      FOR INSERT WITH CHECK (auth.uid() = user_id);
    DROP POLICY IF EXISTS "Users can update own incomes" ON incomes;
    CREATE POLICY "Users can update own incomes" ON incomes
      FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
    DROP POLICY IF EXISTS "Users can delete own incomes" ON incomes;
    CREATE POLICY "Users can delete own incomes" ON incomes
      FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- Signatures
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='signatures')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='signatures' AND column_name='user_id') THEN
    DROP POLICY IF EXISTS "Users can view own signatures" ON signatures;
    CREATE POLICY "Users can view own signatures" ON signatures
      FOR SELECT USING (auth.uid() = user_id);
    DROP POLICY IF EXISTS "Users can insert own signatures" ON signatures;
    CREATE POLICY "Users can insert own signatures" ON signatures
      FOR INSERT WITH CHECK (auth.uid() = user_id);
    DROP POLICY IF EXISTS "Users can update own signatures" ON signatures;
    CREATE POLICY "Users can update own signatures" ON signatures
      FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
    DROP POLICY IF EXISTS "Users can delete own signatures" ON signatures;
    CREATE POLICY "Users can delete own signatures" ON signatures
      FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- ============================================
-- PART 2: DASHBOARD IMPROVEMENTS
-- ============================================
-- (Inclou contingut de dashboard-improvements.sql)

-- Tracking number i logistics_status a purchase_orders
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='purchase_orders' AND column_name='tracking_number') THEN
    ALTER TABLE purchase_orders ADD COLUMN tracking_number text;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='purchase_orders' AND column_name='logistics_status') THEN
    ALTER TABLE purchase_orders ADD COLUMN logistics_status text;
  END IF;
END $$;

-- Índexs de tracking (només si les columnes existeixen)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='purchase_orders' AND column_name='logistics_status') THEN
    CREATE INDEX IF NOT EXISTS idx_purchase_orders_logistics_status ON purchase_orders(logistics_status);
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='purchase_orders' AND column_name='tracking_number') THEN
    CREATE INDEX IF NOT EXISTS idx_purchase_orders_tracking_number ON purchase_orders(tracking_number);
  END IF;
END $$;

-- Dashboard preferences
CREATE TABLE IF NOT EXISTS dashboard_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  widgets jsonb NOT NULL DEFAULT '{}'::jsonb,
  layout jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id)
);

-- Índexs i RLS per dashboard_preferences (només si la taula existeix)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='dashboard_preferences') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='dashboard_preferences' AND column_name='user_id') THEN
      CREATE INDEX IF NOT EXISTS idx_dashboard_preferences_user_id ON dashboard_preferences(user_id);
    END IF;
    
    ALTER TABLE dashboard_preferences ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "Users can manage own dashboard preferences" ON dashboard_preferences;
    CREATE POLICY "Users can manage own dashboard preferences" ON dashboard_preferences
      FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- ============================================
-- PART 3: IDENTIFIERS (GTIN POOL + PRODUCT IDENTIFIERS)
-- ============================================
-- (Inclou contingut de identifiers-setup.sql)

CREATE TABLE IF NOT EXISTS gtin_pool (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  gtin_code text NOT NULL,
  gtin_type text NOT NULL CHECK (gtin_type IN ('EAN', 'UPC', 'GTIN_EXEMPT')),
  status text NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'assigned', 'archived')),
  assigned_to_project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  exemption_reason text,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, gtin_code)
);

-- Índexs i RLS per gtin_pool (només si la taula i user_id existeixen)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='gtin_pool') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='gtin_pool' AND column_name='user_id') THEN
      CREATE INDEX IF NOT EXISTS idx_gtin_pool_user_id ON gtin_pool(user_id);
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='gtin_pool' AND column_name='status') THEN
      CREATE INDEX IF NOT EXISTS idx_gtin_pool_status ON gtin_pool(status);
    END IF;
    
    ALTER TABLE gtin_pool ENABLE ROW LEVEL SECURITY;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='gtin_pool' AND column_name='user_id') THEN
      DROP POLICY IF EXISTS "Users can manage own gtin pool" ON gtin_pool;
      CREATE POLICY "Users can manage own gtin pool" ON gtin_pool
        FOR ALL USING (auth.uid() = user_id);
    END IF;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS product_identifiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  gtin_type text CHECK (gtin_type IN ('EAN', 'UPC', 'GTIN_EXEMPT')),
  gtin_code text,
  exemption_reason text,
  asin text,
  fnsku text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, project_id)
);

-- Índexs i RLS per product_identifiers (només si la taula i user_id existeixen)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='product_identifiers') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='product_identifiers' AND column_name='user_id') THEN
      CREATE INDEX IF NOT EXISTS idx_product_identifiers_user_id ON product_identifiers(user_id);
    END IF;
    
    ALTER TABLE product_identifiers ENABLE ROW LEVEL SECURITY;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='product_identifiers' AND column_name='user_id') THEN
      DROP POLICY IF EXISTS "Users can manage own product identifiers" ON product_identifiers;
      CREATE POLICY "Users can manage own product identifiers" ON product_identifiers
        FOR ALL USING (auth.uid() = user_id);
    END IF;
  END IF;
END $$;

-- ============================================
-- PART 4: TASKS
-- ============================================
-- (Inclou contingut de tasks-setup.sql)

CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  entity_type text NOT NULL CHECK (entity_type IN ('project', 'purchase_order', 'supplier', 'shipment')),
  entity_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  notes text,
  due_date date,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'done', 'snoozed')),
  priority text DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high')),
  source text DEFAULT 'manual' CHECK (source IN ('manual', 'sticky_note')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

-- Índexs i RLS per tasks (només si la taula i user_id existeixen)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='tasks') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tasks' AND column_name='user_id') THEN
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tasks' AND column_name='status') 
         AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tasks' AND column_name='due_date') THEN
        CREATE INDEX IF NOT EXISTS idx_tasks_user_status_due ON tasks(user_id, status, due_date);
      END IF;
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tasks' AND column_name='entity_type') 
         AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tasks' AND column_name='entity_id') THEN
        CREATE INDEX IF NOT EXISTS idx_tasks_user_entity ON tasks(user_id, entity_type, entity_id);
      END IF;
    END IF;
    
    ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tasks' AND column_name='user_id') THEN
      DROP POLICY IF EXISTS "Users can manage own tasks" ON tasks;
      CREATE POLICY "Users can manage own tasks" ON tasks
        FOR ALL USING (auth.uid() = user_id);
    END IF;
  END IF;
END $$;

-- ============================================
-- PART 5: STICKY NOTES
-- ============================================
-- (Inclou contingut de sticky-notes-setup.sql)

CREATE TABLE IF NOT EXISTS sticky_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  title text,
  content text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'done')),
  pinned boolean NOT NULL DEFAULT true,
  priority text DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high')),
  color text DEFAULT 'yellow' CHECK (color IN ('yellow', 'blue', 'green', 'pink', 'orange', 'purple')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Índexs i RLS per sticky_notes (només si la taula i user_id existeixen)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='sticky_notes') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sticky_notes' AND column_name='user_id') THEN
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sticky_notes' AND column_name='status') THEN
        CREATE INDEX IF NOT EXISTS idx_sticky_notes_user_status ON sticky_notes(user_id, status);
      END IF;
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sticky_notes' AND column_name='pinned') THEN
        CREATE INDEX IF NOT EXISTS idx_sticky_notes_user_pinned ON sticky_notes(user_id, pinned);
      END IF;
    END IF;
    
    ALTER TABLE sticky_notes ENABLE ROW LEVEL SECURITY;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sticky_notes' AND column_name='user_id') THEN
      DROP POLICY IF EXISTS "Users can manage own sticky notes" ON sticky_notes;
      CREATE POLICY "Users can manage own sticky notes" ON sticky_notes
        FOR ALL USING (auth.uid() = user_id);
    END IF;
  END IF;
END $$;

-- ============================================
-- PART 6: PROFITABILITY CALCULATOR
-- ============================================
-- (Inclou contingut de profitability-calculator-setup.sql)

CREATE TABLE IF NOT EXISTS project_profitability_basic (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  selling_price numeric NOT NULL DEFAULT 0,
  cogs numeric NOT NULL DEFAULT 0,
  shipping_per_unit numeric NOT NULL DEFAULT 0,
  referral_fee_percent numeric NOT NULL DEFAULT 15,
  fba_fee_per_unit numeric NOT NULL DEFAULT 0,
  ppc_per_unit numeric NOT NULL DEFAULT 0,
  other_costs_per_unit numeric NOT NULL DEFAULT 0,
  fixed_costs numeric NOT NULL DEFAULT 0,
  UNIQUE(user_id, project_id)
);

-- Índexs i RLS per project_profitability_basic (només si la taula i user_id existeixen)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='project_profitability_basic') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='project_profitability_basic' AND column_name='user_id') THEN
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='project_profitability_basic' AND column_name='project_id') THEN
        CREATE INDEX IF NOT EXISTS idx_project_profitability_user_project 
        ON project_profitability_basic(user_id, project_id);
      END IF;
    END IF;
    
    ALTER TABLE project_profitability_basic ENABLE ROW LEVEL SECURITY;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='project_profitability_basic' AND column_name='user_id') THEN
      DROP POLICY IF EXISTS "Users can manage own profitability" ON project_profitability_basic;
      CREATE POLICY "Users can manage own profitability" ON project_profitability_basic
        FOR ALL USING (auth.uid() = user_id);
    END IF;
  END IF;
END $$;

-- ============================================
-- PART 7: SUPPLIER QUOTES
-- ============================================
-- (Inclou contingut de supplier-quotes-setup.sql)

CREATE TABLE IF NOT EXISTS supplier_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  supplier_id uuid REFERENCES suppliers(id) ON DELETE SET NULL,
  quote_number text,
  unit_price numeric NOT NULL,
  currency text NOT NULL DEFAULT 'EUR',
  moq int,
  lead_time_days int,
  payment_terms text,
  notes text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Índexs i RLS per supplier_quotes (només si la taula i user_id existeixen)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='supplier_quotes') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='supplier_quotes' AND column_name='user_id') THEN
      CREATE INDEX IF NOT EXISTS idx_supplier_quotes_user_id ON supplier_quotes(user_id);
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='supplier_quotes' AND column_name='project_id') THEN
      CREATE INDEX IF NOT EXISTS idx_supplier_quotes_project_id ON supplier_quotes(project_id);
    END IF;
    
    ALTER TABLE supplier_quotes ENABLE ROW LEVEL SECURITY;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='supplier_quotes' AND column_name='user_id') THEN
      DROP POLICY IF EXISTS "Users can manage own supplier quotes" ON supplier_quotes;
      CREATE POLICY "Users can manage own supplier quotes" ON supplier_quotes
        FOR ALL USING (auth.uid() = user_id);
    END IF;
  END IF;
END $$;

-- ============================================
-- PART 8: AMAZON READY
-- ============================================
-- (Inclou contingut de amazon-ready-po-setup.sql)

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
  prep_type text NULL,
  notes text NULL,
  UNIQUE(user_id, purchase_order_id)
);

-- Índexs i RLS per po_amazon_readiness (només si la taula i user_id existeixen)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='po_amazon_readiness') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='po_amazon_readiness' AND column_name='user_id') THEN
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='po_amazon_readiness' AND column_name='purchase_order_id') THEN
        CREATE INDEX IF NOT EXISTS idx_po_amazon_readiness_user_id_po_id ON po_amazon_readiness(user_id, purchase_order_id);
      END IF;
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='po_amazon_readiness' AND column_name='project_id') THEN
        CREATE INDEX IF NOT EXISTS idx_po_amazon_readiness_user_id_project_id ON po_amazon_readiness(user_id, project_id);
      END IF;
    END IF;
    
    ALTER TABLE po_amazon_readiness ENABLE ROW LEVEL SECURITY;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='po_amazon_readiness' AND column_name='user_id') THEN
      DROP POLICY IF EXISTS "Users can manage own amazon readiness" ON po_amazon_readiness;
      CREATE POLICY "Users can manage own amazon readiness" ON po_amazon_readiness
        FOR ALL USING (auth.uid() = user_id);
    END IF;
  END IF;
END $$;

-- ============================================
-- PART 9: LOGISTICS TRACKING
-- ============================================
-- (Inclou contingut de po-shipments-setup.sql)

CREATE TABLE IF NOT EXISTS po_shipments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  purchase_order_id uuid NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  shipment_type text NOT NULL CHECK (shipment_type IN ('air', 'sea', 'express')),
  carrier text,
  tracking_number text,
  pickup_date date,
  eta_date date,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'picked_up', 'in_transit', 'at_customs', 'delivered')),
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Índexs i RLS per po_shipments (només si la taula i user_id existeixen)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='po_shipments') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='po_shipments' AND column_name='user_id') THEN
      CREATE INDEX IF NOT EXISTS idx_po_shipments_user_id ON po_shipments(user_id);
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='po_shipments' AND column_name='purchase_order_id') THEN
      CREATE INDEX IF NOT EXISTS idx_po_shipments_po_id ON po_shipments(purchase_order_id);
    END IF;
    
    ALTER TABLE po_shipments ENABLE ROW LEVEL SECURITY;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='po_shipments' AND column_name='user_id') THEN
      DROP POLICY IF EXISTS "Users can manage own shipments" ON po_shipments;
      CREATE POLICY "Users can manage own shipments" ON po_shipments
        FOR ALL USING (auth.uid() = user_id);
    END IF;
  END IF;
END $$;

-- ============================================
-- PART 10: DECISION LOG
-- ============================================
-- (Inclou contingut de decision-log-setup.sql)

CREATE TABLE IF NOT EXISTS decision_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_type text NOT NULL CHECK (entity_type IN ('project', 'quote', 'purchase_order')),
  entity_id uuid NOT NULL,
  decision text NOT NULL CHECK (decision IN ('go', 'hold', 'discarded', 'selected', 'rejected')),
  reason text,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, entity_type, entity_id)
);

-- Índexs i RLS per decision_log (només si la taula i user_id existeixen)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='decision_log') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='decision_log' AND column_name='user_id') THEN
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='decision_log' AND column_name='entity_type') 
         AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='decision_log' AND column_name='entity_id') THEN
        CREATE INDEX IF NOT EXISTS idx_decision_log_user_entity ON decision_log(user_id, entity_type, entity_id);
      END IF;
    END IF;
    
    ALTER TABLE decision_log ENABLE ROW LEVEL SECURITY;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='decision_log' AND column_name='user_id') THEN
      DROP POLICY IF EXISTS "Users can manage own decision log" ON decision_log;
      CREATE POLICY "Users can manage own decision log" ON decision_log
        FOR ALL USING (auth.uid() = user_id);
    END IF;
  END IF;
END $$;

-- ============================================
-- PART 11: SUPPLIER PRICE ESTIMATES
-- ============================================
-- (Inclou contingut de supplier-price-estimates-setup.sql)

CREATE TABLE IF NOT EXISTS supplier_price_estimates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  source text NOT NULL,
  price numeric NOT NULL,
  currency text NOT NULL DEFAULT 'EUR',
  moq int,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Índexs i RLS per supplier_price_estimates (només si la taula i user_id existeixen)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='supplier_price_estimates') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='supplier_price_estimates' AND column_name='user_id') THEN
      CREATE INDEX IF NOT EXISTS idx_supplier_price_estimates_user_id ON supplier_price_estimates(user_id);
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='supplier_price_estimates' AND column_name='project_id') THEN
      CREATE INDEX IF NOT EXISTS idx_supplier_price_estimates_project_id ON supplier_price_estimates(project_id);
    END IF;
    
    ALTER TABLE supplier_price_estimates ENABLE ROW LEVEL SECURITY;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='supplier_price_estimates' AND column_name='user_id') THEN
      DROP POLICY IF EXISTS "Users can manage own price estimates" ON supplier_price_estimates;
      CREATE POLICY "Users can manage own price estimates" ON supplier_price_estimates
        FOR ALL USING (auth.uid() = user_id);
    END IF;
  END IF;
END $$;

-- ============================================
-- PART 12: RECURRING EXPENSES
-- ============================================
-- (Inclou contingut de recurring-expenses-setup-LIMPIO.sql)

CREATE TABLE IF NOT EXISTS recurring_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id uuid,
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'EUR',
  frequency text NOT NULL CHECK (frequency IN ('monthly', 'quarterly', 'yearly')),
  start_date date NOT NULL,
  end_date date,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Índexs i RLS per recurring_expenses (només si la taula i user_id existeixen)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='recurring_expenses') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='recurring_expenses' AND column_name='user_id') THEN
      CREATE INDEX IF NOT EXISTS idx_recurring_expenses_user_id ON recurring_expenses(user_id);
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='recurring_expenses' AND column_name='category_id') THEN
      CREATE INDEX IF NOT EXISTS idx_recurring_expenses_category_id ON recurring_expenses(category_id);
    END IF;
    
    ALTER TABLE recurring_expenses ENABLE ROW LEVEL SECURITY;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='recurring_expenses' AND column_name='user_id') THEN
      DROP POLICY IF EXISTS "Users can manage own recurring expenses" ON recurring_expenses;
      CREATE POLICY "Users can manage own recurring expenses" ON recurring_expenses
        FOR ALL USING (auth.uid() = user_id);
    END IF;
  END IF;
END $$;

-- ============================================
-- PART 13: FINANCE CATEGORIES
-- ============================================
-- (Si existeix la taula finance_categories)

CREATE TABLE IF NOT EXISTS finance_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('expense', 'income')),
  color text,
  icon text,
  sort_order int DEFAULT 0,
  is_system boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, name, type)
);

-- Índexs i RLS per finance_categories (només si la taula i user_id existeixen)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='finance_categories') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='finance_categories' AND column_name='user_id') THEN
      CREATE INDEX IF NOT EXISTS idx_finance_categories_user_id ON finance_categories(user_id);
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='finance_categories' AND column_name='type') THEN
      CREATE INDEX IF NOT EXISTS idx_finance_categories_type ON finance_categories(type);
    END IF;
    
    ALTER TABLE finance_categories ENABLE ROW LEVEL SECURITY;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='finance_categories' AND column_name='user_id') THEN
      DROP POLICY IF EXISTS "Users can manage own finance categories" ON finance_categories;
      CREATE POLICY "Users can manage own finance categories" ON finance_categories
        FOR ALL USING (auth.uid() = user_id);
    END IF;
  END IF;
END $$;

-- ============================================
-- PART 14: CUSTOM CITIES (si existeix)
-- ============================================

CREATE TABLE IF NOT EXISTS custom_cities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  country text NOT NULL,
  city text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, country, city)
);

-- Índexs i RLS per custom_cities (només si la taula i user_id existeixen)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='custom_cities') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='custom_cities' AND column_name='user_id') THEN
      CREATE INDEX IF NOT EXISTS idx_custom_cities_user_id ON custom_cities(user_id);
    END IF;
    
    ALTER TABLE custom_cities ENABLE ROW LEVEL SECURITY;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='custom_cities' AND column_name='user_id') THEN
      DROP POLICY IF EXISTS "Users can manage own custom cities" ON custom_cities;
      CREATE POLICY "Users can manage own custom cities" ON custom_cities
        FOR ALL USING (auth.uid() = user_id);
    END IF;
  END IF;
END $$;

-- ============================================
-- FI DEL BOOTSTRAP
-- ============================================
-- Aquest script és IDEMPOTENT: es pot executar múltiples vegades sense errors.
-- 
-- PRÒXIMS PASSOS:
-- 1. Configurar variables d'entorn a Vercel (Preview)
-- 2. Opcional: Executar seed data per tenir dades de prova
-- 3. Verificar que tot funciona correctament

