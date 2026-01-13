-- ============================================
-- RECEIPTS STORAGE BUCKET SETUP
-- ============================================
-- Create receipts bucket and RLS policies for invoice uploads
-- Script IDEMPOTENT: Can be executed multiple times without errors

-- ============================================
-- 1. CREATE BUCKET (if not exists)
-- ============================================

-- Check if bucket exists, create if not
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE name = 'receipts'
  ) THEN
    -- Create private bucket for receipts
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'receipts',
      'receipts',
      false, -- Private bucket
      10485760, -- 10MB limit
      ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']
    );
    RAISE NOTICE 'Bucket "receipts" created';
  ELSE
    RAISE NOTICE 'Bucket "receipts" already exists';
  END IF;
END $$;

-- ============================================
-- 2. STORAGE POLICIES (RLS)
-- ============================================

-- Policy: Users can upload their own receipts
DROP POLICY IF EXISTS "Users can upload own receipts" ON storage.objects;
CREATE POLICY "Users can upload own receipts" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'receipts' 
    AND (auth.uid())::text = (storage.foldername(name))[1]
  );

-- Policy: Users can view their own receipts
DROP POLICY IF EXISTS "Users can view own receipts" ON storage.objects;
CREATE POLICY "Users can view own receipts" ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'receipts' 
    AND (auth.uid())::text = (storage.foldername(name))[1]
  );

-- Policy: Users can delete their own receipts
DROP POLICY IF EXISTS "Users can delete own receipts" ON storage.objects;
CREATE POLICY "Users can delete own receipts" ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'receipts' 
    AND (auth.uid())::text = (storage.foldername(name))[1]
  );

-- Policy: Users can update their own receipts (for rename/replace)
DROP POLICY IF EXISTS "Users can update own receipts" ON storage.objects;
CREATE POLICY "Users can update own receipts" ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'receipts' 
    AND (auth.uid())::text = (storage.foldername(name))[1]
  )
  WITH CHECK (
    bucket_id = 'receipts' 
    AND (auth.uid())::text = (storage.foldername(name))[1]
  );

-- ============================================
-- 3. COMMENTS
-- ============================================

COMMENT ON TABLE storage.objects IS 'Storage objects for receipts (invoices/attachments)';
COMMENT ON COLUMN storage.objects.bucket_id IS 'Bucket name: receipts (private)';
COMMENT ON COLUMN storage.objects.name IS 'Path format: {userId}/expenses/{expenseId}/{timestamp}_{filename}';
