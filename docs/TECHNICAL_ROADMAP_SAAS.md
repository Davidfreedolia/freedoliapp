# SaaS Roadmap & Architecture — Multi-tenant Ready

**FREEDOLIAPP** — Technical roadmap for subscription-ready, multi-tenant SaaS.

---

## 1) Executive summary

- **Què és:** FREEDOLIAPP és una plataforma SaaS per a venedors Amazon (gestió de projectes, POs, proveïdors, mostres, viabilitat, despeses).
- **Per qui:** Venedors individuals, equips (VA, partner, comptable) i agències que gestionen múltiples venedors.
- **Model:** Subscripció mensual per workspace (org); opcional seat-based.
- **Tenant boundary:** Totes les dades operatives pertanyen a un `org_id`; RLS garanteix que cap usuari veu dades d’una altra org.
- **Robustesa:** Postgres + Supabase; RLS amb `is_org_member(org_id)`; sense policies permissives (allow_all); backfill determinista i delete d’orfes on cal (p. ex. health_runs).
- **Reference data:** Taules globals (alert_state, marketplaces) amb RLS “SELECT authenticated” sense exposar dades tenant.
- **Objectiu:** Vendre subscripcions amb confiança: multi-tenant real, equip, rols, suport i escalabilitat.

---

## 2) Current state (DB + RLS)

### Taules TENANT-DATA (org_id NOT NULL + RLS is_org_member)

- **Nucli:** company_settings, projects, purchase_orders, suppliers, supplier_quotes, supplier_sample_requests.
- **S1.2 (massiu):** alert_events, alert_rules, app_events, audit_log, briefings, briefs, dashboard_preferences, decision_log, documents, events, expense_attachments, expenses, finance_categories, financial_events, gtin_assignments, gtin_pool, health_runs, incomes, inventory, inventory_movements, listings, logistics_flow, order_items, orders, payments, po_amazon_readiness, po_shipments, product_identifiers, product_variants, project_events, project_hypotheses, project_marketplaces, project_phases, project_profitability_basic, project_tasks, project_viability, recurring_expense_occurrences, recurring_expenses, sales, signatures, sticky_notes, stock, supplier_price_estimates, supplier_quote_price_breaks, tasks, user_counters, warehouses.
- **S1.3–S1.7 (puntuals):** variant_marketplace_asins, product_variants, project_viability, gtin_assignments, health_runs (backfill per project_id + delete orfes).

### Taules REFERENCE-DATA (globals, sense org_id)

- **alert_state:** RLS SELECT per authenticated (20260222112000).
- **marketplaces:** RLS SELECT per authenticated (20260222113000).
- **variant_marketplace_asins:** TENANT (org_id des de product_variants / project).

### Què s’ha migrat

- Org + org_memberships + helpers (20260222000001–003).
- S1.2: add org_id + backfill a totes les TENANT-DATA; S1.2 RLS: NOT NULL + FK + index + RLS + 4 policies per taula, eliminació allow_all.
- S1.3–S1.7: taules crítiques (variant_marketplace_asins, product_variants, project_viability, gtin_assignments, health_runs) amb backfill determinista i, on cal, delete d’orfes.

---

## 3) Multi-tenant contract

### Tenant boundary

- **Una fila = una org.** Tota taula TENANT-DATA té `org_id uuid NOT NULL` i FK a `public.orgs(id) ON DELETE CASCADE`.
- **Accés:** Un usuari només pot veure/modificar dades de les orgs on és membre (`org_memberships`). RLS ho aplica amb `is_org_member(org_id)`.
- **Sense excepcions:** No hi ha “dades del usuari sense org”; si una fila no pot assignar-se a cap org, es considera orfe i es pot esborrar en migracions (p. ex. health_runs).

### Normes obligatòries per taules noves (TENANT-DATA)

- `org_id uuid NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE`.
- `CREATE INDEX idx_<table>_org_id ON public.<table>(org_id)`.
- `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`.
- Quatre policies: SELECT, INSERT, UPDATE, DELETE per `authenticated` amb `USING (public.is_org_member(org_id))` i `WITH CHECK (public.is_org_member(org_id))` on correspongui.
- **Prohibit:** policies amb nom `allow_all%` o `%allow all%`; `qual IS NULL` o `with_check = true` permissive en TENANT-DATA.

---

## 4) Frontend requirements

### Active org selector + storage

- El frontend ha de tenir un **selector d’org activa** (dropdown o equivalent) basat en `org_memberships` del usuari.
- Guardar l’org activa en **localStorage** (o context) amb clau tipus `freedoli_active_org_id`.
- En carregar l’app: si hi ha valor guardat, validar que l’usuari segueix sent membre; si no, triar la primera org del usuari o mostrar onboarding.

### Query patterns recomanats

