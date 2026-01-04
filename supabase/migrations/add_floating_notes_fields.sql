-- ============================================
-- MIGRACIÓ: AFEGIR CAMPS PER NOTES FLOTANTS
-- ============================================
-- Aquest script afegeix els camps necessaris per notes flotants (post-its)
-- Script IDEMPOTENT: Es pot executar múltiples vegades sense errors

-- Afegir camps nous a sticky_notes
DO $$
BEGIN
  -- position_x: posició horitzontal del post-it (pixels)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='sticky_notes' AND column_name='position_x') THEN
    ALTER TABLE sticky_notes ADD COLUMN position_x integer DEFAULT 100;
  END IF;

  -- position_y: posició vertical del post-it (pixels)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='sticky_notes' AND column_name='position_y') THEN
    ALTER TABLE sticky_notes ADD COLUMN position_y integer DEFAULT 100;
  END IF;

  -- context: context de la nota (global, dashboard, project_id, order_id)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='sticky_notes' AND column_name='context') THEN
    ALTER TABLE sticky_notes ADD COLUMN context text DEFAULT 'global' 
      CHECK (context IN ('global', 'dashboard', 'project', 'order'));
  END IF;

  -- context_id: ID del context específic (project_id o order_id si context no és global/dashboard)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='sticky_notes' AND column_name='context_id') THEN
    ALTER TABLE sticky_notes ADD COLUMN context_id uuid;
  END IF;

  -- minimized: si la nota està minimitzada
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='sticky_notes' AND column_name='minimized') THEN
    ALTER TABLE sticky_notes ADD COLUMN minimized boolean DEFAULT false;
  END IF;

  -- z_index: per controlar l'ordre de superposició
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='sticky_notes' AND column_name='z_index') THEN
    ALTER TABLE sticky_notes ADD COLUMN z_index integer DEFAULT 1000;
  END IF;
END $$;

-- Crear índexs per millorar consultes
CREATE INDEX IF NOT EXISTS idx_sticky_notes_user_context ON sticky_notes(user_id, context, context_id) 
  WHERE status = 'open';
CREATE INDEX IF NOT EXISTS idx_sticky_notes_user_status ON sticky_notes(user_id, status) 
  WHERE status = 'open';





