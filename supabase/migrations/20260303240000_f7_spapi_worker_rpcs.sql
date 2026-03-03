-- F7.7.2 — RPCs per al settlement worker (service_role only)

-- Retorna connexió amb refresh_token desxifrat per al worker
CREATE OR REPLACE FUNCTION public.get_spapi_connection_for_worker(p_connection_id uuid)
RETURNS TABLE (
  id uuid,
  org_id uuid,
  region text,
  seller_id text,
  lwa_client_id text,
  lwa_refresh_token_plain text,
  created_by uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_enc_key text;
BEGIN
  v_enc_key := current_setting('app.encryption_key', true);
  IF v_enc_key IS NULL OR v_enc_key = '' THEN
    RAISE EXCEPTION 'encryption_key_not_configured';
  END IF;

  RETURN QUERY
  SELECT
    c.id,
    c.org_id,
    c.region,
    c.seller_id,
    c.lwa_client_id,
    convert_from(pgp_sym_decrypt(c.lwa_refresh_token_enc, v_enc_key), 'UTF8') AS lwa_refresh_token_plain,
    c.created_by
  FROM public.spapi_connections c
  WHERE c.id = p_connection_id
    AND c.status = 'active'
  LIMIT 1;
END;
$$;

REVOKE ALL ON FUNCTION public.get_spapi_connection_for_worker(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_spapi_connection_for_worker(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.get_spapi_connection_for_worker(uuid) TO service_role;

-- Post job to ledger des del worker (sense context d’usuari)
CREATE OR REPLACE FUNCTION public.post_amazon_job_to_ledger_backend(p_org_id uuid, p_job_id uuid)
RETURNS TABLE (posted_count int)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job RECORD;
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
  WHERE j.id = p_job_id AND j.org_id = p_org_id
  LIMIT 1;

  IF v_job.id IS NULL THEN
    RAISE EXCEPTION 'job_not_found';
  END IF;

  SELECT base_currency INTO v_base_currency
  FROM public.org_settings
  WHERE org_id = p_org_id
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
      IF v_event.amount >= 0 THEN
        v_ledger_type := 'income'::public.financial_event_type;
      ELSE
        v_ledger_type := 'expense'::public.financial_event_type;
      END IF;

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
      RAISE;
  END;
END;
$$;

REVOKE ALL ON FUNCTION public.post_amazon_job_to_ledger_backend(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.post_amazon_job_to_ledger_backend(uuid, uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.post_amazon_job_to_ledger_backend(uuid, uuid) TO service_role;
