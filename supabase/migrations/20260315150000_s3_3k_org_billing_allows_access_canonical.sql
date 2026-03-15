-- ============================================
-- S3.3.K — org_billing_allows_access canonical fallback
-- ============================================
-- Prefer org_billing.status (same source as get_org_billing_state/triggers);
-- fallback to orgs.billing_status when no org_billing row (e.g. new org).
-- ============================================

CREATE OR REPLACE FUNCTION public.org_billing_allows_access(p_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.orgs o
    LEFT JOIN public.org_billing ob ON ob.org_id = o.id
    WHERE o.id = p_org_id
      AND COALESCE(ob.status, o.billing_status::text) IN ('trialing', 'active')
  );
$$;

COMMENT ON FUNCTION public.org_billing_allows_access(uuid) IS 'S3.3.K: True if org exists and billing allows access. Prefers org_billing.status; fallback orgs.billing_status when no org_billing row.';
