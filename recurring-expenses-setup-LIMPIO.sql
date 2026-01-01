-- ============================================
-- RECURRING EXPENSES SETUP - VERSIÓ LIMPIA
-- ============================================
-- Setup per despeses recurrents mensuals
-- Script IDEMPOTENT: Es pot executar múltiples vegades sense errors
-- 
-- IMPORTANT: Aquest script NO crea dades demo.
-- Les dades demo s'han de crear des de la UI de Finances.

-- ============================================
-- PAS 1: Netejar registres orfes (si n'hi ha)
-- ============================================
DELETE FROM recurring_expenses WHERE user_id IS NULL;

-- ============================================
-- PAS 2: TAULA RECURRING_EXPENSES
-- ============================================

CREATE TABLE IF NOT EXISTS recurring_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Informació bàsica
  description text NOT NULL,
  amount numeric(10, 2) NOT NULL,
  currency text NOT NULL DEFAULT 'EUR',
  category_id uuid, -- REFERENCES finance_categories(id) ON DELETE SET NULL (opcional, si existeix)
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  supplier_id uuid REFERENCES suppliers(id) ON DELETE SET NULL,
  
  -- Recurrencia
  day_of_month integer NOT NULL CHECK (day_of_month >= 1 AND day_of_month <= 31),
  is_active boolean NOT NULL DEFAULT true,
  
  -- Notes
  notes text,
  
  -- Metadata
  last_generated_at timestamp with time zone,
  next_generation_date date
);

-- Índexs
CREATE INDEX IF NOT EXISTS idx_recurring_expenses_user_id ON recurring_expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_recurring_expenses_is_active ON recurring_expenses(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_recurring_expenses_next_generation ON recurring_expenses(user_id, next_generation_date) WHERE is_active = true;

-- Afegir foreign key a finance_categories si la taula existeix
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'finance_categories') THEN
    -- Eliminar constraint si existeix
    IF EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'recurring_expenses_category_id_fkey'
      AND table_name = 'recurring_expenses'
    ) THEN
      ALTER TABLE recurring_expenses DROP CONSTRAINT recurring_expenses_category_id_fkey;
    END IF;
    -- Afegir constraint
    ALTER TABLE recurring_expenses
    ADD CONSTRAINT recurring_expenses_category_id_fkey
    FOREIGN KEY (category_id) REFERENCES finance_categories(id) ON DELETE SET NULL;
  END IF;
END $$;

-- RLS
ALTER TABLE recurring_expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own recurring expenses" ON recurring_expenses;
CREATE POLICY "Users can view own recurring expenses" ON recurring_expenses
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own recurring expenses" ON recurring_expenses;
CREATE POLICY "Users can insert own recurring expenses" ON recurring_expenses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own recurring expenses" ON recurring_expenses;
CREATE POLICY "Users can update own recurring expenses" ON recurring_expenses
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own recurring expenses" ON recurring_expenses;
CREATE POLICY "Users can delete own recurring expenses" ON recurring_expenses
  FOR DELETE USING (auth.uid() = user_id);

-- Trigger per actualitzar updated_at
CREATE OR REPLACE FUNCTION update_recurring_expenses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_recurring_expenses_updated_at ON recurring_expenses;
CREATE TRIGGER trigger_update_recurring_expenses_updated_at
  BEFORE UPDATE ON recurring_expenses
  FOR EACH ROW
  EXECUTE FUNCTION update_recurring_expenses_updated_at();

-- ============================================
-- PAS 3: AFEGIR CAMPS A EXPENSES PER RECURRING
-- ============================================

-- Marcar si és una expense generada automàticament
ALTER TABLE expenses 
ADD COLUMN IF NOT EXISTS is_recurring boolean DEFAULT false;

-- Referència a la recurring expense original
ALTER TABLE expenses 
ADD COLUMN IF NOT EXISTS recurring_expense_id uuid REFERENCES recurring_expenses(id) ON DELETE SET NULL;

-- Estat: 'expected' o 'paid'
ALTER TABLE expenses 
ADD COLUMN IF NOT EXISTS recurring_status text CHECK (recurring_status IN ('expected', 'paid'));

-- Període (YYYY-MM) per evitar duplicats
ALTER TABLE expenses 
ADD COLUMN IF NOT EXISTS recurring_period text;

-- Índexs
CREATE INDEX IF NOT EXISTS idx_expenses_recurring_expense_id ON expenses(recurring_expense_id);
CREATE INDEX IF NOT EXISTS idx_expenses_recurring_period ON expenses(recurring_expense_id, recurring_period);
CREATE INDEX IF NOT EXISTS idx_expenses_recurring_status ON expenses(recurring_status) WHERE recurring_status IS NOT NULL;

-- ============================================
-- PAS 4: FUNCIÓ PER GENERAR EXPENSES AUTOMÀTIQUES
-- ============================================

CREATE OR REPLACE FUNCTION generate_recurring_expenses()
RETURNS integer AS $$
DECLARE
  v_recurring recurring_expenses%ROWTYPE;
  v_current_date date := CURRENT_DATE;
  v_target_month date;
  v_period text;
  v_expense_date date;
  v_generated_count integer := 0;
  v_existing_count integer;
BEGIN
  -- Per cada recurring expense actiu
  FOR v_recurring IN 
    SELECT * FROM recurring_expenses 
    WHERE is_active = true 
    AND user_id = auth.uid()
    AND (
      next_generation_date IS NULL 
      OR next_generation_date <= v_current_date
    )
  LOOP
    -- Calcular el mes objectiu (mes actual o següent)
    v_target_month := date_trunc('month', v_current_date);
    
    -- Si el day_of_month és més gran que els dies del mes, usar l'últim dia
    v_expense_date := LEAST(
      (v_target_month + (v_recurring.day_of_month - 1) * INTERVAL '1 day')::date,
      (v_target_month + INTERVAL '1 month' - INTERVAL '1 day')::date
    );
    
    -- Període en format YYYY-MM
    v_period := to_char(v_expense_date, 'YYYY-MM');
    
    -- Comprovar si ja existeix una expense per aquest període
    SELECT COUNT(*) INTO v_existing_count
    FROM expenses
    WHERE recurring_expense_id = v_recurring.id
    AND recurring_period = v_period;
    
    -- Si no existeix, crear-la
    IF v_existing_count = 0 THEN
      INSERT INTO expenses (
        user_id,
        project_id,
        category_id,
        supplier_id,
        description,
        amount,
        currency,
        expense_date,
        payment_status,
        notes,
        is_recurring,
        recurring_expense_id,
        recurring_status,
        recurring_period
      ) VALUES (
        v_recurring.user_id,
        v_recurring.project_id,
        v_recurring.category_id,
        v_recurring.supplier_id,
        v_recurring.description,
        v_recurring.amount,
        v_recurring.currency,
        v_expense_date,
        'pending',
        v_recurring.notes,
        true,
        v_recurring.id,
        'expected',
        v_period
      );
      
      v_generated_count := v_generated_count + 1;
    END IF;
    
    -- Actualitzar next_generation_date
    UPDATE recurring_expenses
    SET 
      next_generation_date = (v_target_month + INTERVAL '1 month')::date,
      last_generated_at = now()
    WHERE id = v_recurring.id;
    
  END LOOP;
  
  RETURN v_generated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;



