-- F5 — Finance: Org Base Currency + Daily Exchange Rates
-- F5.1 + F5.2 (DB only, SaaS-ready)

-----------------------------
-- 1) org_settings
-----------------------------

CREATE TABLE IF NOT EXISTS public.org_settings (
  org_id uuid PRIMARY KEY REFERENCES public.orgs(id) ON DELETE CASCADE,
  base_currency text NOT NULL DEFAULT 'EUR',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT org_settings_base_currency_iso CHECK (
    base_currency IS NOT NULL
    AND char_length(base_currency) = 3
    AND base_currency = upper(base_currency)
  )
);

-- RLS Model C for org_settings (org-scoped)
ALTER TABLE public.org_settings ENABLE ROW LEVEL SECURITY;

-- SELECT: any org member
CREATE POLICY "Org members can select org_settings"
  ON public.org_settings
  FOR SELECT
  USING (public.is_org_member(org_id));

-- INSERT: owner or admin only
CREATE POLICY "Org owners/admins can insert org_settings"
  ON public.org_settings
  FOR INSERT
  WITH CHECK (public.is_org_owner_or_admin(org_id));

-- UPDATE: owner or admin only
CREATE POLICY "Org owners/admins can update org_settings"
  ON public.org_settings
  FOR UPDATE
  USING (public.is_org_owner_or_admin(org_id))
  WITH CHECK (public.is_org_owner_or_admin(org_id));

-- REVOKE default grants (keep access via RLS policies)
REVOKE ALL ON TABLE public.org_settings FROM PUBLIC;
REVOKE ALL ON TABLE public.org_settings FROM anon;
REVOKE ALL ON TABLE public.org_settings FROM authenticated;

-----------------------------
-- 2) exchange_rates_daily
-----------------------------

CREATE TABLE IF NOT EXISTS public.exchange_rates_daily (
  id bigserial PRIMARY KEY,
  base_currency text NOT NULL DEFAULT 'EUR',
  currency text NOT NULL,
  rate_date date NOT NULL,
  rate_to_base numeric(18,8) NOT NULL CHECK (rate_to_base > 0),
  source text NOT NULL DEFAULT 'ecb' CHECK (source IN ('ecb', 'manual_override')),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT exchange_rates_daily_base_currency_iso CHECK (
    base_currency IS NOT NULL
    AND char_length(base_currency) = 3
    AND base_currency = upper(base_currency)
  ),
  CONSTRAINT exchange_rates_daily_currency_iso CHECK (
    currency IS NOT NULL
    AND char_length(currency) = 3
    AND currency = upper(currency)
  ),
  CONSTRAINT exchange_rates_daily_unique_per_day UNIQUE (rate_date, base_currency, currency)
);

-- Indexes for common lookup patterns
CREATE INDEX IF NOT EXISTS idx_exchange_rates_daily_rate_date
  ON public.exchange_rates_daily(rate_date);

CREATE INDEX IF NOT EXISTS idx_exchange_rates_daily_currency
  ON public.exchange_rates_daily(currency);

-- RLS: public read (authenticated), write restricted
ALTER TABLE public.exchange_rates_daily ENABLE ROW LEVEL SECURITY;

-- SELECT: any authenticated user (rates are effectively public within the app)
CREATE POLICY "Authenticated users can select exchange_rates_daily"
  ON public.exchange_rates_daily
  FOR SELECT
  TO authenticated
  USING (true);

-- INSERT: reserved for privileged contexts (service role / admin RPCs).
-- Service role bypasses RLS; we keep a restrictive policy for safety.
CREATE POLICY "No direct client insert exchange_rates_daily"
  ON public.exchange_rates_daily
  FOR INSERT
  TO authenticated
  WITH CHECK (false);

-- UPDATE: same as INSERT (only via privileged channels)
CREATE POLICY "No direct client update exchange_rates_daily"
  ON public.exchange_rates_daily
  FOR UPDATE
  TO authenticated
  USING (false)
  WITH CHECK (false);

-- No DELETE policy for clients; service role can still manage data as needed.

REVOKE ALL ON TABLE public.exchange_rates_daily FROM PUBLIC;
REVOKE ALL ON TABLE public.exchange_rates_daily FROM anon;
REVOKE ALL ON TABLE public.exchange_rates_daily FROM authenticated;

-----------------------------
-- 3) updated_at trigger for org_settings
-----------------------------

CREATE OR REPLACE FUNCTION public.set_org_settings_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS org_settings_set_updated_at ON public.org_settings;

CREATE TRIGGER org_settings_set_updated_at
BEFORE UPDATE ON public.org_settings
FOR EACH ROW
EXECUTE FUNCTION public.set_org_settings_updated_at();

