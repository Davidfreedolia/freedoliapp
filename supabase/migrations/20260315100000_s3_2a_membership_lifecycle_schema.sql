-- ============================================
-- S3.2.A — Membership lifecycle schema preparation
-- ============================================
-- Adds status enum and lifecycle columns to org_memberships.
-- Backfills existing rows to status = 'active'. Does NOT change seat counting,
-- org_add_member, RLS helpers, or UI.
-- ============================================

-- 1) Canonical membership status enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'membership_status') THEN
    CREATE TYPE public.membership_status AS ENUM (
      'invited',
      'active',
      'suspended',
      'removed'
    );
  END IF;
END
$$;

-- 2) Add new columns (nullable first for backfill)
ALTER TABLE public.org_memberships
  ADD COLUMN IF NOT EXISTS status public.membership_status,
  ADD COLUMN IF NOT EXISTS invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS invited_at timestamptz,
  ADD COLUMN IF NOT EXISTS accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS suspended_at timestamptz;

-- 3) Backfill existing rows: all current memberships become active
UPDATE public.org_memberships
SET
  status = 'active',
  accepted_at = COALESCE(accepted_at, created_at)
WHERE status IS NULL;

-- 4) Set default and NOT NULL for status (matches current app creation flows)
ALTER TABLE public.org_memberships
  ALTER COLUMN status SET DEFAULT 'active',
  ALTER COLUMN status SET NOT NULL;

-- 5) Constraint: only active/suspended can have accepted_at semantics; invited/removed leave accepted_at null.
-- No CHECK added here to avoid breaking future invitation flow. Purely additive.

COMMENT ON COLUMN public.org_memberships.status IS 'S3.2: invited | active | suspended | removed. Seat count uses active only.';
COMMENT ON COLUMN public.org_memberships.invited_by IS 'S3.2: user who sent the invitation; null if direct add.';
COMMENT ON COLUMN public.org_memberships.invited_at IS 'S3.2: when invitation was created.';
COMMENT ON COLUMN public.org_memberships.accepted_at IS 'S3.2: when membership became active (acceptance or direct add).';
COMMENT ON COLUMN public.org_memberships.suspended_at IS 'S3.2: when member was suspended.';
