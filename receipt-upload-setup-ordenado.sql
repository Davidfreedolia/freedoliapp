-- ============================================
-- RECEIPT UPLOAD SETUP - EJECUTAR EN ORDEN
-- ============================================
-- Executar aquests scripts en ordre al SQL Editor de Supabase

-- ============================================
-- PAS 1: AFEGIR CAMPS A EXPENSES
-- ============================================
-- Executar aquest bloc primer

-- Receipt URL (Supabase Storage)
ALTER TABLE expenses 
ADD COLUMN IF NOT EXISTS receipt_url text;

-- Receipt filename (per mostrar nom original)
ALTER TABLE expenses 
ADD COLUMN IF NOT EXISTS receipt_filename text;

-- Receipt size (bytes)
ALTER TABLE expenses 
ADD COLUMN IF NOT EXISTS receipt_size bigint;

-- Drive file ID (opcional, si es puja a Google Drive)
ALTER TABLE expenses 
ADD COLUMN IF NOT EXISTS receipt_drive_file_id text;

-- Índex per millorar consultes
CREATE INDEX IF NOT EXISTS idx_expenses_receipt_url ON expenses(receipt_url) WHERE receipt_url IS NOT NULL;

-- ============================================
-- PAS 2: CREAR BUCKET "receipts" (MANUAL)
-- ============================================
-- Això s'ha de fer al Dashboard de Supabase:
-- 1. Anar a Storage > Create bucket
-- 2. Nom: "receipts"
-- 3. Public: false (privado)
-- 4. File size limit: 10MB
-- 5. Allowed MIME types: application/pdf, image/jpeg, image/png
-- 6. Clicar "Create bucket"
--
-- IMPORTANT: No continuar amb el PAS 3 fins que el bucket estigui creat!

-- ============================================
-- PAS 3: CREAR POLICIES DE STORAGE
-- ============================================
-- Executar aquest bloc DESPRÉS de crear el bucket "receipts"
-- Si alguna policy ja existeix, es saltarà automàticament

-- Policy: Users can upload their own receipts
DROP POLICY IF EXISTS "Users can upload own receipts" ON storage.objects;
CREATE POLICY "Users can upload own receipts" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'receipts' AND (auth.uid())::text = (storage.foldername(name))[1]);

-- Policy: Users can view their own receipts
DROP POLICY IF EXISTS "Users can view own receipts" ON storage.objects;
CREATE POLICY "Users can view own receipts" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'receipts' AND (auth.uid())::text = (storage.foldername(name))[1]);

-- Policy: Users can delete their own receipts
DROP POLICY IF EXISTS "Users can delete own receipts" ON storage.objects;
CREATE POLICY "Users can delete own receipts" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'receipts' AND (auth.uid())::text = (storage.foldername(name))[1]);

-- ============================================
-- VERIFICACIÓ
-- ============================================
-- Després d'executar tots els passos, verifica:
-- 1. Les columnes a expenses: SELECT receipt_url, receipt_filename, receipt_size, receipt_drive_file_id FROM expenses LIMIT 1;
-- 2. El bucket existeix: SELECT * FROM storage.buckets WHERE name = 'receipts';
-- 3. Les policies existeixen: SELECT * FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage';





