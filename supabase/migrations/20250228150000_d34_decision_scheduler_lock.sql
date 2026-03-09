-- D34 — Advisory lock for decision-scheduler (anti-overlap)

CREATE OR REPLACE FUNCTION public.decision_scheduler_try_lock()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pg_try_advisory_lock(987654321);
$$;

CREATE OR REPLACE FUNCTION public.decision_scheduler_unlock()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pg_advisory_unlock(987654321);
$$;

REVOKE ALL ON FUNCTION public.decision_scheduler_try_lock() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.decision_scheduler_unlock() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.decision_scheduler_try_lock() TO service_role;
GRANT EXECUTE ON FUNCTION public.decision_scheduler_unlock() TO service_role;
