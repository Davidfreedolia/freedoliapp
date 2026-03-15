# FASE 3.1 — AUDITORIA RLS I DEFINICIONS

**Data:** 2025-03-13  
**Àmbit:** Només subfase 3.1. Sense implementació (no SQL, no UI, no motor).  
**Font:** Repo actual; migracions `20260302_01`, `20260302100000`, `20260302101500`, `20260302102000`, `20260303160000`; RLS i helpers S3.2.B.2.

---

## 1. Estat actual de `alerts`

### 1.1 Columnes rellevants

| Columna | Tipus | Constraints / notes |
|---------|--------|----------------------|
| `id` | uuid | PK, default gen_random_uuid() |
| `org_id` | uuid | NOT NULL, FK orgs(id) ON DELETE CASCADE |
| `alert_definition_id` | uuid | NOT NULL, FK alert_definitions(id) ON DELETE CASCADE |
| `entity_type` | text | Nullable. F6 usa 'org', 'system'. |
| `entity_id` | uuid | Nullable. F6 usa org_id o NULL. |
| `severity` | text | NOT NULL, CHECK IN ('low', 'medium', 'high', 'critical') |
| `visibility_scope` | text | NOT NULL, CHECK IN ('owner_only', 'admin_owner') |
| `status` | text | NOT NULL, default 'open', CHECK IN ('open', 'acknowledged', 'resolved', 'muted') |
| `title` | text | NOT NULL |
| `message` | text | Nullable |
| `payload` | jsonb | NOT NULL, default '{}' |
| `dedupe_key` | text | NOT NULL. Clau estable per deduplicar. |
| `first_seen_at` | timestamptz | NOT NULL, default now() |
| `last_seen_at` | timestamptz | NOT NULL, default now(). Actualitzable pel trigger / ON CONFLICT DO UPDATE. |
| `acknowledged_at`, `acknowledged_by` | timestamptz, uuid | Nullable |
| `resolved_at`, `resolved_by` | timestamptz, uuid | Nullable |
| `created_at` | timestamptz | NOT NULL, default now() |

No hi ha columna `muted_at`; el mute només canvia `status` a 'muted'.

### 1.2 Constraints rellevants

- **alerts:**  
  - `severity` IN ('low', 'medium', 'high', 'critical').  
  - `visibility_scope` IN ('owner_only', 'admin_owner').  
  - `status` IN ('open', 'acknowledged', 'resolved', 'muted').  
- **Únic parcial (unique index):** `(org_id, dedupe_key)` WHERE `status IN ('open', 'acknowledged')`. Una sola fila open/ack per (org, dedupe_key).

### 1.3 Índexs rellevants

- `idx_alerts_org_status` sobre `(org_id, status)`.
- `idx_alerts_org_severity` sobre `(org_id, severity)`.
- `idx_alerts_dedupe_key_open_ack`: UNIQUE sobre `(org_id, dedupe_key)` WHERE `status IN ('open', 'acknowledged')`.

### 1.4 Què ja serveix tal com està

- Org-scoping (`org_id`), FK a `orgs` i `alert_definitions`.
- Severity i status acotats; `payload` flexible.
- Dedupe garantit per (org_id, dedupe_key) mentre status sigui open o acknowledged.
- Trigger `alerts_safe_update_guard`: només es poden modificar status i camps d’ack/resolve/last_seen; la resta està protegida.
- RPCs acknowledge/resolve/mute comproven existència, estat i visibilitat (owner_only vs admin_owner).

### 1.5 Què és ambigu o perillós

- **F6 i severity:** `run_ops_health_checks()` insereix a `alerts` amb `severity = 'error'` (JOB_FAILURE_SPIKE) i `severity = 'warn'` (RATES_FRESHNESS). La taula `alerts` només admet `('low','medium','high','critical')`. Això viola el CHECK i pot fer fallar l’INSERT en runtime. **Risc:** error en execució de F6 quan aquests checks fallen.
- **Dos policies de SELECT:** Coexistència de `alerts_select_model_c` (Model C: owner_only vs admin_owner) i `alerts_select_org_member` (qualsevol org member). En RLS, múltiples policies FOR SELECT es combinen amb OR; per tant qualsevol membre de l’org pot llegir totes les alertes de l’org. La intenció “Model C” (restringir owner_only a owner) queda debilitada per a la lectura; els RPCs continuen aplicant Model C per a acknowledge/resolve/mute.