- **Quan filtrar per org_id:** Llistats i dashboards que mostrin dades “de l’org activa”: afegir `eq('org_id', activeOrgId)` per reduir dades i aprofitar l’índex. RLS ja filtra, però el filtre explícit millora UX i rendiment.
- **Quan confiar només en RLS:** Inserts/updates/deletes des del client: assegurar que el client envia `org_id = activeOrgId`; RLS rebutja qualsevol fila amb org no membre. No cal duplicar tot el filtrat a l’API si el backend és Supabase Postgres amb RLS.

---

## 5) Team management

### Invitacions (taula + RPC)

- **Taula proposada:** `org_invitations` amb (id, org_id, email, role, token, expires_at, created_by, status).
- **RPC:** `invite_org_member(org_id, email, role)` → crea invitació, envia email (edge function o extern). `accept_org_invitation(token)` → insereix a `org_memberships`, invalida invitació.
- **RLS:** Només owner/admin poden crear invitacions; lectura per qui rep la invitació (per token) o per membres de l’org.

### Rols i permisos

- **owner:** tot; pot eliminar org, transferir ownership, gestionar billing (quan existi).
- **admin:** gestionar membres i invitacions; no pot eliminar org ni canviar owner.
- **member:** accés normal a dades de l’org; no gestiona membres.
- Ús a RLS: `is_org_owner_or_admin(org_id)` per taules de gestió (invitacions, membres); `is_org_member(org_id)` per la resta de TENANT-DATA.

---

## 6) Observability & support

### audit_log / app_events amb org_id

- Garantir que **audit_log** i **app_events** (si s’usen) tinguin `org_id` i que les policies siguin per org. Permet filtrar “tots els esdeveniments d’aquesta org” per suport i debugging.
- No guardar secrets ni PII redundant; sí accions (qui, què, quan, org_id).

### Error tracking

- Integrar un servei (Sentry, etc.) amb **scope per org_id** i user_id per poder filtrar errors per tenant en suport.

### Runbooks (5 casos típics)

1. **“No veig les meves dades”** — Comprovar org activa al frontend; que l’usuari sigui membre (`org_memberships`); que RLS no hagi deixat la taula sense policies o amb allow_all eliminada sense substitució.
2. **“Invitació no arriba”** — Comprovar taula d’invitacions, token vàlid, no expirada; logs d’enviament d’email.
3. **“Migració ha fallat amb NULL org_id”** — Revisar backfill: project_id/user_id/parent FK; si és acceptable, esborrar orfes (com a S1.7 health_runs) i tornar a executar; no assignar org a l’atzar en multi-org.
4. **“RLS bloqueja un query legítim”** — Comprovar que el rol és `authenticated` i que `is_org_member(org_id)` es compleix per les files afectades; comprovar que no hi ha policy amb WITH CHECK massa restrictiva.
5. **“Sospita de fuga entre tenants”** — Executar smoke tests (Appendix): cap taula TENANT amb RLS OFF; cap policy allow_all; cap fila amb org_id NULL a taules amb NOT NULL.

---

## 7) Security checklist

### Evitar allow_all

- Cap policy amb nom `allow_all%` o `%allow all%` en taules TENANT-DATA.
- Cap policy amb `qual IS NULL` o amb `qual = true` / `with_check = true` permissive en TENANT-DATA.
- En nous desenvolupaments: code review obligatori per noves policies.

### RLS smoke tests

- Després de cada desplegament de migracions: executar els scripts de l’Appendix (cap RLS OFF en TENANT, cap allow_all, cap org_id NULL on sigui NOT NULL).

### Scripts SQL de verificació recomanats

```sql
-- 1) Taules TENANT-DATA amb RLS OFF (ha de retornar 0 files)
SELECT c.relname
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind = 'r'
  AND c.relrowsecurity = false
  AND EXISTS (
    SELECT 1 FROM information_schema.columns col
    WHERE col.table_schema = 'public' AND col.table_name = c.relname AND col.column_name = 'org_id'
  );

-- 2) Policies allow_all en public (ha de retornar 0)
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE schemaname = 'public' AND policyname ILIKE 'allow_all%';

-- 3) Comptar NULL org_id en taules que haurien de tenir NOT NULL (sample; ampliar segons taules)
SELECT 'projects' AS tbl, COUNT(*) AS n FROM public.projects WHERE org_id IS NULL
UNION ALL SELECT 'health_runs', COUNT(*) FROM public.health_runs WHERE org_id IS NULL
UNION ALL SELECT 'product_variants', COUNT(*) FROM public.product_variants WHERE org_id IS NULL;
-- Esperat: n = 0 per totes.
```

---

## 8) Scalability checklist

### Indexació per org_id

- Tota taula TENANT-DATA ha de tenir `idx_<table>_org_id ON (org_id)`. Les migracions S1.x ja ho apliquen.
- Queries freqüents: considerar índexs compostos (org_id, created_at), (org_id, status), etc., segons patrons d’accés.

### JSONB: quan sí i quan no

- **Sí:** camps flexibles (metadata, snapshot de buyer_info, items de PO) que no es consulten per clau amb alta cardinalitat.
- **No:** relacions que requereixin JOINs, FKs o filtres freqüents; preferir columnes o taules normalitzades.

