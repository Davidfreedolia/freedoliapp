-- Tasks system for Amazon FBA operations
-- Table: tasks
CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  entity_type text NOT NULL CHECK (entity_type IN ('project', 'purchase_order', 'supplier', 'shipment')),
  entity_id uuid NOT NULL,
  title text NOT NULL,
  notes text,
  due_date date,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'done', 'snoozed')),
  priority text DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_tasks_user_status_due ON tasks(user_id, status, due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_user_entity ON tasks(user_id, entity_type, entity_id);

-- RLS Policies
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Users can view own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can insert own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can update own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can delete own tasks" ON tasks;

-- Policy: Users can only see their own tasks
CREATE POLICY "Users can view own tasks"
  ON tasks FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own tasks
CREATE POLICY "Users can insert own tasks"
  ON tasks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own tasks
CREATE POLICY "Users can update own tasks"
  ON tasks FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own tasks
CREATE POLICY "Users can delete own tasks"
  ON tasks FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists (for idempotency)
DROP TRIGGER IF EXISTS tasks_updated_at ON tasks;

CREATE TRIGGER tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_tasks_updated_at();

-- Function to auto-create task when manufacturer pack is generated but not sent
CREATE OR REPLACE FUNCTION auto_create_send_pack_task()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id uuid;
  v_po_id uuid;
BEGIN
  -- Only trigger if manufacturer_pack_generated_at is set and manufacturer_pack_sent_at is null
  IF NEW.manufacturer_pack_generated_at IS NOT NULL 
     AND NEW.manufacturer_pack_sent_at IS NULL 
     AND (OLD.manufacturer_pack_generated_at IS NULL OR OLD.manufacturer_pack_sent_at IS NOT NULL) THEN
    
    -- Get user_id from po_amazon_readiness
    SELECT user_id INTO v_user_id
    FROM po_amazon_readiness
    WHERE id = NEW.id;
    
    -- Get po_id from purchase_orders via po_amazon_readiness
    SELECT po_id INTO v_po_id
    FROM po_amazon_readiness
    WHERE id = NEW.id;
    
    IF v_user_id IS NOT NULL AND v_po_id IS NOT NULL THEN
      -- Check if task already exists
      IF NOT EXISTS (
        SELECT 1 FROM tasks
        WHERE user_id = v_user_id
          AND entity_type = 'purchase_order'
          AND entity_id = v_po_id
          AND title = 'Send pack to manufacturer'
          AND status = 'open'
      ) THEN
        -- Create task
        INSERT INTO tasks (user_id, entity_type, entity_id, title, status, priority, due_date)
        VALUES (
          v_user_id,
          'purchase_order',
          v_po_id,
          'Send pack to manufacturer',
          'open',
          'high',
          CURRENT_DATE + INTERVAL '1 day'
        );
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for auto-creating send pack task
DROP TRIGGER IF EXISTS trigger_auto_create_send_pack_task ON po_amazon_readiness;
CREATE TRIGGER trigger_auto_create_send_pack_task
  AFTER UPDATE ON po_amazon_readiness
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_send_pack_task();

-- Function to auto-create task when shipment ETA is set
CREATE OR REPLACE FUNCTION auto_create_confirm_delivery_task()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id uuid;
  v_po_id uuid;
BEGIN
  -- Only trigger if eta_date exists and status is in_transit
  IF NEW.eta_date IS NOT NULL 
     AND NEW.status IN ('picked_up', 'in_transit')
     AND (OLD.eta_date IS NULL OR OLD.status NOT IN ('picked_up', 'in_transit')) THEN
    
    -- Get user_id and po_id from shipment
    SELECT user_id, po_id INTO v_user_id, v_po_id
    FROM po_shipments
    WHERE id = NEW.id;
    
    IF v_user_id IS NOT NULL AND v_po_id IS NOT NULL THEN
      -- Check if task already exists
      IF NOT EXISTS (
        SELECT 1 FROM tasks
        WHERE user_id = v_user_id
          AND entity_type = 'purchase_order'
          AND entity_id = v_po_id
          AND title = 'Confirm delivery'
          AND status = 'open'
      ) THEN
        -- Create task with due_date = eta_date + 1 day
        INSERT INTO tasks (user_id, entity_type, entity_id, title, status, priority, due_date)
        VALUES (
          v_user_id,
          'purchase_order',
          v_po_id,
          'Confirm delivery',
          'open',
          'high',
          NEW.eta_date + INTERVAL '1 day'
        );
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for auto-creating confirm delivery task (only if po_shipments table exists)
-- Note: This will fail silently if po_shipments doesn't exist yet
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'po_shipments') THEN
    DROP TRIGGER IF EXISTS trigger_auto_create_confirm_delivery_task ON po_shipments;
    CREATE TRIGGER trigger_auto_create_confirm_delivery_task
      AFTER UPDATE ON po_shipments
      FOR EACH ROW
      EXECUTE FUNCTION auto_create_confirm_delivery_task();
  END IF;
END $$;

