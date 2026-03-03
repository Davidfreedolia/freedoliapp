-- F5.10 — Hardening: base_currency lock + prevent regen of locked packs

-----------------------------
-- A) Lock org_settings.base_currency after posting
-----------------------------

CREATE OR REPLACE FUNCTION public.org_settings_base_currency_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_exists boolean;
BEGIN
  IF NEW.base_currency IS DISTINCT FROM OLD.base_currency THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.financial_ledger l
      WHERE l.org_id = OLD.org_id
        AND l.status IN ('posted', 'locked')
      LIMIT 1
    )
    INTO v_exists;

    IF v_exists THEN
      RAISE EXCEPTION 'base_currency_locked';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS org_settings_base_currency_guard_trg ON public.org_settings;

CREATE TRIGGER org_settings_base_currency_guard_trg
BEFORE UPDATE ON public.org_settings
FOR EACH ROW
EXECUTE FUNCTION public.org_settings_base_currency_guard();

-----------------------------
-- B) Prevent regen of locked packs that are already done
-----------------------------

CREATE OR REPLACE FUNCTION public.enqueue_quarter_pack(
  p_org_id uuid,
  p_year int,
  p_quarter int
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_base_currency text;
  v_done_exists boolean;
BEGIN
  IF p_org_id IS NULL THEN
    RETURN;
  END IF;

  SELECT os.base_currency
  INTO v_base_currency
  FROM public.org_settings os
  WHERE os.org_id = p_org_id;

  IF v_base_currency IS NULL THEN
    v_base_currency := 'EUR';
  END IF;

  -- If there is already a DONE pack for this locked period/base currency, do nothing
  SELECT EXISTS (
    SELECT 1
    FROM public.quarterly_export_jobs qj
    WHERE qj.org_id = p_org_id
      AND qj.year = p_year
      AND qj.quarter = p_quarter
      AND qj.period_status = 'locked'
      AND qj.base_currency = v_base_currency
      AND qj.status = 'done'
  )
  INTO v_done_exists;

  IF v_done_exists THEN
    RETURN;
  END IF;

  INSERT INTO public.quarterly_export_jobs (
    org_id,
    year,
    quarter,
    period_status,
    base_currency,
    status,
    created_by
  )
  VALUES (
    p_org_id,
    p_year,
    p_quarter,
    'locked',
    v_base_currency,
    'queued',
    auth.uid()
  )
  ON CONFLICT (org_id, year, quarter, period_status, base_currency)
  DO NOTHING;
END;
$$;

