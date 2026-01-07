-- ============================================
-- SETUP OBSERVABILITAT: AUDIT LOG
-- ============================================
-- Script per crear taula audit_log amb RLS
-- Executar aquest script al SQL Editor de Supabase

-- ============================================
-- 1. CREAR TAULA audit_log
-- ============================================

CREATE TABLE IF NOT EXISTS audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_type text NOT NULL,
  entity_id uuid NULL,
  action text NOT NULL,
  status text NOT NULL CHECK (status IN ('success', 'error')),
  message text NULL,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb
);

-- ============================================
-- 2. CREAR ÍNDEXS PER PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_audit_log_user_created ON audit_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity_created ON audit_log(entity_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_status ON audit_log(status) WHERE status = 'error';
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);

-- ============================================
-- 3. HABILITAR RLS
-- ============================================

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 4. CREAR POLÍTIQUES RLS
-- ============================================

-- Els usuaris només poden veure els seus propis logs
DROP POLICY IF EXISTS "Users can view own audit logs" ON audit_log;
CREATE POLICY "Users can view own audit logs" ON audit_log
  FOR SELECT USING (auth.uid() = user_id);

-- Els usuaris poden inserir logs (el user_id s'assigna automàticament)
DROP POLICY IF EXISTS "Users can insert own audit logs" ON audit_log;
CREATE POLICY "Users can insert own audit logs" ON audit_log
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Els usuaris NO poden modificar o eliminar logs (només lectura i inserció)
-- Això assegura la integritat de l'audit log

-- ============================================
-- 5. COMENTARIS SOBRE ELS CAMPOS
-- ============================================

-- entity_type: tipus d'entitat afectada
--   exemples: 'project', 'purchase_order', 'document', 'drive', 'user', 'supplier'
-- 
-- action: acció realitzada
--   exemples: 'create', 'update', 'delete', 'upload', 'ensure_folders', 'login', 'logout'
--
-- status: resultat de l'acció
--   'success': acció completada correctament
--   'error': acció fallida
--
-- message: missatge descriptiu (opcional)
--   exemples: 'Project created successfully', 'Upload failed: File too large'
--
-- meta: informació addicional en JSON (opcional)
--   exemples: {'file_size': 1024, 'folder_id': 'xxx', 'error_code': '401'}

-- ============================================
-- FI DEL SCRIPT
-- ============================================






















