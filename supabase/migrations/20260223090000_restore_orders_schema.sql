-- Restore orders schema (auditability restoration)
-- This migration restores missing CREATE TABLE for orders
-- without altering existing data.

CREATE TABLE IF NOT EXISTS public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  org_id uuid NOT NULL,
  project_id uuid NULL,
  user_id uuid NULL,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- FK to orgs (safe if already exists)
DO $$
BEGIN
  ALTER TABLE public.orders
    ADD CONSTRAINT fk_orders_org
    FOREIGN KEY (org_id)
    REFERENCES public.orgs(id)
    ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Optional FK to projects (safe if already exists)
DO $$
BEGIN
  ALTER TABLE public.orders
    ADD CONSTRAINT fk_orders_project
    FOREIGN KEY (project_id)
    REFERENCES public.projects(id)
    ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Index
CREATE INDEX IF NOT EXISTS idx_orders_org_id
  ON public.orders(org_id);

-- Enable RLS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Policies (safe if already exist)
DO $$
BEGIN
  CREATE POLICY "Org members can select orders"
    ON public.orders
    FOR SELECT
    USING (public.is_org_member(org_id));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "Org members can insert orders"
    ON public.orders
    FOR INSERT
    WITH CHECK (public.is_org_member(org_id));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "Org members can update orders"
    ON public.orders
    FOR UPDATE
    USING (public.is_org_member(org_id))
    WITH CHECK (public.is_org_member(org_id));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "Org members can delete orders"
    ON public.orders
    FOR DELETE
    USING (public.is_org_member(org_id));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
