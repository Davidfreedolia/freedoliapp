-- ============================================
-- Storage bucket: company-assets (logo d'empresa via company_settings.company_logo_url)
-- ============================================
-- Path: company/{user_id}/logo.(svg|png|...). Overwrite on re-upload.
-- ============================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('company-assets', 'company-assets', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Users can upload own company logo" ON storage.objects;
CREATE POLICY "Users can upload own company logo" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'company-assets'
    AND (storage.foldername(name))[1] = 'company'
    AND (storage.foldername(name))[2] = (auth.uid())::text
  );

DROP POLICY IF EXISTS "Users can view own company assets" ON storage.objects;
CREATE POLICY "Users can view own company assets" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'company-assets'
    AND (storage.foldername(name))[1] = 'company'
    AND (storage.foldername(name))[2] = (auth.uid())::text
  );

DROP POLICY IF EXISTS "Users can update own company logo" ON storage.objects;
CREATE POLICY "Users can update own company logo" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'company-assets'
    AND (storage.foldername(name))[1] = 'company'
    AND (storage.foldername(name))[2] = (auth.uid())::text
  )
  WITH CHECK (
    bucket_id = 'company-assets'
    AND (storage.foldername(name))[1] = 'company'
    AND (storage.foldername(name))[2] = (auth.uid())::text
  );

DROP POLICY IF EXISTS "Users can delete own company logo" ON storage.objects;
CREATE POLICY "Users can delete own company logo" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'company-assets'
    AND (storage.foldername(name))[1] = 'company'
    AND (storage.foldername(name))[2] = (auth.uid())::text
  );

DROP POLICY IF EXISTS "Public read company-assets" ON storage.objects;
CREATE POLICY "Public read company-assets" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'company-assets');
