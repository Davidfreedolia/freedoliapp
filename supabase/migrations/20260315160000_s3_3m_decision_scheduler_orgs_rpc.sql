-- ============================================
-- S3.3.M — Decision scheduler: org list by billing access
-- ============================================
-- RPC returns org ids for which org_billing_allows_access(id) is true
-- (same semantics as post-S3.3.K: prefer org_billing.status, fallback orgs.billing_status).
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
  LEFT JOIN public.org_billing ob ON ob.org_id = o.id
  WHERE COALESCE(ob.status, o.billing_status::text) IN ('trialing', 'active');
$$;

COMMENT ON FUNCTION public.get_org_ids_billing_allows_access() IS 'S3.3.M: Org ids where billing allows access. Same logic as org_billing_allows_access (prefer org_billing.status, fallback orgs.billing_status).';
