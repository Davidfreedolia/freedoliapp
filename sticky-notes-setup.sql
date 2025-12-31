-- Sticky Notes Setup (idempotent)
-- Persistent reminders/notes for dashboard

-- Drop table if exists (for idempotency)
DROP TABLE IF EXISTS sticky_notes CASCADE;

-- Create table
CREATE TABLE sticky_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text,
  content text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'done')),
  pinned boolean NOT NULL DEFAULT true,
  color text DEFAULT 'yellow' CHECK (color IN ('yellow', 'blue', 'green', 'pink', 'orange')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_sticky_notes_user_status ON sticky_notes(user_id, status);
CREATE INDEX idx_sticky_notes_user_pinned ON sticky_notes(user_id, pinned);

-- RLS Policies
ALTER TABLE sticky_notes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own sticky notes" ON sticky_notes;
DROP POLICY IF EXISTS "Users can insert own sticky notes" ON sticky_notes;
DROP POLICY IF EXISTS "Users can update own sticky notes" ON sticky_notes;
DROP POLICY IF EXISTS "Users can delete own sticky notes" ON sticky_notes;

-- Create policies
CREATE POLICY "Users can view own sticky notes"
  ON sticky_notes FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own sticky notes"
  ON sticky_notes FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own sticky notes"
  ON sticky_notes FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own sticky notes"
  ON sticky_notes FOR DELETE
  USING (user_id = auth.uid());

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_sticky_notes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_sticky_notes_updated_at ON sticky_notes;
CREATE TRIGGER trigger_update_sticky_notes_updated_at
  BEFORE UPDATE ON sticky_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_sticky_notes_updated_at();

