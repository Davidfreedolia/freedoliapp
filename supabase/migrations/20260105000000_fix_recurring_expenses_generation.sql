-- ============================================
-- FIX: RECURRING EXPENSES GENERATION
-- ============================================
-- Fix the generate_recurring_expenses function to generate expenses
-- for any scheduled day <= current day in the current month (not just today)
-- ============================================

CREATE OR REPLACE FUNCTION generate_recurring_expenses()
RETURNS integer AS $$
DECLARE
  v_recurring recurring_expenses%ROWTYPE;
  v_current_date date := CURRENT_DATE;
  v_current_day integer := EXTRACT(DAY FROM v_current_date);
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
    AND is_demo = false  -- Only generate for real expenses (demo handled separately)
  LOOP
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

