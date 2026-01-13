-- ============================================
-- RECURRING EXPENSE OCCURRENCES
-- ============================================
-- Tabla para gestionar instancias mensuales de gastos recurrentes
-- Permite tracking de facturas y pagos por mes

-- ============================================
-- 1. ADD FIELDS TO recurring_expenses
-- ============================================

-- Add auto_generate field
ALTER TABLE recurring_expenses 
ADD COLUMN IF NOT EXISTS auto_generate boolean NOT NULL DEFAULT false;

-- Add auto_remind field
ALTER TABLE recurring_expenses 
ADD COLUMN IF NOT EXISTS auto_remind boolean NOT NULL DEFAULT true;

-- ============================================
-- 2. CREATE TABLE recurring_expense_occurrences
-- ============================================

-- Check if table exists and handle migration from old structure
DO $$
BEGIN
  -- If table doesn't exist, create it
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'recurring_expense_occurrences') THEN
    CREATE TABLE recurring_expense_occurrences (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      created_at timestamp with time zone DEFAULT now() NOT NULL,
      updated_at timestamp with time zone DEFAULT now() NOT NULL,
      user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
      
      -- Referencia a recurring expense
      recurring_expense_id uuid NOT NULL REFERENCES recurring_expenses(id) ON DELETE CASCADE,
      
      -- Mes (primer día del mes, e.g., 2026-01-01)
      month date NOT NULL,
      
      -- Fechas
      due_date date NOT NULL, -- Fecha de vencimiento (basada en day_of_month)
      
      -- Importes
      amount_expected numeric(10, 2) NOT NULL, -- Importe esperado (del recurring_expense)
      amount_actual numeric(10, 2), -- Importe real si difiere
      currency text NOT NULL DEFAULT 'EUR',
      
      -- Estado
      status text NOT NULL DEFAULT 'expected' CHECK (status IN ('expected', 'invoice_missing', 'paid')),
      
      -- Pago
      paid_date date, -- Fecha de pago
      
      -- Metadata
      notes text,
      
      -- Demo mode (mirror recurring_expenses approach)
      is_demo boolean NOT NULL DEFAULT false,
      
      -- Constraint único: un recurring_expense solo puede tener una occurrence por mes
      CONSTRAINT unique_recurring_month UNIQUE (recurring_expense_id, month)
    );
    RAISE NOTICE 'Table recurring_expense_occurrences created';
  ELSE
    -- Table exists, check if we need to migrate from old structure
    RAISE NOTICE 'Table recurring_expense_occurrences already exists, checking structure...';
    
    -- If month_date exists but month doesn't, migrate
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'recurring_expense_occurrences' 
               AND column_name = 'month_date')
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name = 'recurring_expense_occurrences' 
                       AND column_name = 'month') THEN
      
      RAISE NOTICE 'Migrating from month_date to month...';
      
      -- Add month column
      ALTER TABLE recurring_expense_occurrences ADD COLUMN month date;
      
      -- Copy data from month_date to month
      UPDATE recurring_expense_occurrences SET month = month_date;
      
      -- Make month NOT NULL
      ALTER TABLE recurring_expense_occurrences ALTER COLUMN month SET NOT NULL;
      
      -- Drop old constraint if it exists (might be on period or month_date)
      IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
                 WHERE table_name = 'recurring_expense_occurrences' 
                 AND constraint_name = 'unique_recurring_month') THEN
        ALTER TABLE recurring_expense_occurrences DROP CONSTRAINT unique_recurring_month;
      END IF;
      
      -- Recreate constraint with month
      ALTER TABLE recurring_expense_occurrences 
      ADD CONSTRAINT unique_recurring_month UNIQUE (recurring_expense_id, month);
      
      -- Drop old columns
      ALTER TABLE recurring_expense_occurrences DROP COLUMN IF EXISTS month_date;
      ALTER TABLE recurring_expense_occurrences DROP COLUMN IF EXISTS period;
      
      RAISE NOTICE 'Migration from month_date to month completed';
    END IF;
    
    -- Add missing columns if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'recurring_expense_occurrences' 
                   AND column_name = 'month') THEN
      RAISE NOTICE 'Adding month column...';
      ALTER TABLE recurring_expense_occurrences ADD COLUMN month date;
      
      -- Set default value for existing rows (first day of current month)
      UPDATE recurring_expense_occurrences 
      SET month = date_trunc('month', COALESCE(due_date, CURRENT_DATE))
      WHERE month IS NULL;
      
      ALTER TABLE recurring_expense_occurrences ALTER COLUMN month SET NOT NULL;
    END IF;
    
    -- Add currency if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'recurring_expense_occurrences' 
                   AND column_name = 'currency') THEN
      RAISE NOTICE 'Adding currency column...';
      ALTER TABLE recurring_expense_occurrences 
      ADD COLUMN currency text NOT NULL DEFAULT 'EUR';
    END IF;
    
    -- Add is_demo if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'recurring_expense_occurrences' 
                   AND column_name = 'is_demo') THEN
      RAISE NOTICE 'Adding is_demo column...';
      ALTER TABLE recurring_expense_occurrences 
      ADD COLUMN is_demo boolean NOT NULL DEFAULT false;
    END IF;
    
    -- Ensure constraint exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE table_name = 'recurring_expense_occurrences' 
                   AND constraint_name = 'unique_recurring_month') THEN
      RAISE NOTICE 'Adding unique_recurring_month constraint...';
      ALTER TABLE recurring_expense_occurrences 
      ADD CONSTRAINT unique_recurring_month UNIQUE (recurring_expense_id, month);
    END IF;
  END IF;
