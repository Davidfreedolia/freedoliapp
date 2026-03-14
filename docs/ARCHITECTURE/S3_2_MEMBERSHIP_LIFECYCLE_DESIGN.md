# S3.2 MEMBERSHIP LIFECYCLE DESIGN

Document de disseny del cicle de vida canònic per a **workspace memberships** (FREEDOLIAPP fase S3.2). No modifica BD ni migracions; no refactoritza lògica existent ni implementa UI; només analitza i proposa el model.

---

## Current usage of org_memberships

### Inserts

| Ubicació | Descripció |
|----------|------------|
| `src/lib/workspace/createWorkspace.js` (L41–43) | Després de crear `org`, inserta una fila a `org_memberships` amb `role: 'owner'` per l’usuari creador. |
| `src/pages/Settings.jsx` (L356–358) | `handleAddMember`: insert directe a `org_memberships` amb `org_id`, `user_id`, `role: 'member'`. Fa `assertOrgWithinLimit(entitlements, 'team.seats', seatsUsed)` abans. |
| `supabase/migrations/20260222000002_add_org_id_and_backfill.sql` (L49–51) | Backfill: `INSERT ... ON CONFLICT (org_id, user_id) DO NOTHING` per assignar owner per usuari. |
| `supabase/migrations/20260301005000_f2_cba_seat_enforcement_rpc.sql` (L61–62) | RPC `org_add_member`: fa `INSERT INTO public.org_memberships (org_id, user_id, role)` després de comprovar owner/admin i límit de seients. **L’app no crida aquest RPC**; fa insert directe des de Settings. |

### Deletes

- No hi ha deletes explícits a `src/`. La política RLS «Owner or admin can delete org_memberships» (migration `20260222000003`) permet als owner/admin eliminar membres; la migració `20260301003000` comenta que «DELETE un membership per reduir seats» ha de ser permès.
- Les files es poden eliminar per CASCADE si es borra l’org o l’usuari.

### Role checks

| Ubicació | Comportament |
|----------|--------------|
| `supabase/migrations/20260222000001_orgs_and_memberships.sql` | `is_org_member(org_id)`: `EXISTS (SELECT 1 FROM org_memberships WHERE org_id = check_org AND user_id = auth.uid())`. `is_org_owner_or_admin(org_id)`: mateix amb `role IN ('owner', 'admin')`. |
| `src/pages/BillingLocked.jsx` (L21–23) | `isOwnerAdmin = memberships.some(m => m.org_id === activeOrgId && (m.role === 'owner' \|\| m.role === 'admin'))`. |
| `src/pages/BillingOverSeat.jsx` (L19–21) | Mateix patró que BillingLocked. |
| `src/contexts/WorkspaceContext.jsx` (L86–90) | Triar `activeOrgId`: preferència guardada si és a la llista; sinó org on és owner; sinó primera org de la llista. Usa `list.some(m => m.org_id === currentStored)` i `list.find(m => m.role === 'owner')`. |
| Edge Functions (Stripe) | `stripe-checkout-session`, `stripe-portal-session`, `stripe_create_portal`, `stripe_create_checkout`, `create_checkout_session`: llegeixen `org_memberships` per `org_id` + `user_id` i comproven `role === 'owner' \|\| role === 'admin'` abans de crear sessió. |

### Seat counting

- **App:** `src/lib/workspace/usage.js` (L33–39): `getWorkspaceUsage()` fa `supabase.from('org_memberships').select('*', { count: 'exact', head: true }).eq('org_id', orgId)` → `seatsUsed = membersRes?.count ?? 0`. Totes les files de l’org compten.
- **Settings:** `src/pages/Settings.jsx` (L123–127): `loadWorkspace` fa el mateix count per `activeOrgId` → `setSeatsUsed(count ?? 0)`.
- **BillingOverSeat:** `src/pages/BillingOverSeat.jsx` (L33–34): fa `supabase.from('org_memberships').select('*', { count: 'exact', head: true }).eq('org_id', activeOrgId)` per mostrar seients usats.

