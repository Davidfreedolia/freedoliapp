-- Decision Log System (MVP)
-- Table: decision_log
CREATE TABLE IF NOT EXISTS decision_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  entity_type text NOT NULL CHECK (entity_type IN ('project', 'quote', 'purchase_order')),
  entity_id uuid NOT NULL,
  decision text NOT NULL CHECK (decision IN ('go', 'hold', 'discarded', 'selected', 'rejected')),
  reason text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_decision_log_user_entity ON decision_log(user_id, entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_decision_log_created ON decision_log(created_at DESC);

-- RLS Policies
ALTER TABLE decision_log ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (idempotent)
DROP POLICY IF EXISTS "Users can view own decision logs" ON decision_log;
DROP POLICY IF EXISTS "Users can insert own decision logs" ON decision_log;
DROP POLICY IF EXISTS "Users can update own decision logs" ON decision_log;
DROP POLICY IF EXISTS "Users can delete own decision logs" ON decision_log;

-- Policy: Users can view own decision logs
CREATE POLICY "Users can view own decision logs"
  ON decision_log FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert own decision logs
CREATE POLICY "Users can insert own decision logs"
  ON decision_log FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update own decision logs
CREATE POLICY "Users can update own decision logs"
  ON decision_log FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete own decision logs
CREATE POLICY "Users can delete own decision logs"
  ON decision_log FOR DELETE
  USING (auth.uid() = user_id);

