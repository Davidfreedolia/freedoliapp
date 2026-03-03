-- F7.2 — Amazon CSV Ingest RPCs (start, finalize parse, post to ledger)
-- Logging to ops_events is done from the Edge function (service role).

-----------------------------
-- A) RPC: start_amazon_import
-----------------------------

CREATE OR REPLACE FUNCTION public.start_amazon_import(p_job_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
  v_exists boolean;
BEGIN
  SELECT org_id INTO v_org_id
  FROM public.amazon_import_jobs
  WHERE id = p_job_id
  LIMIT 1;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'job_not_found';
  END IF;

  IF NOT public.is_org_finance_viewer(v_org_id) THEN
    RAISE EXCEPTION 'not_allowed';
  END IF;

  UPDATE public.amazon_import_jobs
  SET status = 'parsing',
      updated_at = now()
  WHERE id = p_job_id;

  -- Caller (Edge) logs IMPORT_STARTED to ops_events with entity job_id
END;
$$;

REVOKE ALL ON FUNCTION public.start_amazon_import(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.start_amazon_import(uuid) TO authenticated;


-----------------------------
-- B) RPC: finalize_amazon_parse (service only)
-----------------------------

CREATE OR REPLACE FUNCTION public.finalize_amazon_parse(
  p_job_id uuid,
  p_total_rows int,
  p_parsed_rows int
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
BEGIN
  SELECT org_id INTO v_org_id
  FROM public.amazon_import_jobs
  WHERE id = p_job_id
  LIMIT 1;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'job_not_found';
  END IF;

  UPDATE public.amazon_import_jobs
  SET status = 'parsed',
      total_rows = p_total_rows,
      parsed_rows = p_parsed_rows,
      updated_at = now()
  WHERE id = p_job_id;

  -- Caller (Edge) logs IMPORT_PARSED to ops_events
END;
$$;

REVOKE ALL ON FUNCTION public.finalize_amazon_parse(uuid, int, int) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.finalize_amazon_parse(uuid, int, int) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_amazon_parse(uuid, int, int) TO service_role;


-----------------------------
-- C) RPC: post_amazon_job_to_ledger
-----------------------------

CREATE OR REPLACE FUNCTION public.post_amazon_job_to_ledger(p_job_id uuid)
RETURNS TABLE (posted_count int)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job RECORD;
  v_org_id uuid;
  v_base_currency text;
  v_event RECORD;
  v_ledger_type public.financial_event_type;
  v_rate_pnl numeric;
  v_rate_cash numeric;
  v_amount_base numeric;
  v_posted int := 0;
  v_count int;
  v_err_msg text;
BEGIN
  SELECT j.id, j.org_id, j.created_by
  INTO v_job
  FROM public.amazon_import_jobs j
  WHERE j.id = p_job_id
  LIMIT 1;

  IF v_job.id IS NULL THEN
    RAISE EXCEPTION 'job_not_found';
  END IF;

  v_org_id := v_job.org_id;

  IF NOT public.is_org_finance_viewer(v_org_id) THEN
    RAISE EXCEPTION 'not_allowed';
  END IF;

  SELECT base_currency INTO v_base_currency
  FROM public.org_settings
  WHERE org_id = v_org_id
  LIMIT 1;

  IF v_base_currency IS NULL THEN
    v_base_currency := 'EUR';
  END IF;

  UPDATE public.amazon_import_jobs
  SET status = 'posting',
      updated_at = now()
  WHERE id = p_job_id;

  BEGIN
    FOR v_event IN
      SELECT id, org_id, settlement_id, transaction_id, event_type, event_date,
             amount, currency, reference, meta
      FROM public.amazon_financial_events
      WHERE job_id = p_job_id
      ORDER BY event_date, id
    LOOP
      -- Map event_type -> financial_event_type (income/expense/adjustment)
      IF v_event.amount >= 0 THEN
        v_ledger_type := 'income'::public.financial_event_type;
      ELSE
        v_ledger_type := 'expense'::public.financial_event_type;
      END IF;

      -- Exchange rate: same date for P&L and cash for MVP
      IF upper(trim(v_event.currency)) = upper(trim(v_base_currency)) THEN
        v_rate_pnl := 1;
        v_rate_cash := 1;
      ELSE
        BEGIN
          SELECT public.get_exchange_rate_to_base(v_event.event_date, v_event.currency, v_base_currency)
          INTO v_rate_pnl;
          v_rate_cash := v_rate_pnl;
        EXCEPTION
          WHEN OTHERS THEN
            RAISE EXCEPTION 'missing_exchange_rate';
        END;
      END IF;

      v_amount_base := abs(v_event.amount) * v_rate_pnl;
      IF v_ledger_type = 'expense' THEN
        v_amount_base := -v_amount_base;
      END IF;

      INSERT INTO public.financial_ledger (
        org_id, scope, project_id, type, status,
        occurred_at, cash_at,
        amount_original, currency_original,
        rate_pnl, amount_base_pnl,
        rate_cash, amount_base_cash,
        reference_type, reference_id,
        created_by, posted_by, note
      ) VALUES (
        v_event.org_id,
        'company'::public.financial_scope,
        NULL,
        v_ledger_type,
        'posted'::public.financial_status,
        v_event.event_date,
        v_event.event_date,
        v_event.amount,
        v_event.currency,
        v_rate_pnl,
        v_amount_base,
        v_rate_cash,
        v_amount_base,
        'AMAZON_EVENT',
        v_event.id,
        v_job.created_by,
        v_job.created_by,
        v_event.reference
      )
      ON CONFLICT (org_id, reference_type, reference_id, type) DO NOTHING;

      GET DIAGNOSTICS v_count = ROW_COUNT;
      v_posted := v_posted + v_count;
    END LOOP;

    UPDATE public.amazon_import_jobs
    SET status = 'done',
        error = NULL,
        updated_at = now()
    WHERE id = p_job_id;

    posted_count := v_posted;
    RETURN NEXT;
    RETURN;

  EXCEPTION
    WHEN OTHERS THEN
      v_err_msg := SQLERRM;
      UPDATE public.amazon_import_jobs
      SET status = 'failed',
          error = left(v_err_msg, 500),
          updated_at = now()
      WHERE id = p_job_id;
      -- Caller (Edge) logs IMPORT_FAILED with meta { error }
      RAISE;
  END;
END;
$$;

REVOKE ALL ON FUNCTION public.post_amazon_job_to_ledger(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.post_amazon_job_to_ledger(uuid) TO authenticated;
