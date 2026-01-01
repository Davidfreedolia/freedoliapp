-- Sticky Notes ↔ Tasks Integration
-- Add fields to sticky_notes and tasks tables

-- 1) Update sticky_notes table
ALTER TABLE sticky_notes
  ADD COLUMN IF NOT EXISTS linked_task_id uuid REFERENCES tasks(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS converted_to_task_at timestamptz,
  ADD COLUMN IF NOT EXISTS due_date date;
-- Note: priority field is now in sticky-notes-setup.sql base script

-- Index for linked_task_id
CREATE INDEX IF NOT EXISTS idx_sticky_notes_linked_task ON sticky_notes(linked_task_id);

-- 2) Update tasks table - add source field
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS source text;

-- Index for source (optional, for filtering)
CREATE INDEX IF NOT EXISTS idx_tasks_source ON tasks(source);

-- Note: due_date, status, entity_type, entity_id already exist in tasks table
-- Note: entity_id is currently NOT NULL, but for global tasks from sticky notes,
-- we allow NULL to support global tasks:
ALTER TABLE tasks ALTER COLUMN entity_id DROP NOT NULL;