### RLS policies

| Taula | Política | Migració |
|-------|----------|----------|
| `org_memberships` | SELECT: `is_org_member(org_id) AND (org_billing_allows_access(org_id) OR is_org_owner_or_admin(org_id))` | `20260301003000` (sobreescriu la de `20260222000003`) |
| `org_memberships` | INSERT: `is_org_owner_or_admin(org_id)` | `20260222000003` |
| `org_memberships` | UPDATE/DELETE: `is_org_owner_or_admin(org_id)` | `20260222000003` |

Les policies de les taules tenant (projects, suppliers, etc.) fan servir `is_org_member(org_id)` i, per SELECT, també `org_billing_allows_access(org_id) OR is_org_owner_or_admin(org_id)`.

### Helper functions (BD)

- **`is_org_member(check_org uuid)`**: retorna true si existeix una fila a `org_memberships` amb `org_id = check_org` i `user_id = auth.uid()` (sense filtrar per cap estat).
- **`is_org_owner_or_admin(check_org uuid)`**: mateix amb `role IN ('owner', 'admin')`.

---

## Current seat calculation

- **On es calcula el seat usage**
  - **App (canònic):** `src/lib/workspace/usage.js` → `getWorkspaceUsage(supabase, orgId)`. `seatsUsed = COUNT(org_memberships)` per `org_id` (sense filtre d’estat).
  - **Settings:** `loadWorkspace` → mateix count per `activeOrgId`.
  - **BillingOverSeat:** count directe a `org_memberships` per `org_id`.
- **Límit de seients**
  - **App:** `getOrgFeatureLimit(entitlements, 'team.seats')` (i fallback `entitlements.seat_limit`) des de `billing_org_entitlements` via `getOrgEntitlements(supabase, orgId)`.
  - **Settings:** `assertOrgWithinLimit(entitlements, 'team.seats', seatsUsed)` abans d’afegir membre; també usa `org?.seat_limit` per a la UI (seat limit reached).
- **Base de dades**
  - **Trigger `enforce_seat_limit`** (migration `20260303090300_d8_2_plan_enforcement_limits.sql`): BEFORE INSERT a `org_memberships`. Compta `COUNT(*) FROM org_memberships WHERE org_id = new.org_id` i compara amb `get_plan_limits(v_plan).seats_limit`; si `v_seats_actual >= v_seats_limit` llança `SEAT_LIMIT_REACHED`. **Totes les files compten com a seient.**
  - **RPC `org_add_member`** (migration `20260301005000`): fa `COUNT(*) FROM org_memberships WHERE org_id = p_org_id` i compara amb `orgs.seat_limit` (fallback 1). L’app no usa aquest RPC; el flux real és insert directe des de Settings, i el trigger és qui aplica el límit.

**Conclusió:** Tant l’app com la BD tracten **cada fila de `org_memberships`** com un seient. No hi ha estat d’invitació ni suspensió; el límit ve de `billing_org_entitlements` / `get_plan_limits` a l’app i al trigger, i de `orgs.seat_limit` només a l’RPC `org_add_member`.

---

## Proposed membership lifecycle

### membership_status ENUM (proposta)

```text
- invited   → usuari convidat encara no acceptat
- active    → membre amb accés normal
- suspended → accés suspès (no compta seient; pot reactivar-se)
- removed   → sortida/eliminació (històric; opcionalment soft-delete)
```

### Transicions

| Des | A | Condició / acció |
|-----|---|-------------------|
| invited | active | L’usuari accepta la invitació (o admin marca com acceptada). |
| active | suspended | Owner/admin suspèn el membre. |
| suspended | active | Owner/admin reactiva el membre. |
| active | removed | Owner/admin elimina el membre o l’usuari surt de l’org. |
| invited | removed | Cancel·lació de la invitació o expiració. |

