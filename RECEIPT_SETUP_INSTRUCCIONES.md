# Instrucciones de Setup - Receipt Upload

## Orden de ejecución

### PASO 1: Ejecutar SQL (Agregar columnas)
Ejecutar en el SQL Editor de Supabase el archivo `receipt-upload-setup-ordenado.sql` desde la línea 1 hasta la línea 20 (PAS 1).

O ejecutar directamente:
```sql
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS receipt_url text;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS receipt_filename text;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS receipt_size bigint;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS receipt_drive_file_id text;
CREATE INDEX IF NOT EXISTS idx_expenses_receipt_url ON expenses(receipt_url) WHERE receipt_url IS NOT NULL;
```

### PASO 2: Crear bucket (Manual - Dashboard)
1. Ir a **Storage** en el Dashboard de Supabase
2. Clicar **"Create bucket"**
3. Configurar:
   - **Nombre**: `receipts`
   - **Public**: ❌ **false** (privado)
   - **File size limit**: `10MB`
   - **Allowed MIME types**: `application/pdf, image/jpeg, image/png`
4. Clicar **"Create bucket"**

### PASO 3: Ejecutar SQL (Crear policies)
Ejecutar en el SQL Editor de Supabase el archivo `receipt-upload-setup-ordenado.sql` desde la línea 35 hasta la línea 52 (PAS 3).

O ejecutar directamente:
```sql
DROP POLICY IF EXISTS "Users can upload own receipts" ON storage.objects;
CREATE POLICY "Users can upload own receipts" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'receipts' AND (auth.uid())::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can view own receipts" ON storage.objects;
CREATE POLICY "Users can view own receipts" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'receipts' AND (auth.uid())::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can delete own receipts" ON storage.objects;
CREATE POLICY "Users can delete own receipts" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'receipts' AND (auth.uid())::text = (storage.foldername(name))[1]);
```

## Verificación

Después de ejecutar todos los pasos, verificar:

1. **Columnas en expenses**:
   ```sql
   SELECT receipt_url, receipt_filename, receipt_size, receipt_drive_file_id 
   FROM expenses LIMIT 1;
   ```

2. **Bucket existe**:
   ```sql
   SELECT * FROM storage.buckets WHERE name = 'receipts';
   ```

3. **Policies existen**:
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage';
   ```

## Listo! ✅

Una vez completados los 3 pasos, la funcionalidad de receipt upload estará lista para usar.





