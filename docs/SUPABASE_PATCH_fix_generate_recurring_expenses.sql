-- ============================================
-- SUPABASE PATCH: Fix generate_recurring_expenses Function
-- ============================================
-- Run this script in Supabase SQL Editor to fix the recurring expenses generation
-- 
-- Issues fixed:
-- 1. Function now gets category name from finance_categories JOIN
-- 2. Function inserts BOTH category_id AND category (string, NOT NULL)
-- 3. Function skips templates with NULL category_id or category_name
-- 4. Function generates for any day_of_month <= current day in current month
-- 5. Function filters by is_demo = false (only real expenses)
-- ============================================

CREATE OR REPLACE FUNCTION public.generate_recurring_expenses()
RETURNS integer AS $$
DECLARE
  v_recurring RECORD;
  v_current_date date := CURRENT_DATE;
  v_current_day integer := EXTRACT(DAY FROM v_current_date);
  v_target_month date;
  v_period text;
  v_expense_date date;
  v_generated_count integer := 0;
  v_existing_count integer;
BEGIN
  -- Per cada recurring expense actiu amb categoria (real mode only)
  FOR v_recurring IN 
    SELECT re.*, fc.name as category_name
    FROM recurring_expenses re
    LEFT JOIN finance_categories fc ON fc.id = re.category_id
    WHERE re.is_active = true 
    AND re.user_id = auth.uid()
    AND re.is_demo = false  -- Only generate for real expenses (demo handled separately)
  LOOP
    -- Skip if category is missing (required for expenses.category NOT NULL)
    IF v_recurring.category_id IS NULL OR v_recurring.category_name IS NULL THEN
      CONTINUE;  -- Skip this recurring expense if no category
    END IF;
    
    -- Skip if day_of_month is in the future this month
    IF v_recurring.day_of_month > v_current_day THEN
      CONTINUE;
    END IF;
    
    -- Calcular el mes objectiu (mes actual)
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
    AND recurring_period = v_period
    AND is_demo = false;  -- Only check real expenses
    
    -- Si no existeix, crear-la
    IF v_existing_count = 0 THEN
      INSERT INTO expenses (
        user_id,
        project_id,
        category_id,
        category,
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
        recurring_period,
        is_demo
      ) VALUES (
        v_recurring.user_id,
        v_recurring.project_id,
        v_recurring.category_id,
        v_recurring.category_name,  -- REQUIRED: category string NOT NULL
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
        v_period,
        false  -- Generated expenses are always real (not demo)
      );
      
      v_generated_count := v_generated_count + 1;
    END IF;
    
    -- Actualitzar next_generation_date per al següent mes
    UPDATE recurring_expenses
    SET 
      next_generation_date = (v_target_month + INTERVAL '1 month')::date,
      last_generated_at = now()
    WHERE id = v_recurring.id;
    
  END LOOP;
  
  RETURN v_generated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

