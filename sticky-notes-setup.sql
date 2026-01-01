-- Sticky Notes Table Setup (idempotent)
-- Persistent reminders/notes for dashboard

-- Drop table if exists (for idempotency - comment out in production)
-- DROP TABLE IF EXISTS sticky_notes CASCADE;

-- Create table
CREATE TABLE IF NOT EXISTS sticky_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text,
  content text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'done')),
  pinned boolean NOT NULL DEFAULT true,
  priority text DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high')),
  color text DEFAULT 'yellow' CHECK (color IN ('yellow', 'blue', 'green', 'pink', 'orange', 'purple')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sticky_notes_user_status ON sticky_notes(user_id, status);
CREATE INDEX IF NOT EXISTS idx_sticky_notes_user_pinned ON sticky_notes(user_id, pinned);

-- Updated_at trigger
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

-- RLS Policies
ALTER TABLE sticky_notes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Users can view own sticky notes" ON sticky_notes;
DROP POLICY IF EXISTS "Users can insert own sticky notes" ON sticky_notes;
DROP POLICY IF EXISTS "Users can update own sticky notes" ON sticky_notes;
DROP POLICY IF EXISTS "Users can delete own sticky notes" ON sticky_notes;

-- Create policies
CREATE POLICY "Users can view own sticky notes"
  ON sticky_notes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sticky notes"
  ON sticky_notes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sticky notes"
  ON sticky_notes FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own sticky notes"
  ON sticky_notes FOR DELETE
  USING (auth.uid() = user_id);
