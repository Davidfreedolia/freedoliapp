-- F5.7 — Quarterly Pack Signed URL RPC (on-demand)

-----------------------------
-- RPC: get_quarter_pack_signed_url
-----------------------------

CREATE OR REPLACE FUNCTION public.get_quarter_pack_signed_url(
  p_job_id uuid,
  p_expires_in int DEFAULT 604800  -- 7 dies per defecte
)
RETURNS TABLE (
  signed_url text,
  file_path text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
  v_status text;
  v_file_path text;
  v_signed_url text;
BEGIN
  SELECT org_id, status, file_path
  INTO v_org_id, v_status, v_file_path
  FROM public.quarterly_export_jobs
  WHERE id = p_job_id;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'job_not_found';
  END IF;

  IF NOT public.is_org_finance_viewer(v_org_id) THEN
    RAISE EXCEPTION 'not_allowed';
  END IF;

  IF v_status IS DISTINCT FROM 'done' THEN
    RAISE EXCEPTION 'job_not_ready';
  END IF;

  IF v_file_path IS NULL OR length(v_file_path) = 0 THEN
    RAISE EXCEPTION 'file_not_ready';
  END IF;

  -- Nota: suposem bucket privat 'exports'
  SELECT url
  INTO v_signed_url
  FROM storage.generate_presigned_url(
    'exports',
    v_file_path,
    p_expires_in,
    '{}'::jsonb
  );

  signed_url := v_signed_url;
  file_path := v_file_path;
  RETURN NEXT;
END;
$$;

-----------------------------
-- Grants
-----------------------------

REVOKE ALL ON FUNCTION public.get_quarter_pack_signed_url(uuid, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_quarter_pack_signed_url(uuid, int) TO authenticated;

