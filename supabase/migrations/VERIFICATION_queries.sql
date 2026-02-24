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
