-- F7.3 — Amazon Imports: bucket + policies + RPC create_amazon_import_job

-----------------------------
-- 1) Bucket privat amazon-imports
-----------------------------

INSERT INTO storage.buckets (id, name, public)
VALUES ('amazon-imports', 'amazon-imports', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-----------------------------
-- 2) Policies: finance viewer upload només a org/{org_id}/amazon/imports/*
--    No lectura pública. service_role pot llegir (bypass RLS).
-----------------------------

-- INSERT: authenticated només a org/{org_id}/amazon/imports/* i ha de ser finance viewer d’aquella org
DROP POLICY IF EXISTS "amazon_imports_insert_org_finance" ON storage.objects;
CREATE POLICY "amazon_imports_insert_org_finance" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'amazon-imports'
    AND (storage.foldername(name))[1] = 'org'
    AND (storage.foldername(name))[2] <> ''
    AND (storage.foldername(name))[3] = 'amazon'
    AND (storage.foldername(name))[4] = 'imports'
    AND EXISTS (
      SELECT 1 FROM public.org_memberships om
      WHERE om.user_id = auth.uid()
        AND om.org_id::text = (storage.foldername(name))[2]
        AND om.role IN ('owner', 'admin', 'accountant')
    )
  );

-- SELECT: sense policy per authenticated/public → només service_role pot llegir objectes
-- (opcional: si vols que el creador pugui llegir el seu fitxer, afegir policy SELECT amb mateix path check)

-----------------------------
-- 3) RPC: create_amazon_import_job
-----------------------------

CREATE OR REPLACE FUNCTION public.create_amazon_import_job(
  p_file_name text,
  p_file_sha256 text,
  p_marketplace text,
  p_report_type text
)
RETURNS TABLE (job_id uuid, org_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
  v_job_id uuid;
BEGIN
  v_org_id := public.get_current_org_id();
  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'no_active_org';
  END IF;

  IF NOT public.is_org_finance_viewer(v_org_id) THEN
    RAISE EXCEPTION 'not_allowed';
  END IF;

  INSERT INTO public.amazon_import_jobs (
    org_id,
    file_name,
    file_sha256,
    marketplace,
    report_type,
    status,
    created_by
  ) VALUES (
    v_org_id,
    p_file_name,
    p_file_sha256,
    p_marketplace,
    p_report_type,
    'uploaded',
    auth.uid()
  )
  ON CONFLICT (org_id, file_sha256) DO UPDATE SET
    file_name = EXCLUDED.file_name,
    marketplace = EXCLUDED.marketplace,
    report_type = EXCLUDED.report_type,
    status = 'uploaded',
    error = NULL,
    updated_at = now()
  RETURNING amazon_import_jobs.id, amazon_import_jobs.org_id INTO v_job_id, v_org_id;

  job_id := v_job_id;
  org_id := v_org_id;
  RETURN NEXT;
  RETURN;
END;
$$;

REVOKE ALL ON FUNCTION public.create_amazon_import_job(text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_amazon_import_job(text, text, text, text) TO authenticated;