### Límits i rate limiting en RPCs

- RPCs pesades (imports, bulk create): definir límits per usuari/org (p. ex. màxim N files per crida, o throttle per minut).
- Implementar a Edge Function o a l’RPC amb comprovacions (COUNT abans d’insert massiu) i RAISE si se supera el límit.

---

## 9) Roadmap (6–8 setmanes)

| Sprint | Focus | Entregables |
|--------|--------|-------------|
| **Sprint 1** | Active org + org memberships UI | Selector d’org al header; persistència activeOrgId; pàgina “El meu equip” amb llistat de membres (org_memberships) per org activa; només owner/admin poden veure gestionar. |
| **Sprint 2** | Invitations + roles | Taula org_invitations; RPC invite + accept; UI “Convidar membre”; diferenciar owner/admin/member a la UI (botons condicionals). |
| **Sprint 3** | Audit + observability | audit_log / app_events amb org_id i policies; dashboard “Activitat recent” per org; integració error tracking amb org_id. |
| **Sprint 4** | Hardening + performance + QA | Índexs addicionals per queries lentes; runbooks i smoke tests automatitzats; revisió final allow_all i RLS OFF; tests E2E per fluxos crítics (login, canvi d’org, invitació). |

---

## 10) Appendix

### Llista de migracions S1.x (i base multi-tenant)

| Fitxer | Què fa |
|--------|--------|
| 20260222000001_orgs_and_memberships.sql | Crea orgs, org_memberships; defineix is_org_member, is_org_owner_or_admin. |
| 20260222000002_add_org_id_and_backfill.sql | Afegeix org_id a company_settings, projects, purchase_orders, suppliers, supplier_quotes, supplier_sample_requests; backfill per user_id. |
| 20260222000003_org_id_not_null_rls.sql | NOT NULL + FK + RLS + policies org per les 6 taules; RLS per orgs i org_memberships. |
| 20260222100000_s1_2_add_org_id_backfill.sql | Afegeix org_id a totes les TENANT-DATA restants; backfill per project_id, user_id, parent FK. |
| 20260222100001_s1_2_rls_policies.sql (o equivalent) | NOT NULL + FK + index + RLS + 4 policies is_org_member per totes TENANT-DATA; elimina allow_all; verificació final. |
| 20260222112000_alert_state_global_readonly.sql | RLS SELECT per authenticated a alert_state (reference data). |
| 20260222113000_marketplaces_global_readonly.sql | RLS SELECT per authenticated a marketplaces (reference data). |
| 20260222120000_s1_3_variant_marketplace_asins_org_rls.sql | org_id + backfill des de product_variants; NOT NULL + FK + RLS + 4 policies. |
| 20260222121000_s1_4_product_variants_org_rls.sql | org_id + backfill project_id / user_id; NOT NULL + FK + RLS + 4 policies. |
| 20260222122000_s1_5_project_viability_org_rls.sql | org_id + backfill project_id / user_id; NOT NULL + FK + RLS + 4 policies. |
| 20260222122500_s1_5_1_project_viability_enforce_not_null.sql | Hotfix: assegura backfill + NOT NULL + FK + RLS per project_viability. |
| 20260222123000_s1_6_gtin_assignments_org_rls.sql | org_id + backfill project_id / user_id; NOT NULL + FK + RLS + 4 policies. |
| 20260222124000_s1_7_health_runs_org_rls.sql | org_id + backfill només project_id; DELETE orfes (project_id NULL o inexistent); NOT NULL + FK + RLS + 4 policies. |

### Queries de smoke test (cap fuga, RLS on, no allow_all)

```sql
-- A) Cap taula TENANT amb RLS OFF
SELECT c.relname
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind = 'r'
  AND c.relrowsecurity = false
  AND EXISTS (
    SELECT 1 FROM information_schema.columns col
    WHERE col.table_schema = 'public' AND col.table_name = c.relname AND col.column_name = 'org_id'
  );

-- B) Cap policy allow_all
SELECT tablename, policyname FROM pg_policies
WHERE schemaname = 'public' AND (policyname ILIKE 'allow_all%' OR policyname ILIKE '%allow all%');

-- C) Cap org_id NULL en taules clau (ampliar llistat segons necessari)
SELECT 'projects' AS t, COUNT(*) AS n FROM public.projects WHERE org_id IS NULL
UNION ALL SELECT 'health_runs', COUNT(*) FROM public.health_runs WHERE org_id IS NULL
UNION ALL SELECT 'product_variants', COUNT(*) FROM public.product_variants WHERE org_id IS NULL
UNION ALL SELECT 'project_viability', COUNT(*) FROM public.project_viability WHERE org_id IS NULL
UNION ALL SELECT 'gtin_assignments', COUNT(*) FROM public.gtin_assignments WHERE org_id IS NULL;
-- Esperat: n = 0 per totes.
```

---

*Document generat com a referència tècnica per al Tech Lead. Actualitzar segons canvis en migracions o decisions d’arquitectura.*
