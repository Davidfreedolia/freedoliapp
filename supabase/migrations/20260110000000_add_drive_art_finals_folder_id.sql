-- Add drive_art_finals_folder_id column to projects table
-- This stores the Google Drive folder ID for the "Arts Finals" subfolder of each project

ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS drive_art_finals_folder_id text;

-- Optional index for faster lookups (useful if filtering by this field)
CREATE INDEX IF NOT EXISTS idx_projects_drive_art_finals_folder_id 
ON projects(drive_art_finals_folder_id) 
WHERE drive_art_finals_folder_id IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN projects.drive_art_finals_folder_id IS 'Google Drive folder ID for the Arts Finals subfolder of this project';
