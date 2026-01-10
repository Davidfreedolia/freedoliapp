# Receipts Storage Bucket Setup

## Overview
El sistema de attachments para expenses utiliza el bucket de Supabase Storage llamado `receipts` para almacenar archivos de recibos (PDF, JPG, PNG).

## Bucket Configuration (Manual)

El bucket `receipts` debe crearse manualmente en Supabase Dashboard:

### Pasos:
1. Ir a **Supabase Dashboard > Storage**
2. Click en **"New bucket"**
3. Nombre: `receipts`
4. **Public**: NO (los archivos se acceden mediante signed URLs o RLS)
5. Click **"Create bucket"**

### Storage Policies (RLS)

Las políticas de storage deben configurarse para permitir que los usuarios solo accedan a sus propios archivos. Ejecutar en SQL Editor:

```sql
-- Policy: Users can upload their own receipts
CREATE POLICY "Users can upload own receipts" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'receipts' 
    AND (auth.uid())::text = (storage.foldername(name))[1]
  );

-- Policy: Users can view their own receipts
CREATE POLICY "Users can view own receipts" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'receipts' 
    AND (auth.uid())::text = (storage.foldername(name))[1]
  );

-- Policy: Users can delete their own receipts
CREATE POLICY "Users can delete own receipts" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'receipts' 
    AND (auth.uid())::text = (storage.foldername(name))[1]
  );
```

## Estructura de Paths

Los archivos se almacenan bajo el siguiente patrón:
```
{userId}/expenses/{expenseId}/{timestamp}_{safeFileName}
```

Ejemplo:
```
a1b2c3d4-e5f6-7890-abcd-ef1234567890/expenses/abc123-def456-789ghi/1704567890123_factura.pdf
```

## Verificación

Para verificar que el bucket existe:
```sql
SELECT * FROM storage.buckets WHERE name = 'receipts';
```

## Runtime Guard

El código frontend verifica la existencia del bucket antes de intentar subir archivos. Si el bucket no existe, se muestra un error claro al usuario: "Receipts storage not configured (bucket 'receipts' missing)".