No es permet: `removed` → cap altre estat (terminal); `suspended` → invited.

### Semàntica de seient (canònica)

- **1 seient = 1 membership amb `status = 'active'`.**
- Els usuaris amb `status = 'invited'` **no** compten com a seients.
- Els `suspended` **no** compten com a seients.
- Els `removed` no compten (o la fila es pot eliminar/arxivar).

Això ha d’aplicar-se a:
- `getWorkspaceUsage` (i qualsevol count de seients a l’app).
- Trigger `enforce_seat_limit`: només comptar files amb `status = 'active'` (i, si s’afegeix invitació, les noves files amb `status = 'invited'` no han de consumir seient).
- RPC `org_add_member` si es manté: comptar només `status = 'active'`.

---

## Proposed schema evolution

**Només proposta; sense migracions en aquest document.**

### Taula `org_memberships` (camps nous proposats)

| Camp | Tipus | Descripció |
|------|--------|------------|
| `status` | text / ENUM | `'invited' \| 'active' \| 'suspended' \| 'removed'`. Default per a nous inserts: `'active'` (creació directa) o `'invited'` (invitació). |
| `invited_by` | uuid (FK auth.users) | Qui ha enviat la invitació; NULL si no és invitació. |
| `invited_at` | timestamptz | Quan es va crear la invitació; NULL si no és invitació. |
| `accepted_at` | timestamptz | Quan l’usuari va acceptar (transició invited → active); NULL si encara invited o si va ser afegit directament. |
| `suspended_at` | timestamptz | Quan es va suspendre (active → suspended); NULL si no està suspès. |

Esquema actual que es manté: `org_id`, `user_id`, `role`, `created_at`, PK `(org_id, user_id)`.

Consideracions:
- Backfill: totes les files existents reben `status = 'active'`, la resta de nous camps NULL.
- Les policies RLS i els helpers `is_org_member` / `is_org_owner_or_admin` haurien de filtrar per `status` segons les regles d’accés (p. ex. `invited` pot veure només la invitació; `active` i `suspended` poden ser tractats diferent per accés a dades).

---

## Impacted system areas

Tots els punts que llegeixen, escriuen o compten `org_memberships` o que depenen del significat de “membre” / “seient” queden afectats per la introducció de `status` i la semàntica de seient.