END $$;

-- ============================================
-- 3. INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_recurring_expense_occurrences_user_id 
  ON recurring_expense_occurrences(user_id);

CREATE INDEX IF NOT EXISTS idx_recurring_expense_occurrences_recurring_id 
  ON recurring_expense_occurrences(recurring_expense_id);

CREATE INDEX IF NOT EXISTS idx_recurring_expense_occurrences_user_month 
  ON recurring_expense_occurrences(user_id, month);

CREATE INDEX IF NOT EXISTS idx_recurring_expense_occurrences_status 
  ON recurring_expense_occurrences(status) WHERE status != 'paid';

CREATE INDEX IF NOT EXISTS idx_recurring_expense_occurrences_month 
  ON recurring_expense_occurrences(month);

-- ============================================
-- 4. RLS POLICIES
-- ============================================

ALTER TABLE recurring_expense_occurrences ENABLE ROW LEVEL SECURITY;

-- SELECT: Users can view own occurrences (strict, no demo leaks)
DROP POLICY IF EXISTS "Users can view own recurring expense occurrences" ON recurring_expense_occurrences;
CREATE POLICY "Users can view own recurring expense occurrences" ON recurring_expense_occurrences
  FOR SELECT
  USING (auth.uid() = user_id);

-- INSERT: Users can insert own occurrences
DROP POLICY IF EXISTS "Users can insert own recurring expense occurrences" ON recurring_expense_occurrences;
CREATE POLICY "Users can insert own recurring expense occurrences" ON recurring_expense_occurrences
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- UPDATE: Users can update own occurrences
DROP POLICY IF EXISTS "Users can update own recurring expense occurrences" ON recurring_expense_occurrences;
CREATE POLICY "Users can update own recurring expense occurrences" ON recurring_expense_occurrences
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETE: Users can delete own occurrences
DROP POLICY IF EXISTS "Users can delete own recurring expense occurrences" ON recurring_expense_occurrences;
CREATE POLICY "Users can delete own recurring expense occurrences" ON recurring_expense_occurrences
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- 5. TRIGGERS
-- ============================================

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_recurring_expense_occurrences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_recurring_expense_occurrences_updated_at 
  ON recurring_expense_occurrences;
CREATE TRIGGER trigger_update_recurring_expense_occurrences_updated_at
  BEFORE UPDATE ON recurring_expense_occurrences
  FOR EACH ROW
  EXECUTE FUNCTION update_recurring_expense_occurrences_updated_at();

-- ============================================
-- 6. ADD expense_id COLUMN (for linking to expenses)
-- ============================================

-- Add expense_id column to link occurrence to expense
ALTER TABLE recurring_expense_occurrences 
ADD COLUMN IF NOT EXISTS expense_id uuid REFERENCES expenses(id) ON DELETE SET NULL;

-- Create index on expense_id
CREATE INDEX IF NOT EXISTS idx_recurring_expense_occurrences_expense_id 
  ON recurring_expense_occurrences(expense_id);

-- Update RLS policy to ensure expense_id belongs to same user
-- The existing UPDATE policy already checks user_id, but we add explicit check for expense ownership
DROP POLICY IF EXISTS "Users can update own recurring expense occurrences" ON recurring_expense_occurrences;
CREATE POLICY "Users can update own recurring expense occurrences" ON recurring_expense_occurrences
  FOR UPDATE
  USING (
    auth.uid() = user_id 
    AND (
      expense_id IS NULL 
      OR expense_id IN (
        SELECT id FROM expenses WHERE user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    auth.uid() = user_id 
    AND (
      expense_id IS NULL 
      OR expense_id IN (
        SELECT id FROM expenses WHERE user_id = auth.uid()
      )
    )
  );

-- ============================================
-- 7. COMMENTS
-- ============================================

COMMENT ON TABLE recurring_expense_occurrences IS 'Instancias mensuales de gastos recurrentes';
COMMENT ON COLUMN recurring_expense_occurrences.month IS 'Primer día del mes (YYYY-MM-01)';
COMMENT ON COLUMN recurring_expense_occurrences.status IS 'Estado: expected (esperado), invoice_missing (falta factura), paid (pagado)';
COMMENT ON COLUMN recurring_expense_occurrences.expense_id IS 'Referencia al expense creado para esta occurrence (para attachments/receipts)';

-- Comments for recurring_expenses (auto_generate is in recurring_expenses, not occurrences)
COMMENT ON COLUMN recurring_expenses.auto_generate IS 'Si está activado, genera automáticamente occurrences cada mes (P1)';
COMMENT ON COLUMN recurring_expenses.auto_remind IS 'Si está activado, envía recordatorios para occurrences pendientes';
