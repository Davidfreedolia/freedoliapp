-- Restore supplier_quote_price_breaks schema (auditability restoration)

CREATE TABLE IF NOT EXISTS public.supplier_quote_price_breaks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  org_id uuid NOT NULL,
  quote_id uuid NOT NULL,

  min_quantity integer NOT NULL,
  unit_price numeric NOT NULL,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- FK to supplier_quotes
DO $$
BEGIN
  ALTER TABLE public.supplier_quote_price_breaks
    ADD CONSTRAINT fk_supplier_quote_price_breaks_quote
    FOREIGN KEY (quote_id)
    REFERENCES public.supplier_quotes(id)
    ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Index
CREATE INDEX IF NOT EXISTS idx_supplier_quote_price_breaks_org_id
  ON public.supplier_quote_price_breaks(org_id);

-- Enable RLS
ALTER TABLE public.supplier_quote_price_breaks ENABLE ROW LEVEL SECURITY;

-- Policies
DO $$
BEGIN
  CREATE POLICY "Org members can select supplier_quote_price_breaks"
    ON public.supplier_quote_price_breaks
    FOR SELECT
    USING (public.is_org_member(org_id));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "Org members can insert supplier_quote_price_breaks"
    ON public.supplier_quote_price_breaks
    FOR INSERT
    WITH CHECK (public.is_org_member(org_id));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "Org members can update supplier_quote_price_breaks"
    ON public.supplier_quote_price_breaks
    FOR UPDATE
    USING (public.is_org_member(org_id))
    WITH CHECK (public.is_org_member(org_id));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "Org members can delete supplier_quote_price_breaks"
    ON public.supplier_quote_price_breaks
    FOR DELETE
    USING (public.is_org_member(org_id));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
