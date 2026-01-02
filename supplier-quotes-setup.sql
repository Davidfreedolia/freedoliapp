-- Supplier Quotes System (Manual, no AI/OCR)
-- Table: supplier_quotes
CREATE TABLE IF NOT EXISTS supplier_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  supplier_id uuid NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  file_path text,
  file_name text,
  currency text NOT NULL DEFAULT 'USD' CHECK (currency IN ('USD', 'EUR', 'CNY', 'GBP')),
  incoterm text CHECK (incoterm IN ('EXW', 'FCA', 'FAS', 'FOB', 'CFR', 'CIF', 'CPT', 'CIP', 'DAP', 'DPU', 'DDP')),
  payment_terms text,
  lead_time_days integer,
  moq integer, -- Minimum Order Quantity
  notes text,
  shipping_estimate numeric, -- Override shipping cost for this quote
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Table: supplier_quote_price_breaks
CREATE TABLE IF NOT EXISTS supplier_quote_price_breaks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL REFERENCES supplier_quotes(id) ON DELETE CASCADE,
  min_qty integer NOT NULL,
  unit_price numeric(10, 4) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_supplier_quotes_user_project ON supplier_quotes(user_id, project_id);
CREATE INDEX IF NOT EXISTS idx_supplier_quotes_supplier ON supplier_quotes(supplier_id);
CREATE INDEX IF NOT EXISTS idx_price_breaks_quote ON supplier_quote_price_breaks(quote_id);

-- RLS Policies
ALTER TABLE supplier_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_quote_price_breaks ENABLE ROW LEVEL SECURITY;

-- Policies for supplier_quotes
CREATE POLICY "Users can view own quotes"
  ON supplier_quotes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own quotes"
  ON supplier_quotes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own quotes"
  ON supplier_quotes FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own quotes"
  ON supplier_quotes FOR DELETE
  USING (auth.uid() = user_id);

-- Policies for supplier_quote_price_breaks
CREATE POLICY "Users can view own price breaks"
  ON supplier_quote_price_breaks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM supplier_quotes
      WHERE supplier_quotes.id = supplier_quote_price_breaks.quote_id
      AND supplier_quotes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own price breaks"
  ON supplier_quote_price_breaks FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM supplier_quotes
      WHERE supplier_quotes.id = supplier_quote_price_breaks.quote_id
      AND supplier_quotes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own price breaks"
  ON supplier_quote_price_breaks FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM supplier_quotes
      WHERE supplier_quotes.id = supplier_quote_price_breaks.quote_id
      AND supplier_quotes.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM supplier_quotes
      WHERE supplier_quotes.id = supplier_quote_price_breaks.quote_id
      AND supplier_quotes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own price breaks"
  ON supplier_quote_price_breaks FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM supplier_quotes
      WHERE supplier_quotes.id = supplier_quote_price_breaks.quote_id
      AND supplier_quotes.user_id = auth.uid()
    )
  );

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_supplier_quotes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER supplier_quotes_updated_at
  BEFORE UPDATE ON supplier_quotes
  FOR EACH ROW
  EXECUTE FUNCTION update_supplier_quotes_updated_at();





