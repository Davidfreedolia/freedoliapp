-- F5.9 — Quarterly Pack Automation (Lock → Job)

-----------------------------
-- 1) enqueue_quarter_pack helper
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

-----------------------------
-- 2) Trigger on accounting_periods
-----------------------------

CREATE OR REPLACE FUNCTION public.accounting_periods_enqueue_quarter_pack_trg()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  PERFORM public.enqueue_quarter_pack(NEW.org_id, NEW.year, NEW.quarter);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS accounting_periods_after_lock_quarter_pack ON public.accounting_periods;

CREATE TRIGGER accounting_periods_after_lock_quarter_pack
AFTER UPDATE ON public.accounting_periods
FOR EACH ROW
WHEN (OLD.status = 'open' AND NEW.status = 'locked')
EXECUTE FUNCTION public.accounting_periods_enqueue_quarter_pack_trg();

