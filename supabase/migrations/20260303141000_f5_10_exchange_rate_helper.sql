-- F5.10 — Helper RPC: get_exchange_rate_to_base

CREATE OR REPLACE FUNCTION public.get_exchange_rate_to_base(
  p_date date,
  p_currency text,
  p_base text DEFAULT 'EUR'
)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rate numeric;
BEGIN
  IF p_currency IS NULL OR p_base IS NULL OR p_date IS NULL THEN
    RAISE EXCEPTION 'missing_exchange_rate';
  END IF;

  -- Try exact date first
  SELECT rate_to_base
  INTO v_rate
  FROM public.exchange_rates_daily
  WHERE rate_date = p_date
    AND currency = upper(p_currency)
    AND base_currency = upper(p_base)
  LIMIT 1;

  IF v_rate IS NULL THEN
    -- Fallback: latest rate before or equal to date
    SELECT rate_to_base
    INTO v_rate
    FROM public.exchange_rates_daily
    WHERE rate_date <= p_date
      AND currency = upper(p_currency)
      AND base_currency = upper(p_base)
    ORDER BY rate_date DESC
    LIMIT 1;
  END IF;

  IF v_rate IS NULL THEN
    RAISE EXCEPTION 'missing_exchange_rate';
  END IF;

  RETURN v_rate;
END;
$$;

REVOKE ALL ON FUNCTION public.get_exchange_rate_to_base(date, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_exchange_rate_to_base(date, text, text) TO authenticated;

