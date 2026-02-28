-- ============================================
-- VERIFICACIÓ MULTI-TENANT (pas 1)
-- Executar amb un usuari autenticat (auth.uid() no null).
-- ============================================

-- 1) Cap fila de taules amb org_id ha d'estar en una org on l'usuari no és membre.
--    Hauria de retornar 0 files per a qualsevol usuari (executa amb sessió autenticada).
SELECT 'company_settings' AS tbl, COUNT(*) AS fuges
FROM public.company_settings cs
WHERE cs.org_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.org_memberships om WHERE om.org_id = cs.org_id AND om.user_id = auth.uid())
UNION ALL
SELECT 'projects', COUNT(*)
FROM public.projects p
WHERE p.org_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.org_memberships om WHERE om.org_id = p.org_id AND om.user_id = auth.uid())
UNION ALL
SELECT 'purchase_orders', COUNT(*)
FROM public.purchase_orders po
WHERE po.org_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.org_memberships om WHERE om.org_id = po.org_id AND om.user_id = auth.uid())
UNION ALL
SELECT 'suppliers', COUNT(*)
FROM public.suppliers s
WHERE s.org_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.org_memberships om WHERE om.org_id = s.org_id AND om.user_id = auth.uid())
UNION ALL
SELECT 'supplier_quotes', COUNT(*)
FROM public.supplier_quotes sq
WHERE sq.org_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.org_memberships om WHERE om.org_id = sq.org_id AND om.user_id = auth.uid())
UNION ALL
SELECT 'supplier_sample_requests', COUNT(*)
FROM public.supplier_sample_requests ss
WHERE ss.org_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.org_memberships om WHERE om.org_id = ss.org_id AND om.user_id = auth.uid());

-- 2) Comptar files visibles per l'usuari (via RLS) vs. files de les seves orgs.
--    En un client (p.ex. Supabase SQL Editor amb sessió), compara:
--    a) SELECT COUNT(*) FROM projects;  (el que veu RLS)
--    b) SELECT COUNT(*) FROM projects WHERE org_id IN (SELECT org_id FROM org_memberships WHERE user_id = auth.uid());
--    Haurien de coincidir.
-- Query (b) explícita:
SELECT COUNT(*) AS total_projects_en_les_meves_orgs
FROM public.projects
WHERE org_id IN (SELECT org_id FROM public.org_memberships WHERE user_id = auth.uid());

-- 3) Resum: orgs on sóc membre i nombre de projectes/POs/suppliers per org.
SELECT o.id AS org_id, o.name,
       (SELECT COUNT(*) FROM public.projects p WHERE p.org_id = o.id) AS projects,
       (SELECT COUNT(*) FROM public.purchase_orders po WHERE po.org_id = o.id) AS purchase_orders,
       (SELECT COUNT(*) FROM public.suppliers s WHERE s.org_id = o.id) AS suppliers
FROM public.orgs o
WHERE EXISTS (SELECT 1 FROM public.org_memberships om WHERE om.org_id = o.id AND om.user_id = auth.uid())
ORDER BY o.name;

-- ============================================
-- S1.4 — product_identifiers ORG-SCOPED (verificació)
-- Executar després d'aplicar 20260228193000_s1_4_product_identifiers_org_scope.sql
-- ============================================

-- C1.1) Columna org_id NOT NULL
SELECT column_name, is_nullable, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'product_identifiers' AND column_name = 'org_id';
-- Esperat: is_nullable = 'NO'

-- C1.2) Constraint UNIQUE(org_id, project_id) existeix
SELECT conname, pg_get_constraintdef(oid) AS def
FROM pg_constraint
WHERE conrelid = 'public.product_identifiers'::regclass AND contype = 'u';
-- Esperat: product_identifiers_org_project_key UNIQUE (org_id, project_id)

-- C1.3) No queden org_id NULL
SELECT COUNT(*) AS product_identifiers_org_id_null FROM public.product_identifiers WHERE org_id IS NULL;
-- Esperat: 0

-- C1.4) Policies de product_identifiers (org-based)
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'product_identifiers';
-- Esperat: "Org members can manage product identifiers" amb is_org_member(org_id)

-- ============================================
-- S1.4b — product_identifiers purge legacy + QA cross-org
-- Executar després d'aplicar 20260228203000_s1_4b_product_identifiers_purge_legacy.sql
-- ============================================

-- C2.1) Cap product_identifiers amb org_id NULL
SELECT COUNT(*) AS product_identifiers_org_id_null FROM public.product_identifiers WHERE org_id IS NULL;
-- Esperat: 0

-- C2.2) Taula existeix
SELECT to_regclass('public.product_identifiers') AS product_identifiers_regclass;

-- C2.3) Policies actuals (només org-based)
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'product_identifiers';

-- QA CROSS-ORG (manual): 2 orgs A i B; usuari membre d'ambdues.
-- Sessió org A: INSERT/SELECT product_identifiers (projecte A) → OK.
-- Llegir/editar identifier de projecte B → 0 rows / 401 segons client.
-- Frontend smoke: /app/dashboard, /app/analytics, /app/projects/:id (identifiers).

-- ============================================
-- S1.5 — CORE is_demo purge checks
-- Executar després d'aplicar 20260228213000_s1_5_is_demo_purge_core.sql
-- ============================================
-- Ha de retornar 0 files (cap taula core amb columna is_demo).
SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('projects', 'suppliers', 'supplier_quotes', 'purchase_orders')
  AND column_name = 'is_demo'
ORDER BY table_name;
