-- ============================================
-- SEED DATA PER DEV ENVIRONMENT (OPCIONAL)
-- ============================================
-- Aquest script crea dades de prova per l'entorn DEV
-- IMPORTANT: Només executar a DEV, mai a PROD!
-- 
-- ORDRE D'EXECUCIÓ:
-- 1. Crear projecte Supabase DEV
-- 2. Crear usuari a Auth (Authentication > Users)
-- 3. Executar bootstrap_dev.sql (OBLIGATORI)
-- 4. Executar aquest script (OPCIONAL)
--
-- Veure docs/DEV_SETUP_ORDER.md per guia completa
-- ============================================

-- Verificar que estem a DEV (safety check)
-- Aquest script només s'hauria d'executar manualment a DEV
-- IMPORTANT: Requereix almenys 1 usuari creat a Auth.users

DO $$
DECLARE
  user_id_val uuid;
  project_id_1 uuid;
  project_id_2 uuid;
  supplier_id_1 uuid;
  po_id_1 uuid;
BEGIN
  -- Obtenir el primer usuari de auth.users (no funciona auth.uid() al SQL Editor)
  SELECT id INTO user_id_val 
  FROM auth.users 
  ORDER BY created_at ASC 
  LIMIT 1;
  
  IF user_id_val IS NULL THEN
    RAISE EXCEPTION 'No hi ha usuaris a auth.users. Crea almenys un usuari a Authentication > Users primer.';
  END IF;
  
  RAISE NOTICE 'Utilitzant usuari: %', user_id_val;
  
  -- Verificar i afegir columnes que falten a projects (safety check)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='projects') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='projects' AND column_name='phase') THEN
      ALTER TABLE projects ADD COLUMN phase integer DEFAULT 1;
      RAISE NOTICE 'Columna phase afegida a projects';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='projects' AND column_name='decision') THEN
      ALTER TABLE projects ADD COLUMN decision text CHECK (decision IN ('GO', 'HOLD', 'DISCARDED', 'RISKY'));
      RAISE NOTICE 'Columna decision afegida a projects';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='projects' AND column_name='status') THEN
      ALTER TABLE projects ADD COLUMN status text DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived'));
      RAISE NOTICE 'Columna status afegida a projects';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='projects' AND column_name='project_code') THEN
      ALTER TABLE projects ADD COLUMN project_code text;
      RAISE NOTICE 'Columna project_code afegida a projects';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='projects' AND column_name='sku_internal') THEN
      ALTER TABLE projects ADD COLUMN sku_internal text;
      RAISE NOTICE 'Columna sku_internal afegida a projects';
    END IF;
  ELSE
    RAISE EXCEPTION 'La taula projects no existeix. Executa bootstrap_dev.sql primer.';
  END IF;
  
  -- Verificar i afegir columnes que falten a tasks (safety check)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='tasks') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='tasks' AND column_name='project_id') THEN
      ALTER TABLE tasks ADD COLUMN project_id uuid REFERENCES projects(id) ON DELETE CASCADE;
      RAISE NOTICE 'Columna project_id afegida a tasks';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='tasks' AND column_name='description') THEN
      ALTER TABLE tasks ADD COLUMN description text;
      RAISE NOTICE 'Columna description afegida a tasks';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='tasks' AND column_name='entity_type') THEN
      ALTER TABLE tasks ADD COLUMN entity_type text CHECK (entity_type IN ('project', 'purchase_order', 'supplier', 'shipment'));
      RAISE NOTICE 'Columna entity_type afegida a tasks';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='tasks' AND column_name='entity_id') THEN
      ALTER TABLE tasks ADD COLUMN entity_id uuid;
      RAISE NOTICE 'Columna entity_id afegida a tasks';
    END IF;
  END IF;

  -- Crear projectes de prova (només si no existeixen)
  -- phase: 1=Recerca, 2=Viabilitat, 3=Proveïdors, 4=Mostres, 5=Producció, 6=Listing, 7=Live
  
  -- Verificar si ja existeixen projectes demo
  SELECT id INTO project_id_1 FROM projects WHERE user_id = user_id_val AND project_code = 'PR-FRDL250001';
  SELECT id INTO project_id_2 FROM projects WHERE user_id = user_id_val AND project_code = 'PR-FRDL250002';
  
  -- Crear projecte 1 si no existeix
  IF project_id_1 IS NULL THEN
    INSERT INTO projects (user_id, name, project_code, sku_internal, phase, decision, status)
    VALUES (user_id_val, 'Projecte Demo 1', 'PR-FRDL250001', 'FRDL-DEMO-001', 1, NULL, 'active')
    RETURNING id INTO project_id_1;
    RAISE NOTICE 'Projecte Demo 1 creat';
  ELSE
    RAISE NOTICE 'Projecte Demo 1 ja existeix, saltant creació';
  END IF;
  
  -- Crear projecte 2 si no existeix
  IF project_id_2 IS NULL THEN
    INSERT INTO projects (user_id, name, project_code, sku_internal, phase, decision, status)
    VALUES (user_id_val, 'Projecte Demo 2', 'PR-FRDL250002', 'FRDL-DEMO-002', 5, 'GO', 'active')
    RETURNING id INTO project_id_2;
    RAISE NOTICE 'Projecte Demo 2 creat';
  ELSE
    RAISE NOTICE 'Projecte Demo 2 ja existeix, saltant creació';
  END IF;
  
  -- Assegurar que tenim els IDs (per si no s'han assignat abans)
  IF project_id_1 IS NULL THEN
    SELECT id INTO project_id_1 FROM projects WHERE user_id = user_id_val AND project_code = 'PR-FRDL250001';
  END IF;
  IF project_id_2 IS NULL THEN
    SELECT id INTO project_id_2 FROM projects WHERE user_id = user_id_val AND project_code = 'PR-FRDL250002';
  END IF;

  -- Crear proveïdor de prova (només si no existeix)
  SELECT id INTO supplier_id_1 FROM suppliers WHERE user_id = user_id_val AND name = 'Supplier Demo';
  
  IF supplier_id_1 IS NULL THEN
    INSERT INTO suppliers (user_id, name, contact_name, email, phone, address)
    VALUES (user_id_val, 'Supplier Demo', 'John Doe', 'john@supplier.com', '+34 600 000 000', 'Barcelona, Spain')
    RETURNING id INTO supplier_id_1;
    RAISE NOTICE 'Supplier Demo creat';
  ELSE
    RAISE NOTICE 'Supplier Demo ja existeix, saltant creació';
  END IF;

  -- Crear PO de prova (només si no existeix)
  IF project_id_1 IS NOT NULL AND supplier_id_1 IS NOT NULL THEN
    -- Verificar si ja existeix
    SELECT id INTO po_id_1 FROM purchase_orders 
    WHERE user_id = user_id_val AND po_number = 'PO-DEMO-001';
    
    IF po_id_1 IS NULL THEN
      INSERT INTO purchase_orders (user_id, project_id, supplier_id, po_number, order_date, currency, status, total_amount)
      VALUES (user_id_val, project_id_1, supplier_id_1, 'PO-DEMO-001', CURRENT_DATE, 'EUR', 'confirmed', 1000.00)
      RETURNING id INTO po_id_1;
      RAISE NOTICE 'PO Demo creat';
    ELSE
      RAISE NOTICE 'PO Demo ja existeix, saltant creació';
    END IF;
  END IF;

  -- Crear profitability de prova
  IF project_id_1 IS NOT NULL THEN
    INSERT INTO project_profitability_basic (user_id, project_id, selling_price, cogs, referral_fee_percent)
    VALUES (user_id_val, project_id_1, 49.99, 18.50, 15)
    ON CONFLICT (user_id, project_id) DO NOTHING;
  END IF;

  -- Crear sticky notes de prova (només si no existeixen)
  INSERT INTO sticky_notes (user_id, title, content, color, pinned)
  SELECT user_id_val, 'Nota Demo 1', 'Aquesta és una nota de prova', 'yellow', true
  WHERE NOT EXISTS (
    SELECT 1 FROM sticky_notes 
    WHERE user_id = user_id_val AND title = 'Nota Demo 1'
  );
  
  INSERT INTO sticky_notes (user_id, title, content, color, pinned)
  SELECT user_id_val, 'Nota Demo 2', 'Una altra nota de prova', 'blue', false
  WHERE NOT EXISTS (
    SELECT 1 FROM sticky_notes 
    WHERE user_id = user_id_val AND title = 'Nota Demo 2'
  );
  RAISE NOTICE 'Sticky Notes Demo creades o ja existien';

  -- Crear tasks de prova (només si no existeixen)
  IF project_id_1 IS NOT NULL THEN
    -- Verificar que la taula tasks existeix i té la columna project_id
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='tasks') THEN
      IF EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='tasks' AND column_name='project_id') THEN
        INSERT INTO tasks (user_id, project_id, entity_type, entity_id, title, notes, status, priority, due_date)
        SELECT user_id_val, project_id_1, 'project', project_id_1, 'Task Demo 1', 'Descripció de la task', 'open', 'high', CURRENT_DATE + INTERVAL '7 days'
        WHERE NOT EXISTS (
          SELECT 1 FROM tasks 
          WHERE user_id = user_id_val AND entity_type = 'project' AND entity_id = project_id_1 AND title = 'Task Demo 1'
        );
        
        INSERT INTO tasks (user_id, project_id, entity_type, entity_id, title, description, status, priority, due_date)
        SELECT user_id_val, project_id_1, 'project', project_id_1, 'Task Demo 2', 'Una altra task', 'open', 'normal', CURRENT_DATE + INTERVAL '14 days'
        WHERE NOT EXISTS (
          SELECT 1 FROM tasks 
          WHERE user_id = user_id_val AND entity_type = 'project' AND entity_id = project_id_1 AND title = 'Task Demo 2'
        );
        RAISE NOTICE 'Tasks Demo creades o ja existien';
      ELSE
        RAISE NOTICE 'La taula tasks no té columna project_id, saltant creació de tasks';
      END IF;
    ELSE
      RAISE NOTICE 'La taula tasks no existeix, saltant creació de tasks';
    END IF;
  END IF;

  RAISE NOTICE 'Seed data creat amb èxit!';
  RAISE NOTICE 'Projectes: 2';
  RAISE NOTICE 'Proveïdors: 1';
  RAISE NOTICE 'POs: 1';
  RAISE NOTICE 'Sticky Notes: 2';
  RAISE NOTICE 'Tasks: 2';

END $$;

