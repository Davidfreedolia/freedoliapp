-- Restore inventory_movements schema (auditability restoration)

CREATE TABLE IF NOT EXISTS public.inventory_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  org_id uuid NOT NULL,
  warehouse_id uuid NOT NULL,

  direction text NULL, -- IN / OUT (optional, minimal)
  quantity numeric NULL,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- FK to warehouses
DO $$
BEGIN
  ALTER TABLE public.inventory_movements
    ADD CONSTRAINT fk_inventory_movements_warehouse
    FOREIGN KEY (warehouse_id)
    REFERENCES public.warehouses(id)
    ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Index
CREATE INDEX IF NOT EXISTS idx_inventory_movements_org_id
  ON public.inventory_movements(org_id);

-- Enable RLS
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;

-- Policies
DO $$
BEGIN
  CREATE POLICY "Org members can select inventory_movements"
    ON public.inventory_movements
    FOR SELECT
    USING (public.is_org_member(org_id));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "Org members can insert inventory_movements"
    ON public.inventory_movements
    FOR INSERT
    WITH CHECK (public.is_org_member(org_id));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "Org members can update inventory_movements"
    ON public.inventory_movements
    FOR UPDATE
    USING (public.is_org_member(org_id))
    WITH CHECK (public.is_org_member(org_id));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "Org members can delete inventory_movements"
    ON public.inventory_movements
    FOR DELETE
    USING (public.is_org_member(org_id));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
