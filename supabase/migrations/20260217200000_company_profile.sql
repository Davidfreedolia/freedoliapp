-- ============================================
-- company_profile: 1 row per user (logo + company data for PO PDF)
-- ============================================
-- RLS: each user can SELECT/INSERT/UPDATE own row only.
-- Storage: bucket company-assets, path company/{user_id}/logo.{ext}
-- ============================================

-- Table
CREATE TABLE IF NOT EXISTS public.company_profile (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name text,
  vat text,
  address_line1 text,
  address_line2 text,
  postal_code text,
  city text,
  country text,
  email text,
  phone text,
  logo_url text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Trigger: keep updated_at on UPDATE
CREATE OR REPLACE FUNCTION public.set_company_profile_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_company_profile_updated_at ON public.company_profile;
CREATE TRIGGER trg_company_profile_updated_at
  BEFORE UPDATE ON public.company_profile
  FOR EACH ROW
  EXECUTE FUNCTION public.set_company_profile_updated_at();

-- RLS
ALTER TABLE public.company_profile ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can select own company_profile" ON public.company_profile;
CREATE POLICY "Users can select own company_profile" ON public.company_profile
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own company_profile" ON public.company_profile;
CREATE POLICY "Users can insert own company_profile" ON public.company_profile
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own company_profile" ON public.company_profile;
CREATE POLICY "Users can update own company_profile" ON public.company_profile
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Grants
GRANT SELECT, INSERT, UPDATE ON public.company_profile TO authenticated;

-- ============================================
-- Storage bucket: company-assets (public read for PDF logo URL)
-- ============================================
-- Path: company/{user_id}/logo.png (or .svg). Overwrite on re-upload.
-- If your project cannot create buckets via SQL, create manually in Dashboard:
--   Storage > New bucket > name: company-assets, Public: true
-- Then add the policies below in Storage > company-assets > Policies.
-- ============================================

-- Minimal bucket creation (id, name, public) for compatibility.
-- Optional: in Dashboard set file_size_limit 2MB and allowed_mime_types image/*.
INSERT INTO storage.buckets (id, name, public)
VALUES ('company-assets', 'company-assets', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage policies: user can manage only own folder company/{user_id}/
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

-- Public read: allow anyone to read (for PDF embedding and public bucket)
DROP POLICY IF EXISTS "Public read company-assets" ON storage.objects;
CREATE POLICY "Public read company-assets" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'company-assets');