---

## 2. Auditoria RLS

### 2.1 Polítiques actuals exactes

- **alerts_select_model_c** (migració `20260302100000`):  
  - FOR SELECT TO authenticated.  
  - USING: `public.is_org_member(org_id)` AND (  
    (visibility_scope = 'owner_only' AND EXISTS (SELECT 1 FROM org_memberships om WHERE om.org_id = alerts.org_id AND om.user_id = auth.uid() AND om.role = 'owner'))  
    OR  
    (visibility_scope = 'admin_owner' AND public.is_org_owner_or_admin(org_id))  
  ).  
  - Nota: no exigeix `org_memberships.status = 'active'` directament; `is_org_member` i `is_org_owner_or_admin` (S3.2.B.2) ja filtren per `status = 'active'`.

- **alerts_select_org_member** (migració `20260302102000`, F4.3):  
  - FOR SELECT TO authenticated.  
  - USING: `public.is_org_member(org_id)`.  
  - Efecte: qualsevol membre actiu de l’org pot SELECT de totes les files d’alerts d’aquesta org.

- **INSERT / UPDATE / DELETE:** Cap policy per a authenticated. Inserció i esborrat només via service role o RPC SECURITY DEFINER; actualització només via RPCs (que respecten el trigger).

### 2.2 Són suficients per alertes de negoci?

**Sí**, amb matisos:

- **Multi-tenant:** Sí. Tot va filtrat per `org_id`; `is_org_member(org_id)` (amb `status = 'active'`) assegura que només membres actius de l’org accedeixin.
- **Model C (owner_only vs admin_owner):** Per a **escriptura** (ack/resolve/mute), els RPCs apliquen correctament owner_only vs admin_owner. Per a **lectura**, la policy `alerts_select_org_member` fa que qualsevol membre actiu vegi totes les alertes; si el producte vol que “owner_only” no es mostri als admins, caldria eliminar o restringir `alerts_select_org_member` (no dins 3.1, només constatar).
- **Seguretat per FASE 3:** Per a F2, O1, S1, O2 tots tenen `default_visibility_scope = 'admin_owner'`. Per tant, amb l’estat actual, owner i admin poden veure i actuar; si es manté la policy org_member, qualsevol membre actiu podria veure també. Això és acceptable per a una V1 “alertes de negoci” sempre que no es creïn alertes owner_only sensibles en 3.2.

### 2.3 Riscos concrets

1. **Duplicitat de policies SELECT:** Model C queda “suavitzat” a la lectura; un membre no owner/admin podria veure alertes que teòricament són admin_owner (perquè la segona policy ho permet). Risc baix si a V1 totes les alertes de negoci són admin_owner.
2. **F6 severity:** Inserts amb 'error'/'warn' fallen contra el CHECK de `alerts`; risc de runtime en F6 (no en RLS).

### 2.4 Cal canvi mínim ara o es pot seguir tal com està?

**Es pot seguir tal com està** per a obrir 3.2, amb dos condicionants:

- **Documentar:** Que la lectura d’alerts avui és “qualsevol org member” gràcies a F4.3, i que els RPCs continuen respectant Model C per accions. Si en el futur es vol estricte “owner_only” a la UI, caldrà revisar la policy `alerts_select_org_member`.
- **F6:** Corregir el mapatge severity F6 → alerts (error → high o critical, warn → medium) en una migració o patch separat; no és bloquejant per 3.2 si el motor 3.2 només usa severity dins ('low','medium','high','critical').

---

## 3. Contaminació amb altres alertes existents

### 3.1 Com conviuen avui alertes ops / shipment / negoci

| Origen | Categoria / code | dedupe_key (patró) | Qui escriu | Qui llegeix |
|--------|-------------------|---------------------|------------|-------------|
| **F6 (ops)** | OPS_HEALTH (category 'ops') | `ops:{CHECK_ID}:{org_id}:{date}` (ex. ops:QUEUE_BACKLOG:uuid:2025-03-13) | run_ops_health_checks() | Qualsevol org member (drawer global si s’afegeix) |
| **Shipment (F4.3)** | SHIPMENT_* (logistics) | Esperat `shipment:{shipment_id}:...` | Cap writer al repo; drawer preparat | ShipmentDetailDrawer (LIKE `shipment:{id}:%`) |
| **Negoci (FASE 3)** | F2, O1, S1, O2 (finance, operations, billing) | No definit encara; ha de ser estable | Motor 3.2 (no implementat) | Bell + drawer 3.4 |

