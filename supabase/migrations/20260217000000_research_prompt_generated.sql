-- ============================================
-- RESEARCH PROMPT GENERATED FLAG ON PROJECTS
-- ============================================
-- Marca quan s'ha generat o descarregat el Prompt Claude des de Recerca.
-- No es guarda el contingut del prompt.

BEGIN;

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS research_prompt_generated boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS research_prompt_generated_at timestamptz NULL;

COMMENT ON COLUMN public.projects.research_prompt_generated IS 'True si s''ha generat o descarregat el Prompt Claude (Market Research) des de Recerca.';
COMMENT ON COLUMN public.projects.research_prompt_generated_at IS 'Timestamp de la darrera generació o descàrrega del prompt.';

COMMIT;
