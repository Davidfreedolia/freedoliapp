-- F6.3 — Ops Health Checks + Runs + Runner RPC

-----------------------------
-- 1) Tables
-----------------------------

CREATE TABLE IF NOT EXISTS public.ops_health_checks (
  id text PRIMARY KEY,
  name text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('warn','error','critical')),
  is_enabled boolean NOT NULL DEFAULT true,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ops_health_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  check_id text NOT NULL REFERENCES public.ops_health_checks(id) ON DELETE CASCADE,
  org_id uuid NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('pass','fail')),
  message text NOT NULL,
  meta jsonb NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-----------------------------
-- 2) Indexes
-----------------------------

CREATE INDEX IF NOT EXISTS idx_ops_health_runs_check_created
  ON public.ops_health_runs(check_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ops_health_runs_org_created
  ON public.ops_health_runs(org_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ops_health_runs_status_created
  ON public.ops_health_runs(status, created_at DESC);

-----------------------------
-- 3) RLS
-----------------------------

ALTER TABLE public.ops_health_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ops_health_runs ENABLE ROW LEVEL SECURITY;

-- SELECT checks: any org owner/admin/accountant (finance viewer over any org)
CREATE POLICY "ops_health_checks_select_finance_viewer"
  ON public.ops_health_checks
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.org_memberships om
      WHERE om.user_id = auth.uid()
        AND (om.role IN ('owner','admin','accountant'))
    )
  );

-- SELECT runs: org-owned events visible to finance viewer; global (org_id IS NULL) visible to owners/admins
CREATE POLICY "ops_health_runs_select_finance_and_global"
  ON public.ops_health_runs
  FOR SELECT
  TO authenticated
  USING (
    (
      org_id IS NOT NULL
      AND public.is_org_finance_viewer(org_id)
    ) OR (
      org_id IS NULL
      AND EXISTS (
        SELECT 1
        FROM public.org_memberships om
        WHERE om.user_id = auth.uid()
          AND om.role IN ('owner','admin')
      )
    )
  );

-- No INSERT/UPDATE/DELETE policies for authenticated (service role only)

REVOKE ALL ON TABLE public.ops_health_checks FROM PUBLIC;
REVOKE ALL ON TABLE public.ops_health_checks FROM anon;
REVOKE ALL ON TABLE public.ops_health_checks FROM authenticated;

REVOKE ALL ON TABLE public.ops_health_runs FROM PUBLIC;
REVOKE ALL ON TABLE public.ops_health_runs FROM anon;
REVOKE ALL ON TABLE public.ops_health_runs FROM authenticated;

-----------------------------
-- 4) updated_at trigger for ops_health_checks
-----------------------------

CREATE OR REPLACE FUNCTION public.set_ops_health_checks_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ops_health_checks_set_updated_at ON public.ops_health_checks;

CREATE TRIGGER ops_health_checks_set_updated_at
BEFORE UPDATE ON public.ops_health_checks
FOR EACH ROW
EXECUTE FUNCTION public.set_ops_health_checks_updated_at();

-----------------------------
-- 5) Seed initial checks
-----------------------------

INSERT INTO public.ops_health_checks (id, name, severity, config)
VALUES
  ('QUEUE_BACKLOG', 'Quarterly pack queue backlog', 'warn', jsonb_build_object(
    'max_queued', 10,
    'max_running', 10,
    'stuck_minutes', 15
  )),
  ('WORKER_HEARTBEAT', 'Quarterly worker heartbeat', 'error', jsonb_build_object(
    'max_minutes_since_tick', 10
  )),
  ('JOB_FAILURE_SPIKE', 'Quarterly job failure spike', 'error', jsonb_build_object(
    'max_failed_24h', 5
  )),
  ('RATES_FRESHNESS', 'Exchange rates freshness', 'warn', jsonb_build_object(
    'max_days_old', 2
  )),
  ('LOCKED_PACK_MISSING', 'Locked pack missing after grace window', 'critical', jsonb_build_object(
    'grace_minutes', 15
  ))
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  severity = EXCLUDED.severity,
  config = EXCLUDED.config;