Totes comparteixen la mateixa taula `alerts` i les mateixes policies RLS.

### 3.2 Hi ha risc de barreja?

- **Sí, controlable:** A la mateixa taula hi haurà files amb `alert_definitions.code` OPS_HEALTH, SHIPMENT_*, F2_UNASSIGNED_EXPENSE, etc. La UI (Bell + drawer) pot mostrar tot barrejat si no es filtra.
- **Risc de soroll:** Si el drawer de FASE 3 llista totes les alertes open/ack de l’org, l’usuari veurà també alertes ops (i futurament shipment). No és contaminació de dades, però sí de UX.

### 3.3 Proposta mínima per evitar contaminació a V1

- **Convenció de prefix a `dedupe_key`:**  
  - Ops: `ops:` (ja en ús).  
  - Shipment: `shipment:` (ja esperat al drawer).  
  - Negoci FASE 3: **`biz:`** (nou).  
  Això permet filtrar a la UI per `dedupe_key LIKE 'biz:%'` (o per `alert_definitions.code` IN ('F2_UNASSIGNED_EXPENSE','O1_PROJECT_STUCK_PHASE','S1_SEAT_USAGE_HIGH','O2_PO_NO_LOGISTICS')) per mostrar només alertes de negoci.
- **Opcional:** Filtrar per `alert_definitions.category` (ex. excloure 'ops' i 'logistics' al Bell de negoci). La decisió exacta es deixa per 3.4; el contracte per 3.2 és que el motor de negoci utilitzi un prefix `biz:` al dedupe_key.

---

## 4. Convenció canònica de `dedupe_key`

### 4.1 Format exacte proposat

- **Patró:** `{origin}:{code}:{org_id}:[{entity_ref}]`  
  - `origin`: `biz` per alertes de negoci FASE 3.  
  - `code`: codi de la definició (F2, O1, S1, O2).  
  - `org_id`: uuid de l’org (determinista, tenant-safe).  
  - `entity_ref`: opcional; identificador únic de l’entitat (project_id, expense_id, po_id, etc.) segons el tipus; si és 1 per org (ex. S1), es pot omitir o usar org_id.

- **Regles:**  
  - Tot en minúscules; codis en majúscules tal com estan a `alert_definitions.code`.  
  - Sense espais; separador `:`.  
  - Estable: mateixes entrades semàntiques → mateix dedupe_key.  
  - Org-safe: sempre incloure org_id.  
  - Tipus-safe: un sol format per tipus (F2, O1, S1, O2).

### 4.2 Exemples concrets

| Tipus | dedupe_key (exemple) | Comentari |
|-------|----------------------|-----------|
| **F2** Unassigned expense | `biz:F2_UNASSIGNED_EXPENSE:{org_id}:{expense_id}` | Una alerta per despesa no assignada (entity_id = expense_id). |
| **O1** Project stuck | `biz:O1_PROJECT_STUCK_PHASE:{org_id}:{project_id}` | Una alerta per projecte “stuck” (entity_id = project_id). |
| **S1** Seat usage high | `biz:S1_SEAT_USAGE_HIGH:{org_id}` | Una alerta per org (sense entity_id o entity_id = org_id). |
| **O2** PO no logistics | `biz:O2_PO_NO_LOGISTICS:{org_id}:{po_id}` | Una alerta per PO sense registre logístic (entity_id = po_id). |

Valors reals exemple (org_id i ids en uuid):

- `biz:F2_UNASSIGNED_EXPENSE:a1b2c3d4-e5f6-7890-abcd-ef1234567890:exp-uuid-1234`
- `biz:O1_PROJECT_STUCK_PHASE:a1b2c3d4-e5f6-7890-abcd-ef1234567890:proj-uuid-5678`
- `biz:S1_SEAT_USAGE_HIGH:a1b2c3d4-e5f6-7890-abcd-ef1234567890`
- `biz:O2_PO_NO_LOGISTICS:a1b2c3d4-e5f6-7890-abcd-ef1234567890:po-uuid-9999`

---

## 5. Contracte mínim de definicions per FASE 3