| Àrea | Fitxer(s) / ubicació | Impacte |
|------|----------------------|--------|
| **Seat counting (app)** | `src/lib/workspace/usage.js` | Canviar count a només files amb `status = 'active'` (o equivalent filter). |
| **Seat counting (Settings)** | `src/pages/Settings.jsx` (loadWorkspace count, assertOrgWithinLimit, seat limit UI) | Mateix criteri de count; possible filtre per llistat de “members” (només active o incloure invited). |
| **Seat counting (BillingOverSeat)** | `src/pages/BillingOverSeat.jsx` | Count per `org_id` ha de ser només `status = 'active'`. |
| **Trigger BD** | `supabase/migrations/20260303090300_d8_2_plan_enforcement_limits.sql` – `enforce_seat_limit()` | Incloure `AND status = 'active'` (o el valor canònic) al `COUNT(*)` de `org_memberships`. |
| **RPC** | `supabase/migrations/20260301005000_f2_cba_seat_enforcement_rpc.sql` – `org_add_member` | Si es segueix usant: count només `status = 'active'`; decidir si l’RPC pot crear fila `invited` o només `active`. |
| **RLS – helpers** | `supabase/migrations/20260222000001_orgs_and_memberships.sql` – `is_org_member`, `is_org_owner_or_admin` | Decidir si “member” inclou `invited` (per veure invitació) o només `active` (i opcionalment `suspended` per a owner/admin). Afecta totes les policies que criden aquests helpers. |
| **RLS – policies** | `20260222000003_org_id_not_null_rls.sql`, `20260301003000_f2_cba_billing_rls_gating.sql` – policies sobre `org_memberships` i taules tenant | Qualsevol canvi en `is_org_member` / `is_org_owner_or_admin` les afecta; cal definir si usuari `suspended` pot veure l’org (només recuperació) o no. |
| **WorkspaceContext** | `src/contexts/WorkspaceContext.jsx` | Query actual: `org_id, role, created_at, orgs(...)` per `user_id`. Decidir si es filtra per `status IN ('active','invited')` per mostrar orgs on és membre o convidat; triar `activeOrgId` segons regles (p. ex. no triar org on només hi ha invitació pendent si es vol). |
| **BillingLocked / BillingOverSeat** | `src/pages/BillingLocked.jsx`, `src/pages/BillingOverSeat.jsx` | `isOwnerAdmin` basat en `memberships`; si `memberships` inclou `invited`/`suspended`, cal que només `active` doni permisos d’owner/admin (o que suspended no compti com a admin per billing). |
| **Settings – Workspace** | `src/pages/Settings.jsx` | Add member: pot passar a crear fila `status = 'invited'` (email) o `status = 'active'` (user_id directe). Llistat de members: filtrar per status; mostrar invited vs active. Eliminar membre: UPDATE a `removed` o DELETE segons model. |
| **Creació d’org** | `src/lib/workspace/createWorkspace.js` | Mantenir insert amb `role: 'owner'`; nou camp `status = 'active'` (default). |
| **Edge Functions (Stripe)** | `stripe-checkout-session`, `stripe-portal-session`, `stripe_create_portal`, `stripe_create_checkout`, `create_checkout_session` | Comprovar que el rol owner/admin es llegeix de files amb `status = 'active'` (excloure invited/suspended). |
| **Altres referències a org_memberships** | Migracions de backfill, VERIFICATION_queries, D11 billing RLS, F5 quarterly export RPCs, etc. | Revisar que qualsevol count o “és membre” respecti la nova semàntica (active = seient; invited no). |

---

## Implementation roadmap

Fases proposades sense modificar encara la BD ni la UI; només com a pla d’implementació.

| Fase | Abast | Descripció breu |
|------|--------|------------------|
| **S3.2.A – Schema preparation** | BD | Afegir ENUM/tipus i nous camps a `org_memberships` (status, invited_by, invited_at, accepted_at, suspended_at); backfill existents a `status = 'active'`; índex/constraints si cal. |
| **S3.2.B – Seat logic update** | BD + app | Canviar tots els punts que compten seients: trigger `enforce_seat_limit` (COUNT només `status = 'active'`), RPC `org_add_member` si s’usa, `getWorkspaceUsage`, Settings loadWorkspace, BillingOverSeat; assegurar que el límit ve de `billing_org_entitlements` / get_plan_limits on correspongui. |
| **S3.2.C – Invitation system** | BD + backend + RLS | Lògica d’invitació: crear fila amb `status = 'invited'`, `invited_by`, `invited_at`; acceptació (invited → active, `accepted_at`); RLS i helpers actualitzats per que `is_org_member` / accés tenant considerin `invited` i `active` (i suspended) segons regles acordades. |
| **S3.2.D – UI integration** | App | Settings: flux d’afegir per invitació (email) vs afegir directe; llistat members amb estat (invited/active/suspended); accions suspend / reactivate / remove. WorkspaceContext i BillingLocked/BillingOverSeat alineats amb nous estats. Edge Functions Stripe filtrant per `status = 'active'`. |

**Phase status:** S3.2.A aplicada — migració `20260315100000_s3_2a_membership_lifecycle_schema.sql`. S3.2.B aplicada — migració `20260315110000_s3_2b_active_seat_semantics.sql`; usage helpers + UI patches. S3.2.B.2 — migració `20260315120000_s3_2b_2_membership_guards.sql`: `is_org_member` / `is_org_owner_or_admin` només consideren `status = 'active'`.

---

*Document generat per a la fase S3.2 de FREEDOLIAPP.*
