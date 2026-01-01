-- ============================================
-- RECEIPT UPLOAD SETUP
-- ============================================
-- Setup per adjuntar fitxers (receipts) a expenses
-- Script IDEMPOTENT: Es pot executar múltiples vegades sense errors

-- ============================================
-- 1. AFEGIR CAMPS A EXPENSES
-- ============================================

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
-- 2. CREAR BUCKET "receipts" A SUPABASE STORAGE
-- ============================================
-- NOTA: Això s'ha de fer manualment al Dashboard de Supabase:
-- 1. Anar a Storage > Create bucket
-- 2. Nom: "receipts"
-- 3. Public: false (privado)
-- 4. File size limit: 10MB (o el que prefereixis)
-- 5. Allowed MIME types: application/pdf, image/jpeg, image/png

-- ============================================
-- 3. POLICIES DE STORAGE (RLS)
-- ============================================
-- NOTA: Les policies de Storage s'han de crear manualment al Dashboard de Supabase
-- després de crear el bucket "receipts"
--
-- Pasos:
-- 1. Anar a Storage > receipts bucket > Policies
-- 2. Crear 3 policies amb aquestes configuracions:
--
-- Policy 1: "Users can upload own receipts"
--   Operation: INSERT
--   Target roles: authenticated
--   Policy definition: (bucket_id = 'receipts'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])
--   Policy check: (bucket_id = 'receipts'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])
--
-- Policy 2: "Users can view own receipts"
--   Operation: SELECT
--   Target roles: authenticated
--   Policy definition: (bucket_id = 'receipts'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])
--   Policy check: (bucket_id = 'receipts'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])
--
-- Policy 3: "Users can delete own receipts"
--   Operation: DELETE
--   Target roles: authenticated
--   Policy definition: (bucket_id = 'receipts'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])
--   Policy check: (bucket_id = 'receipts'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])
--
-- ALTERNATIVA: Si vols crear-les via SQL, usa aquestes comandes (després de crear el bucket):
-- 
-- CREATE POLICY "Users can upload own receipts" ON storage.objects
--   FOR INSERT TO authenticated
--   WITH CHECK (bucket_id = 'receipts' AND (auth.uid())::text = (storage.foldername(name))[1]);
--
-- CREATE POLICY "Users can view own receipts" ON storage.objects
--   FOR SELECT TO authenticated
--   USING (bucket_id = 'receipts' AND (auth.uid())::text = (storage.foldername(name))[1]);
--
-- CREATE POLICY "Users can delete own receipts" ON storage.objects
--   FOR DELETE TO authenticated
--   USING (bucket_id = 'receipts' AND (auth.uid())::text = (storage.foldername(name))[1]);