### 5.1 Camps mínims que el motor 3.2 haurà d’omplir

Per cada fila inserida a `alerts` pel motor d’alertes de negoci:

- `org_id`: org en context (obligatori).  
- `alert_definition_id`: id de la fila `alert_definitions` amb code F2_UNASSIGNED_EXPENSE | O1_PROJECT_STUCK_PHASE | S1_SEAT_USAGE_HIGH | O2_PO_NO_LOGISTICS (obtenir per code).  
- `entity_type`: opcional; recomanat 'project' | 'expense' | 'org' | 'purchase_order' segons el tipus.  
- `entity_id`: opcional; uuid de l’entitat (project_id, expense_id, org_id, po_id).  
- `severity`: obligatori; un de 'low' | 'medium' | 'high' | 'critical'; per V1 es pot prendre `alert_definitions.default_severity` (tots són 'high' als seeds).  
- `visibility_scope`: obligatori; un de 'owner_only' | 'admin_owner'; per V1 'admin_owner' (coherent amb seeds).  
- `status`: 'open' per noves.  
- `title`: obligatori; text breu.  
- `message`: opcional; detall.  
- `payload`: jsonb; mínim '{}'; recomanat posar-hi dades útils (ex. project_id, expense_id, percentatge seients).  
- `dedupe_key`: obligatori; segons la convenció de la secció 4 (prefix `biz:`).  
- `first_seen_at`, `last_seen_at`, `created_at`: default now().

### 5.2 Severity mínima suportada

- **Taula:** 'low', 'medium', 'high', 'critical'.  
- **Motor 3.2:** Ha d’usar només aquests quatre valors. Els seeds F2/O1/S1/O2 tenen default_severity 'high'; el motor pot usar default_severity de la definició o assignar en funció de regles (p. ex. S1 medium si >90% i high si 100%).

### 5.3 Status mínim suportat

- **Taula:** 'open', 'acknowledged', 'resolved', 'muted'.  
- **Motor 3.2:** Només insereix noves files amb status 'open'. Les transicions a acknowledged/resolved/muted són via RPCs (o futura auto-resolució).

### 5.4 Quins tipus entren a V1

- **Entren:** F2_UNASSIGNED_EXPENSE, O1_PROJECT_STUCK_PHASE, S1_SEAT_USAGE_HIGH, O2_PO_NO_LOGISTICS (definicions ja presents al seed).  
- **Categories:** finance (F2), operations (O1, O2), billing (S1).

### 5.5 Quins queden fora

- OPS_HEALTH (F6): ja escrit per run_ops_health_checks; no el genera el motor 3.2.  
- SHIPMENT_* (F4.3): logística; fora d’abast del motor 3.2.  
- Nous codis no definits a `alert_definitions` (no afegir nous codes a V1 sense afegir abans la fila a alert_definitions).

---

## 6. Decisió final de subfase 3.1

### READY per passar a 3.2

**Sí**, amb les decisions tancades següents.

### Llista exacta de decisions tancades

1. **RLS:** Es considera suficient per alertes de negoci; no es canvia res a 3.1. `is_org_member` / `is_org_owner_or_admin` ja filtren per `status = 'active'` (S3.2.B.2). Es documenta que la policy `alerts_select_org_member` amplia la lectura a qualsevol org member.
2. **Dedupe_key:** Convenció canònica amb prefix `biz:` i format `biz:{CODE}:{org_id}:[{entity_id}]` (veure secció 4). Estable, determinista, org-safe i tipus-safe.
3. **Contaminació:** Es defineix prefix `biz:` per alertes de negoci; ops manté `ops:` i shipment `shipment:`. La UI de 3.4 podrà filtrar per prefix o per category/code.
4. **Contracte motor 3.2:** Camps mínims, severity dins ('low','medium','high','critical'), status 'open' per noves, tipus V1 = F2, O1, S1, O2; la resta queda fora.
5. **F6 severity:** Es documenta com a risc existent (F6 pot inserir 'error'/'warn'); la correcció es deixa fora de 3.1/3.2 (patch F6 o migració futura). El motor 3.2 no ha d’usar 'error' ni 'warn'.

### Blockers exactes (cap)

- No hi ha blockers que impedeixin començar 3.2 amb aquest contracte.

---

**Fi del document. No s’ha implementat res; tot és auditoria i contracte per a 3.2.**
