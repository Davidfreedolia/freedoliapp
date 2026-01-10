-- ============================================
-- EXPENSE ATTACHMENTS TABLE
-- ============================================
-- Esta tabla almacena los archivos adjuntos (receipts) de los gastos
-- Permite múltiples archivos por expense y rastreo completo de metadatos

-- Crear tabla expense_attachments
CREATE TABLE IF NOT EXISTS expense_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expense_id uuid NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  file_path text NOT NULL,
  file_name text NOT NULL,
  mime_type text,
  size integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  is_demo boolean DEFAULT false
);

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_expense_attachments_expense_id ON expense_attachments(expense_id);
CREATE INDEX IF NOT EXISTS idx_expense_attachments_user_id ON expense_attachments(user_id);
CREATE INDEX IF NOT EXISTS idx_expense_attachments_user_expense ON expense_attachments(user_id, expense_id);

-- Habilitar RLS
ALTER TABLE expense_attachments ENABLE ROW LEVEL SECURITY;

-- Política SELECT: usuarios pueden ver sus propios attachments
DROP POLICY IF EXISTS "Users can select own expense attachments" ON expense_attachments;
CREATE POLICY "Users can select own expense attachments" ON expense_attachments
  FOR SELECT
  USING (auth.uid() = user_id);

-- Política INSERT: usuarios pueden insertar sus propios attachments
DROP POLICY IF EXISTS "Users can insert own expense attachments" ON expense_attachments;
CREATE POLICY "Users can insert own expense attachments" ON expense_attachments
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Política DELETE: usuarios pueden eliminar sus propios attachments
DROP POLICY IF EXISTS "Users can delete own expense attachments" ON expense_attachments;
CREATE POLICY "Users can delete own expense attachments" ON expense_attachments
  FOR DELETE
  USING (auth.uid() = user_id);

-- NOTA: No se requiere UPDATE policy ya que los attachments son inmutables
-- Si se necesita actualizar, se debe eliminar y volver a crear

-- Comentarios para documentación
COMMENT ON TABLE expense_attachments IS 'Almacena archivos adjuntos (receipts) asociados a gastos';
COMMENT ON COLUMN expense_attachments.file_path IS 'Ruta completa en el bucket de storage (ej: userId/expenses/expenseId/timestamp_filename.pdf)';
COMMENT ON COLUMN expense_attachments.file_name IS 'Nombre original del archivo';
COMMENT ON COLUMN expense_attachments.mime_type IS 'Tipo MIME del archivo (ej: application/pdf, image/jpeg)';
COMMENT ON COLUMN expense_attachments.size IS 'Tamaño del archivo en bytes';
COMMENT ON COLUMN expense_attachments.is_demo IS 'Indica si el attachment pertenece a datos de demo';
