-- F7 — Global advisory lock for spapi-settlement-worker (prevent concurrent runs)

CREATE OR REPLACE FUNCTION public.spapi_worker_try_lock()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pg_try_advisory_lock(hashtext('spapi_settlement_worker'));
$$;

CREATE OR REPLACE FUNCTION public.spapi_worker_unlock()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pg_advisory_unlock(hashtext('spapi_settlement_worker'));
$$;

REVOKE ALL ON FUNCTION public.spapi_worker_try_lock() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.spapi_worker_unlock() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.spapi_worker_try_lock() TO service_role;
GRANT EXECUTE ON FUNCTION public.spapi_worker_unlock() TO service_role;
