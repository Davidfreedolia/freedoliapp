# Auditoria final multi-tenant (post S1.20)

Data de referència: post S1.20 (gtin_pool org-scoped, purga is_demo de taules tenant).

---

## A) Verificació global schema

Executar a la base (Supabase SQL Editor o psql) les consultes del bloc **AUDITORIA GLOBAL POST S1.20** a `supabase/migrations/VERIFICATION_queries.sql`:

| Check | Query | Resultat esperat |
|-------|--------|-------------------|
| **A1** | Columnes `is_demo` restants | 0 rows (cap taula public amb columna is_demo en taules tenant) |
| **A2** | Taules amb RLS desactivat | Revisar: taules sense org_id poden ser REFERENCE; les amb org_id han de tenir RLS ON |
| **A3** | Policies amb `auth.uid()` | 0 en taules TENANT-DATA (permitit en org_memberships, profiles, etc.) |

---

## B) Frontend residual scan

### `.eq('user_id', ...)` — resum

- **Legítims (resolució d’org / membres):** `org_memberships` (supabase.js, App.jsx), resolució `activeOrgId` o `org_id` des de l’usuari.
- **Seed / dev:** demoSeed.js, DevSeed.jsx — esperable per dades de prova; no afecten tenant en prod.
- **Helpers genèrics:** queryHelpers.js — usa `user_id` per taules no org-scoped (evitar per taules en NO_IS_DEMO_TABLES).
- **Pàgines/components:** Analytics, Dashboard, Finances, ProjectDetailImpl, Projects, Settings, RecurringExpensesSection, Inventory, supplierMemory.js — algunes queries encara filtern per `user_id` en taules que podrien ser org-scoped; RLS limita igualment l’accés. Pendents de neteja gradual si es vol filtrat explícit per `org_id`.

### `is_demo` — resum

- **Helpers / denylist:** demoModeFilter.js, queryHelpers.js — lògica legacy; NO_IS_DEMO_TABLES evita injectar is_demo en taules org-scoped.
- **Seed / dev:** demoSeed.js, DevSeed.jsx — insercions i esborrat de dades demo (esperable).
- **UI / comentaris:** ProjectDetailImpl (project?.is_demo ja no existeix a schema), QuotesSection (is_demo_row filtre local), Dashboard (comentaris), Finances (comentaris NOTE), RecurringExpensesSection (filtre), auditLog (camp opcional), calendar/ProjectEventsTimeline (select is_demo — columna eliminada a project_events).
- **supabase.js:** CORE_NO_IS_DEMO_TABLES i applyDemoModeFilter; no s’injecta is_demo en taules de la denylist.

Conclusió: el contracte multi-tenant està aplicat a nivell DB i RLS; al frontend queden usos residuals en seed, dev i en algunes pàgines. Les taules en CORE_NO_IS_DEMO_TABLES no reben filtre is_demo des del client.

---

## C) Contracte i regla obligatòria

Veure **TECHNICAL_ROADMAP_SAAS.md** (§ 3) i **D3 — Multi-tenant Contract**:

- **Contracte final:** Totes les taules de dades de negoci són org-scoped: org_id NOT NULL + index org_id + RLS amb is_org_member(org_id).
- **Futures taules:** org_id NOT NULL + index + RLS is_org_member(org_id). Prohibit user-based policies (auth.uid() = user_id) i allow_all en TENANT-DATA.
