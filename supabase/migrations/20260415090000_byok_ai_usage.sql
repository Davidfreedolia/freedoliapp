-- ============================================
-- BYOK IA — per-org monthly quota counter
-- Bloc 6: 5 free AI analyses / month on starter, 50 on growth, unlimited on scale.
-- When the user brings their own provider key (stored in tool_connections with
-- tool_name='ai_provider'), we don't increment this counter.
-- ============================================

CREATE TABLE IF NOT EXISTS public.ai_usage (
  org_id uuid PRIMARY KEY REFERENCES public.orgs(id) ON DELETE CASCADE,
  monthly_count integer NOT NULL DEFAULT 0,
  month_year text NOT NULL DEFAULT to_char(now(), 'YYYY-MM'),
  last_reset_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;

-- Members of the org can READ their own counter (used by the UI to show "3 of 5
-- used"). Writes only happen from edge functions via service role, so we do not
-- grant INSERT/UPDATE/DELETE to authenticated users.
DROP POLICY IF EXISTS "ai_usage_select_org_members" ON public.ai_usage;
CREATE POLICY "ai_usage_select_org_members"
  ON public.ai_usage
  FOR SELECT
  TO authenticated
  USING (org_id IN (SELECT org_id FROM public.org_memberships WHERE user_id = auth.uid()));

-- updated_at trigger
CREATE OR REPLACE FUNCTION public._ai_usage_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ai_usage_updated_at ON public.ai_usage;
CREATE TRIGGER trg_ai_usage_updated_at
  BEFORE UPDATE ON public.ai_usage
  FOR EACH ROW
  EXECUTE FUNCTION public._ai_usage_touch_updated_at();

-- RPC: atomically increment (or reset when the month rolls over).
-- Returns the row after the update.
CREATE OR REPLACE FUNCTION public.ai_usage_increment(p_org_id uuid)
RETURNS TABLE (monthly_count integer, month_year text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_month text := to_char(now(), 'YYYY-MM');
BEGIN
  INSERT INTO public.ai_usage(org_id, monthly_count, month_year, last_reset_at)
  VALUES (p_org_id, 1, v_current_month, now())
  ON CONFLICT (org_id) DO UPDATE
    SET monthly_count = CASE
          WHEN public.ai_usage.month_year = v_current_month
            THEN public.ai_usage.monthly_count + 1
          ELSE 1
        END,
        month_year = v_current_month,
        last_reset_at = CASE
          WHEN public.ai_usage.month_year = v_current_month
            THEN public.ai_usage.last_reset_at
          ELSE now()
        END;

  RETURN QUERY
    SELECT au.monthly_count, au.month_year
    FROM public.ai_usage au
    WHERE au.org_id = p_org_id;
END;
$$;

-- Let the UI read usage via a direct select (covered by the RLS policy).
-- Service role inserts/increments via the RPC above.
REVOKE ALL ON FUNCTION public.ai_usage_increment(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.ai_usage_increment(uuid) TO service_role;
