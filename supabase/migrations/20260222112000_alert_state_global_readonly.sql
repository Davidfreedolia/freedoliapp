-- 20260222112000_alert_state_global_readonly.sql

ALTER TABLE public.alert_state ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname='public'
      AND tablename='alert_state'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.alert_state', r.policyname);
  END LOOP;
END $$;

CREATE POLICY alert_state_select_authenticated
ON public.alert_state
FOR SELECT
TO authenticated
USING (true);