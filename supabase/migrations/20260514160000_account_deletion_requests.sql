-- ============================================================
-- 2026-05-14 · GDPR Article 17 — Right to erasure scaffolding
-- ============================================================
-- A user (data subject) can request deletion of their account at any time.
-- Per GDPR we must:
--   • acknowledge the request,
--   • act "without undue delay" (interpreted as ≤ 30 days),
--   • keep audit evidence of the deletion (who, when, what scope).
--
-- This migration adds a single tracking table and matching RLS so:
--   • a user can INSERT their own deletion request,
--   • a user can SEE the status of their own request,
--   • the platform super-admin can SEE every request and UPDATE the
--     status as the manual cleanup is executed.
--
-- The actual data wipe is deliberately NOT done here — it requires
-- coordination across tenants (orgs the user owns vs. orgs where they
-- are just a member) and is run as a maintenance job. The table is the
-- contract; the job is a follow-up.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.account_deletion_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email text NOT NULL,
  active_org_id uuid REFERENCES public.orgs(id) ON DELETE SET NULL,
  reason text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  requested_at timestamptz NOT NULL DEFAULT now(),
  acknowledged_at timestamptz,
  completed_at timestamptz,
  processor_notes text
);

CREATE INDEX IF NOT EXISTS idx_account_deletion_requests_user_id ON public.account_deletion_requests (user_id);
CREATE INDEX IF NOT EXISTS idx_account_deletion_requests_status ON public.account_deletion_requests (status);
CREATE INDEX IF NOT EXISTS idx_account_deletion_requests_requested_at ON public.account_deletion_requests (requested_at DESC);

ALTER TABLE public.account_deletion_requests ENABLE ROW LEVEL SECURITY;

-- A user can request their OWN deletion.
DROP POLICY IF EXISTS "adr_insert_own" ON public.account_deletion_requests;
CREATE POLICY "adr_insert_own"
ON public.account_deletion_requests
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- A user can read their OWN requests; super-admin can read all.
DROP POLICY IF EXISTS "adr_select_own_or_admin" ON public.account_deletion_requests;
CREATE POLICY "adr_select_own_or_admin"
ON public.account_deletion_requests
FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.is_super_admin());

-- Only super-admin can update (track progress, write notes).
DROP POLICY IF EXISTS "adr_update_admin" ON public.account_deletion_requests;
CREATE POLICY "adr_update_admin"
ON public.account_deletion_requests
FOR UPDATE
TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

-- Only super-admin can delete the request row itself (after completion or
-- if cancelled). The user's account data is wiped by the job, not by
-- deleting this audit row.
DROP POLICY IF EXISTS "adr_delete_admin" ON public.account_deletion_requests;
CREATE POLICY "adr_delete_admin"
ON public.account_deletion_requests
FOR DELETE
TO authenticated
USING (public.is_super_admin());

COMMENT ON TABLE public.account_deletion_requests IS
  'GDPR Art. 17 audit trail. A row is created when a user requests account deletion; the super-admin works through pending rows manually and marks them completed.';
