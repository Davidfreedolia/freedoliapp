-- ============================================
-- ADD ARTS FINALS FOLDER ID TO PROJECTS
-- ============================================
-- This stores the Google Drive folder ID for the "Arts Finals" subfolder of each project
-- Folder structure: Root / Arts Finals / {PROJECT_REF or PROJECT_CODE} - {PROJECT_NAME}

BEGIN;

-- Add arts_finals_folder_id column
ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS arts_finals_folder_id text NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_projects_arts_finals_folder_id
ON public.projects (arts_finals_folder_id)
WHERE arts_finals_folder_id IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.projects.arts_finals_folder_id IS 'Google Drive folder ID for the Arts Finals subfolder of this project. Structure: Root / Arts Finals / {PROJECT_REF} - {PROJECT_NAME}';

-- RLS Policy: Only add if UPDATE policy doesn't already allow updating arts_finals_folder_id
-- Note: The existing "Users can update own projects" policy should already cover this,
-- but we add this check to ensure it exists without creating duplicates.
DO $$
BEGIN
  -- Check if RLS is enabled
  IF EXISTS (
    SELECT 1
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename = 'projects'
      AND rowsecurity = true
  ) THEN
    -- Check if UPDATE policy exists that allows users to update their own projects
    IF NOT EXISTS (
      SELECT 1
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'projects'
        AND policyname = 'Users can update own projects'
        AND cmd = 'UPDATE'
    ) THEN
      -- Create UPDATE policy if it doesn't exist
      CREATE POLICY "Users can update own projects"
      ON public.projects
      FOR UPDATE
      TO public
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
    END IF;
  END IF;
END $$;

COMMIT;
