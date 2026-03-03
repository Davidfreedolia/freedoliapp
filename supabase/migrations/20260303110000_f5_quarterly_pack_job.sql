-- F5.7 — Quarterly Export Pack Job + RPCs (no UI)

-----------------------------
-- 1) quarterly_export_jobs
-----------------------------

CREATE TABLE IF NOT EXISTS public.quarterly_export_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  year int NOT NULL,
  quarter int NOT NULL,
  period_status text NOT NULL,
  base_currency text NOT NULL,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running','done','failed')),
  file_path text NULL,
  checksum text NULL,
  error text NULL,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT quarterly_export_jobs_unique UNIQUE (org_id, year, quarter, period_status, base_currency)
);

ALTER TABLE public.quarterly_export_jobs ENABLE ROW LEVEL SECURITY;

-- SELECT: finance viewer
CREATE POLICY "Finance viewer select quarterly_export_jobs"
  ON public.quarterly_export_jobs
  FOR SELECT
  TO authenticated
  USING (public.is_org_finance_viewer(org_id));

-- INSERT: finance viewer
CREATE POLICY "Finance viewer insert quarterly_export_jobs"
  ON public.quarterly_export_jobs
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_org_finance_viewer(org_id));

-- No UPDATE/DELETE policies for clients; only service role / backend can update status, file_path, etc.

REVOKE ALL ON TABLE public.quarterly_export_jobs FROM PUBLIC;
REVOKE ALL ON TABLE public.quarterly_export_jobs FROM anon;
REVOKE ALL ON TABLE public.quarterly_export_jobs FROM authenticated;

-----------------------------
-- 2) updated_at trigger
-----------------------------

CREATE OR REPLACE FUNCTION public.set_quarterly_export_jobs_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS quarterly_export_jobs_set_updated_at ON public.quarterly_export_jobs;

CREATE TRIGGER quarterly_export_jobs_set_updated_at
BEFORE UPDATE ON public.quarterly_export_jobs
FOR EACH ROW
EXECUTE FUNCTION public.set_quarterly_export_jobs_updated_at();

-----------------------------
-- 3) RPC: request_quarter_pack
-----------------------------

CREATE OR REPLACE FUNCTION public.request_quarter_pack(p_year int, p_quarter int)
RETURNS TABLE (job_id uuid, period_status text, base_currency text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
  v_period_status text;
  v_base_currency text;
  v_existing_id uuid;
BEGIN
  v_org_id := public.get_current_org_id();
  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'no_active_org';
  END IF;

  IF NOT public.is_org_finance_viewer(v_org_id) THEN
    RAISE EXCEPTION 'not_allowed';
  END IF;

  SELECT os.base_currency
  INTO v_base_currency
  FROM public.org_settings os
  WHERE os.org_id = v_org_id;

  IF v_base_currency IS NULL THEN
    v_base_currency := 'EUR';
  END IF;

  SELECT ap.status
  INTO v_period_status
  FROM public.accounting_periods ap
  WHERE ap.org_id = v_org_id
    AND ap.year = p_year
    AND ap.quarter = p_quarter;

  IF v_period_status IS NULL THEN
    v_period_status := 'open';
  END IF;

  INSERT INTO public.quarterly_export_jobs AS qj (
    org_id, year, quarter, period_status, base_currency, status, created_by
  )
  VALUES (
    v_org_id, p_year, p_quarter, v_period_status, v_base_currency, 'queued', auth.uid()
  )
  ON CONFLICT (org_id, year, quarter, period_status, base_currency)
  DO UPDATE SET
    status = 'queued',
    file_path = NULL,
    checksum = NULL,
    error = NULL,
    updated_at = now()
  RETURNING qj.id INTO v_existing_id;

  job_id := v_existing_id;
  period_status := v_period_status;
  base_currency := v_base_currency;
  RETURN NEXT;
END;
$$;

-----------------------------
-- 4) RPC: get_quarter_pack_job
-----------------------------

CREATE OR REPLACE FUNCTION public.get_quarter_pack_job(p_job_id uuid)
RETURNS TABLE (
  status text,
  file_path text,
  checksum text,
  error text,
  period_status text,
  base_currency text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
BEGIN
  SELECT org_id
  INTO v_org_id
  FROM public.quarterly_export_jobs
  WHERE id = p_job_id;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'job_not_found';
  END IF;

  IF NOT public.is_org_finance_viewer(v_org_id) THEN
    RAISE EXCEPTION 'not_allowed';
  END IF;

  RETURN QUERY
  SELECT
    qj.status,
    qj.file_path,
    qj.checksum,
    qj.error,
    qj.period_status,
    qj.base_currency
  FROM public.quarterly_export_jobs qj
  WHERE qj.id = p_job_id;
END;
$$;

-----------------------------
-- 5) Grants on RPCs
-----------------------------

REVOKE ALL ON FUNCTION public.request_quarter_pack(int, int) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_quarter_pack_job(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.request_quarter_pack(int, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_quarter_pack_job(uuid) TO authenticated;

-----------------------------
-- 6) RPC: list_quarter_pack_jobs
-----------------------------

CREATE OR REPLACE FUNCTION public.list_quarter_pack_jobs(p_limit int DEFAULT 20)
RETURNS SETOF public.quarterly_export_jobs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
BEGIN
  v_org_id := public.get_current_org_id();
  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'no_active_org';
  END IF;

  IF NOT public.is_org_finance_viewer(v_org_id) THEN
    RAISE EXCEPTION 'not_allowed';
  END IF;

  RETURN QUERY
  SELECT *
  FROM public.quarterly_export_jobs
  WHERE org_id = v_org_id
  ORDER BY created_at DESC
  LIMIT GREATEST(p_limit, 1);
END;
$$;

REVOKE ALL ON FUNCTION public.list_quarter_pack_jobs(int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_quarter_pack_jobs(int) TO authenticated;

