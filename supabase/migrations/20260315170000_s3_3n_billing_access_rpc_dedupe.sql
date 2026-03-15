-- ============================================
-- S3.3.N — Billing access logic deduplication
-- ============================================
-- get_org_ids_billing_allows_access reuses org_billing_allows_access(id)
-- instead of duplicating LEFT JOIN + COALESCE logic.
-- ============================================

CREATE OR REPLACE FUNCTION public.get_org_ids_billing_allows_access()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT o.id
  FROM public.orgs o
  WHERE public.org_billing_allows_access(o.id) = true;
$$;

COMMENT ON FUNCTION public.get_org_ids_billing_allows_access() IS 'S3.3.N: Org ids where billing allows access. Reuses org_billing_allows_access(id).';
