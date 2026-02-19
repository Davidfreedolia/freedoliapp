-- Add viability_notes column to projects table
ALTER TABLE projects ADD COLUMN IF NOT EXISTS viability_notes text;

-- Add comment
COMMENT ON COLUMN projects.viability_notes IS 'Notes and objectives for viability phase (target prices, conditions, etc.)';