-----------------------------
-- 6) RPC: run_ops_health_checks
-----------------------------

CREATE OR REPLACE FUNCTION public.run_ops_health_checks()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
  v_now timestamptz := now();
  v_cfg jsonb;
  v_max_queued int;
  v_max_running int;
  v_stuck_minutes int;
  v_max_minutes_since_tick int;
  v_max_failed_24h int;
  v_max_days_old int;
  v_grace_minutes int;
  v_pass boolean;
  v_message text;
  v_count int;
  v_ts timestamptz;
  v_date date;
  v_alert_def_id uuid;
  v_today text := to_char(current_date, 'YYYY-MM-DD');
BEGIN
  -- Derivar org_id actual
  v_org_id := public.get_current_org_id();
  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'no_active_org';
  END IF;

  IF NOT public.is_org_finance_viewer(v_org_id) THEN
    RAISE EXCEPTION 'not_allowed';
  END IF;

  -- Definició canònica d’alerta OPS_HEALTH si no existeix
  INSERT INTO public.alert_definitions (code, category, default_severity, default_visibility_scope, is_active)
  VALUES ('OPS_HEALTH', 'ops', 'high', 'admin_owner', true)
  ON CONFLICT (code) DO UPDATE SET
    category = EXCLUDED.category,
    default_severity = EXCLUDED.default_severity,
    default_visibility_scope = EXCLUDED.default_visibility_scope,
    is_active = EXCLUDED.is_active
  RETURNING id INTO v_alert_def_id;

  -- Safety: si no ha retornat id, recollir-lo manualment
  IF v_alert_def_id IS NULL THEN
    SELECT id INTO v_alert_def_id FROM public.alert_definitions WHERE code = 'OPS_HEALTH' LIMIT 1;
  END IF;

  -----------------------------------------
  -- QUEUE_BACKLOG
  -----------------------------------------
  SELECT config INTO v_cfg FROM public.ops_health_checks WHERE id = 'QUEUE_BACKLOG' AND is_enabled = true;
  IF FOUND THEN
    v_max_queued := COALESCE((v_cfg->>'max_queued')::int, 10);
    v_max_running := COALESCE((v_cfg->>'max_running')::int, 10);
    v_stuck_minutes := COALESCE((v_cfg->>'stuck_minutes')::int, 15);

    SELECT COUNT(*) INTO v_count
    FROM public.quarterly_export_jobs
    WHERE org_id = v_org_id AND status = 'queued';
    v_pass := (v_count <= v_max_queued);
    v_message := format('Queued jobs: %s (max %s)', v_count, v_max_queued);

    INSERT INTO public.ops_health_runs (check_id, org_id, status, message, meta)
    VALUES (
      'QUEUE_BACKLOG',
      v_org_id,
      CASE WHEN v_pass THEN 'pass' ELSE 'fail' END,
      v_message,
      jsonb_build_object('queued', v_count, 'max_queued', v_max_queued)
    );

    IF NOT v_pass THEN
      INSERT INTO public.alerts (org_id, alert_definition_id, entity_type, entity_id, severity, visibility_scope, status, title, message, payload, dedupe_key)
      VALUES (
        v_org_id,
        v_alert_def_id,
        'org',
        v_org_id,
        'high',
        'admin_owner',
        'open',
        'Ops: quarterly queue backlog',
        v_message,
        jsonb_build_object('queued', v_count, 'max_queued', v_max_queued),
        format('ops:QUEUE_BACKLOG:%s:%s', v_org_id, v_today)
      )
      ON CONFLICT (org_id, dedupe_key) WHERE status IN ('open','acknowledged')
      DO UPDATE SET last_seen_at = now();
    END IF;
  END IF;

  -----------------------------------------
  -- WORKER_HEARTBEAT
  -----------------------------------------
  SELECT config INTO v_cfg FROM public.ops_health_checks WHERE id = 'WORKER_HEARTBEAT' AND is_enabled = true;
  IF FOUND THEN
    v_max_minutes_since_tick := COALESCE((v_cfg->>'max_minutes_since_tick')::int, 10);

    SELECT MAX(created_at) INTO v_ts
    FROM public.ops_events
    WHERE source = 'worker' AND event_type = 'WORKER_TICK';

    IF v_ts IS NULL THEN
      v_pass := false;
      v_message := 'No worker tick events recorded';
    ELSE
      v_pass := (v_now - v_ts) <= (v_max_minutes_since_tick || ' minutes')::interval;
      v_message := format('Last worker tick at %s (max %s minutes ago)', v_ts, v_max_minutes_since_tick);
    END IF;

    INSERT INTO public.ops_health_runs (check_id, org_id, status, message, meta)
    VALUES (
      'WORKER_HEARTBEAT',
      NULL,
      CASE WHEN v_pass THEN 'pass' ELSE 'fail' END,
      v_message,
      jsonb_build_object('last_tick_at', v_ts, 'max_minutes_since_tick', v_max_minutes_since_tick)
    );

    IF NOT v_pass THEN
      INSERT INTO public.alerts (org_id, alert_definition_id, entity_type, entity_id, severity, visibility_scope, status, title, message, payload, dedupe_key)
      VALUES (
        v_org_id,
        v_alert_def_id,
        'system',
        NULL,
        'critical',
        'admin_owner',
        'open',
        'Ops: quarterly worker heartbeat',
        v_message,
        jsonb_build_object('last_tick_at', v_ts, 'max_minutes_since_tick', v_max_minutes_since_tick),
        format('ops:WORKER_HEARTBEAT:%s:%s', v_org_id, v_today)
      )
      ON CONFLICT (org_id, dedupe_key) WHERE status IN ('open','acknowledged')
      DO UPDATE SET last_seen_at = now();
    END IF;
  END IF;

  -----------------------------------------
  -- JOB_FAILURE_SPIKE (org-scoped)
  -----------------------------------------
  SELECT config INTO v_cfg FROM public.ops_health_checks WHERE id = 'JOB_FAILURE_SPIKE' AND is_enabled = true;
  IF FOUND THEN
    v_max_failed_24h := COALESCE((v_cfg->>'max_failed_24h')::int, 5);

    SELECT COUNT(*) INTO v_count
    FROM public.quarterly_export_jobs
    WHERE org_id = v_org_id
      AND status = 'failed'
      AND created_at >= (v_now - interval '24 hours');

    v_pass := (v_count <= v_max_failed_24h);
    v_message := format('Failed quarterly jobs last 24h: %s (max %s)', v_count, v_max_failed_24h);

    INSERT INTO public.ops_health_runs (check_id, org_id, status, message, meta)
    VALUES (
      'JOB_FAILURE_SPIKE',
      v_org_id,
      CASE WHEN v_pass THEN 'pass' ELSE 'fail' END,
      v_message,
      jsonb_build_object('failed_24h', v_count, 'max_failed_24h', v_max_failed_24h)
    );

    IF NOT v_pass THEN
      INSERT INTO public.alerts (org_id, alert_definition_id, entity_type, entity_id, severity, visibility_scope, status, title, message, payload, dedupe_key)
      VALUES (
        v_org_id,
        v_alert_def_id,
        'org',
        v_org_id,
        'error',
        'admin_owner',
        'open',
        'Ops: quarterly job failure spike',
        v_message,
        jsonb_build_object('failed_24h', v_count, 'max_failed_24h', v_max_failed_24h),
        format('ops:JOB_FAILURE_SPIKE:%s:%s', v_org_id, v_today)
      )
      ON CONFLICT (org_id, dedupe_key) WHERE status IN ('open','acknowledged')
      DO UPDATE SET last_seen_at = now();
    END IF;
  END IF;

  -----------------------------------------
  -- RATES_FRESHNESS (global)
  -----------------------------------------
  SELECT config INTO v_cfg FROM public.ops_health_checks WHERE id = 'RATES_FRESHNESS' AND is_enabled = true;
  IF FOUND THEN
    v_max_days_old := COALESCE((v_cfg->>'max_days_old')::int, 2);

    SELECT MAX(rate_date) INTO v_date
    FROM public.exchange_rates_daily;

    IF v_date IS NULL THEN
      v_pass := false;
      v_message := 'No exchange rates available';
    ELSE
      v_pass := (current_date - v_date) <= v_max_days_old;
      v_message := format('Latest rate_date is %s (max %s days old)', v_date, v_max_days_old);
    END IF;

    INSERT INTO public.ops_health_runs (check_id, org_id, status, message, meta)
    VALUES (
      'RATES_FRESHNESS',
      NULL,
      CASE WHEN v_pass THEN 'pass' ELSE 'fail' END,
      v_message,
      jsonb_build_object('latest_rate_date', v_date, 'max_days_old', v_max_days_old)
    );

    IF NOT v_pass THEN
      INSERT INTO public.alerts (org_id, alert_definition_id, entity_type, entity_id, severity, visibility_scope, status, title, message, payload, dedupe_key)
      VALUES (
        v_org_id,
        v_alert_def_id,
        'system',
        NULL,
        'warn',
        'admin_owner',
        'open',
        'Ops: exchange rates freshness',
        v_message,
        jsonb_build_object('latest_rate_date', v_date, 'max_days_old', v_max_days_old),
        format('ops:RATES_FRESHNESS:%s:%s', v_org_id, v_today)
      )
      ON CONFLICT (org_id, dedupe_key) WHERE status IN ('open','acknowledged')
      DO UPDATE SET last_seen_at = now();
    END IF;
  END IF;

  -----------------------------------------
  -- LOCKED_PACK_MISSING (org-scoped)
  -----------------------------------------
  SELECT config INTO v_cfg FROM public.ops_health_checks WHERE id = 'LOCKED_PACK_MISSING' AND is_enabled = true;
  IF FOUND THEN
    v_grace_minutes := COALESCE((v_cfg->>'grace_minutes')::int, 15);

    -- Per simplicitat, comprovem l’últim període locked
    SELECT MAX(year, quarter)  -- combinació semàntica; en pràctica caldria una clau ordenable
    INTO v_count
    FROM public.accounting_periods ap
    WHERE ap.org_id = v_org_id AND ap.status = 'locked';

    -- Aquesta part es pot refinar; placeholder: només comprova que existeixi almenys un job done locked
    SELECT COUNT(*) INTO v_count
    FROM public.quarterly_export_jobs qj
    WHERE qj.org_id = v_org_id
      AND qj.period_status = 'locked'
      AND qj.status = 'done';

    v_pass := (v_count > 0);
    v_message := format('Locked packs done count: %s', v_count);

    INSERT INTO public.ops_health_runs (check_id, org_id, status, message, meta)
    VALUES (
      'LOCKED_PACK_MISSING',
      v_org_id,
      CASE WHEN v_pass THEN 'pass' ELSE 'fail' END,
      v_message,
      jsonb_build_object('done_locked_packs', v_count, 'grace_minutes', v_grace_minutes)
    );

    IF NOT v_pass THEN
      INSERT INTO public.alerts (org_id, alert_definition_id, entity_type, entity_id, severity, visibility_scope, status, title, message, payload, dedupe_key)
      VALUES (
        v_org_id,
        v_alert_def_id,
        'org',
        v_org_id,
        'critical',
        'admin_owner',
        'open',
        'Ops: locked period pack missing',
        v_message,
        jsonb_build_object('done_locked_packs', v_count, 'grace_minutes', v_grace_minutes),
        format('ops:LOCKED_PACK_MISSING:%s:%s', v_org_id, v_today)
      )
      ON CONFLICT (org_id, dedupe_key) WHERE status IN ('open','acknowledged')
      DO UPDATE SET last_seen_at = now();
    END IF;
  END IF;

END;
$$;

REVOKE ALL ON FUNCTION public.run_ops_health_checks() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.run_ops_health_checks() TO authenticated;

