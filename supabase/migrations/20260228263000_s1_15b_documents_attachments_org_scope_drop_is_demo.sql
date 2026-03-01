-- ============================================
-- S1.15b — documents + expense_attachments org-scoped, drop is_demo
-- ============================================

-- B1) Assegura org_id existeix (S1.2 ja el pot haver afegit)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'documents' AND column_name = 'org_id') THEN
    ALTER TABLE public.documents ADD COLUMN org_id uuid;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'expense_attachments' AND column_name = 'org_id') THEN
    ALTER TABLE public.expense_attachments ADD COLUMN org_id uuid;
  END IF;
END $$;

-- B2) Backfill org_id

-- documents: project_id -> projects(org_id)
UPDATE public.documents d
SET org_id = p.org_id
FROM public.projects p
WHERE d.project_id = p.id AND p.org_id IS NOT NULL AND d.org_id IS NULL;

-- documents: expense_id -> expenses(org_id) (si la columna existeix)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'documents' AND column_name = 'expense_id') THEN
    UPDATE public.documents d
    SET org_id = e.org_id
    FROM public.expenses e
    WHERE d.expense_id = e.id AND e.org_id IS NOT NULL AND d.org_id IS NULL;
  END IF;
END $$;

-- documents: user_id -> org_memberships
UPDATE public.documents d
SET org_id = (SELECT om.org_id FROM public.org_memberships om WHERE om.user_id = d.user_id ORDER BY om.created_at LIMIT 1)
WHERE d.org_id IS NULL AND d.user_id IS NOT NULL;

-- expense_attachments: expense_id -> expenses(org_id)
UPDATE public.expense_attachments ea
SET org_id = e.org_id
FROM public.expenses e
WHERE ea.expense_id = e.id AND e.org_id IS NOT NULL AND ea.org_id IS NULL;

-- expense_attachments: user_id -> org_memberships (fallback)
UPDATE public.expense_attachments ea
SET org_id = (SELECT om.org_id FROM public.org_memberships om WHERE om.user_id = ea.user_id ORDER BY om.created_at LIMIT 1)
WHERE ea.org_id IS NULL AND ea.user_id IS NOT NULL;

-- B3) NOT NULL condicional + index
DO $$
DECLARE
  d_nulls bigint;
  e_nulls bigint;
BEGIN
  SELECT COUNT(*) INTO d_nulls FROM public.documents WHERE org_id IS NULL;
  SELECT COUNT(*) INTO e_nulls FROM public.expense_attachments WHERE org_id IS NULL;
  IF d_nulls > 0 THEN
    RAISE WARNING 'S1.15b: documents té % files amb org_id NULL', d_nulls;
  ELSE
    ALTER TABLE public.documents ALTER COLUMN org_id SET NOT NULL;
  END IF;
  IF e_nulls > 0 THEN
    RAISE WARNING 'S1.15b: expense_attachments té % files amb org_id NULL', e_nulls;
  ELSE
    ALTER TABLE public.expense_attachments ALTER COLUMN org_id SET NOT NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_documents_org_id ON public.documents(org_id);
CREATE INDEX IF NOT EXISTS idx_expense_attachments_org_id ON public.expense_attachments(org_id);

-- B4) DROP is_demo (idempotent)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'documents' AND column_name = 'is_demo') THEN
    ALTER TABLE public.documents DROP COLUMN is_demo;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'expense_attachments' AND column_name = 'is_demo') THEN
    ALTER TABLE public.expense_attachments DROP COLUMN is_demo;
  END IF;
END $$;

-- B5) RLS — drop user-based, create org-based
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_attachments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own documents" ON public.documents;
DROP POLICY IF EXISTS "Users can insert own documents" ON public.documents;
DROP POLICY IF EXISTS "Users can update own documents" ON public.documents;
DROP POLICY IF EXISTS "Users can delete own documents" ON public.documents;
DROP POLICY IF EXISTS "Users can select own expense attachments" ON public.expense_attachments;
DROP POLICY IF EXISTS "Users can insert own expense attachments" ON public.expense_attachments;
DROP POLICY IF EXISTS "Users can delete own expense attachments" ON public.expense_attachments;

CREATE POLICY "Org members can manage documents"
ON public.documents
FOR ALL
TO authenticated
USING (public.is_org_member(org_id))
WITH CHECK (public.is_org_member(org_id));

CREATE POLICY "Org members can manage expense attachments"
ON public.expense_attachments
FOR ALL
TO authenticated
USING (public.is_org_member(org_id))
WITH CHECK (public.is_org_member(org_id));
