# FASE 4.3.A — CANONICAL TASK INBOX AUDIT

Auditoria només. No s'ha implementat res. Repo real actual; tracker canònic: `docs/ROADMAP/IMPLEMENTATION_STATUS.md`.

---

## 1. Task data surfaces found

| Fitxer | Funció / component | Què llegeix | Filtra org_id / activeOrgId | Tracta status | Tracta source | Tracta source_ref_* | Reusable per inbox canònica |
|--------|--------------------|-------------|-----------------------------|---------------|---------------|---------------------|------------------------------|
| `src/lib/supabase.js` | `getTasks(filters)` | `tasks` SELECT *; opcional org_id, status, entityType, entityId; order due_date, created_at | Sí, si `filters.org_id` | Sí, si `filters.status` | No (no filtra ni retorna a la UI) | No | Sí, si sempre es passa org_id |
| `src/lib/supabase.js` | `getOpenTasks(limit, activeOrgId)` | `tasks` SELECT *; status='open'; limit; order due_date, priority | Sí, si `activeOrgId` | Fix status=open | No | No | Sí |
| `src/lib/supabase.js` | `findOpenTaskByOrigin(orgId, origin)` | `tasks` SELECT id, title, status, created_at; org_id, source, source_ref_type, source_ref_id; status IN ('open','snoozed') | Sí (orgId) | Sí (open/snoozed) | Sí | Sí | Només per dedupe, no llistat |
| `src/lib/supabase.js` | `getCalendarEvents(filters, orgId)` | Crida `getTasks(taskFilters)` amb orgId; status=open si !showCompleted; filtra client-side showStickyDerived vs source sticky_note | Sí (orgId a taskFilters) | Sí (open o tots) | Sí (client: task.source === 'sticky_note') | No (no exposa a UI) | Parcial (calendar, no llistat inbox) |
| `src/components/TasksSection.jsx` | `loadTasks()` | `getTasks({ entityType, entityId, status: 'open', ...(activeOrgId ? { org_id: activeOrgId } : {}) })` | Sí, si activeOrgId | Fix open | No | No | Sí, però per entitat (PO/projecte), no inbox global |
| `src/components/TasksWidget.jsx` | `loadTasks()` | `getOpenTasks(limit, activeOrgId ?? undefined)` | Sí, si activeOrgId | Fix open | No | No | Sí (és el widget més proper a “inbox” avui) |
| `src/pages/Calendar.jsx` | `loadEvents()` | `getCalendarEvents(filters, activeOrgId ?? undefined)` → getTasks dins | Sí | Via filters.showCompleted | Via showStickyDerived (source) | No | Parcial (vista calendari) |
| `src/modules/projects/phaseGates.js` | `getTasks({ status: 'done', entityType: 'project', entityId: projectId, ...(orgId ? { org_id: orgId } : {}) })` | Tasques DONE de projecte (validació fase) | Sí, si orgId | Fix done | No | No | No (lògica phase gate) |
| `src/pages/Diagnostics.jsx` | diverses | `getTasks(activeOrgId ? { org_id: activeOrgId } : {})` i variants | Sí si activeOrgId; **no** si no hi ha activeOrgId → retorna totes les tasques del user | Sí (status done, etc.) | No | No | No (diagnòstic) |

**Creació / escriptura:** `createTask`, `updateTask`, `deleteTask`, `markTaskDone`, `snoozeTask`, `bulkMarkTasksDone`, `bulkSnoozeTasks`, `createOrGetTaskFromOrigin` — tot a `src/lib/supabase.js`. Cap RPC de tasks a les migracions trobades; tot via client Supabase.

**Resum:** La font canònica de lectura per “llistat operatiu” de tasks és `getTasks` (amb org_id) i `getOpenTasks` (amb activeOrgId). Cap helper llegeix explícitament `source` o `source_ref_type`/`source_ref_id` per a un llistat; només `getCalendarEvents` filtra per `task.source === 'sticky_note'` al client. No hi ha cap “task inbox” únic que aglutini totes les tasques de l’org amb filtre per source/origen.

---

## 2. Current UI surfaces

| Fitxer | Finalitat | Mostra tasks reals? | Principal / secundària | Competeix amb futura inbox? | Duplicació conceptual amb alertes/decisions/gates? |
|--------|-----------|---------------------|-------------------------|-----------------------------|----------------------------------------------------|
| `src/pages/Dashboard.jsx` | Dashboard principal | Sí (via TasksWidget; també “Requereix atenció” blocked + Create unblock task) | Principal | TasksWidget és candidat a ser part d’inbox | Blocked projects són project_tasks, no tasks; “Create unblock task” crea task → no duplicat |
| `src/components/TasksWidget.jsx` | Widget “tasques obertes” (limit 10); Mark done, Snooze, Bulk, Open entity | Sí (`getOpenTasks`) | Principal per tasques | Sí: podria ser la base o una vista d’inbox | No; només tasks |
| `src/components/TasksSection.jsx` | Llista de tasques per entitat (PO o projecte); Add, Done, Snooze, Delete | Sí (`getTasks` per entityType/entityId) | Secundària (contextual a Orders) | No; és per entitat, no inbox global | No |
| `src/pages/Orders.jsx` | Detall PO; inclou TasksSection | Sí (TasksSection amb entityType purchase_order, entityId selectedOrder.id) | Secundària | No | No |
| `src/pages/Calendar.jsx` | Calendari amb getCalendarEvents (tasks + shipments + …); QuickCreateTaskModal | Sí (getCalendarEvents → getTasks) | **No muntat:** App carrega `CalendarPage.jsx`, no `Calendar.jsx`. Aquesta superfície existeix al repo però no es mostra a /app/calendar. | N/A | N/A |
| `src/pages/CalendarPage.jsx` | Calendari muntat a /app/calendar | **No** (usa useProjectCalendarEvents → taula `project_events`, no `tasks`) | Principal (vista calendar) | No mostra tasks | N/A |
| `src/components/QuickCreateTaskModal.jsx` | Crear tasca ràpid (títol, projecte, data, prioritat) | No llegeix; només createTask | Secundària (creació) | No | No |
| `src/components/alerts/BusinessAlertsBadge.jsx` | Drawer alertes; Create task per alerta | No llegeix llistat tasks; crea via createOrGetTaskFromOrigin | Secundària | No; les alertes no són tasques | Crear task des d’alerta uneix els mons; no duplicat |
| `src/components/decisions/DecisionBadge.jsx` / `DecisionDropdown.jsx` | Dropdown decisions; Create task per decisió | No llegeix tasks | Secundària | No | Mateix que alertes |
| `src/pages/BillingOverSeat.jsx` | Gate over-seat; Create unblock task (workspace_gate) | No llegeix tasks | Secundària | No | No |
| `src/features/projectDetail/components/ProjectDetailHeader.jsx` | Capçalera projecte; BLOCKED + blockedReason | No mostra tasks; mostra is_blocked (project_tasks) | Secundària | No; és project_tasks | project_tasks ≠ tasks; no duplicat conceptual |
| Sticky notes (StickyNotesWidget, convertStickyNoteToTask) | Notes → task amb source sticky_note | Tasks apareixen al Calendar si showStickyDerived; no hi ha llistat “sticky-derived tasks” a part | Secundària | No | sticky_note és un source de task; no duplicat |

**Conclusió:** La única “surface” que avui actua com a llistat operatiu global de tasques és **TasksWidget** al Dashboard (getOpenTasks, limit 10, open). **TasksSection** és llistat contextual per PO (Orders). La pàgina de calendari **realment muntada** (CalendarPage) llegeix `project_events`, no `tasks`; per tant el calendari en ús no mostra tasques. El fitxer `Calendar.jsx` (getCalendarEvents → getTasks) existeix però no està en la ruta. No existeix una vista única “inbox” que aglutini totes les tasques de l’org amb filtres per source/origen; les tasques creades des d’alerta/decisió/gate es veuen al TasksWidget; cap UI mostra source/source_ref.

---

## 3. Lifecycle contract actually implemented

- **Status a DB (bootstrap + FASE 4.2):** `status` CHECK: `'open'`, `'done'`, `'snoozed'`. Migració 20260316120000 confirma status per dedupe `IN ('open', 'snoozed')`.
- **Transicions al codi:**
  - **open → done:** `markTaskDone(id)` → updateTask(id, { status: 'done' }).
  - **open → snoozed (implícit):** `snoozeTask(id, days)` → calcula newDueDate, updateTask(id, { status: 'open', due_date: newDueDate }) — el codi posa **open** després de snooze, no `snoozed`; el nom de la funció és “snooze” però el status es manté open.
  - **done / delete:** updateTask (qualsevol camp) i deleteTask; no hi ha “reopen” explícit.
- **Qui crea:** createTask (manual, QuickCreateTaskModal, TasksSection); createOrGetTaskFromOrigin (alerta, decisió, project_gate, workspace_gate). Tots passen activeOrgId o deriven org.
- **Qui actualitza:** updateTask (Calendar drag due_date); markTaskDone; snoozeTask; bulkMarkTasksDone; bulkSnoozeTasks. RLS: policy “Users can manage own tasks” (auth.uid() = user_id) — no es comprova org_id a la policy.
- **Bulk:** bulkMarkTasksDone(taskIds), bulkSnoozeTasks(taskIds) a supabase.js; usats per TasksWidget.
- **Timestamps:** created_at, updated_at, completed_at (camp existent a schema bootstrap); el codi no omple completed_at en markTaskDone (només status 'done').
- **Navegació a origen:** TasksWidget handleOpenEntity per entity_type (project, purchase_order, supplier, shipment). No hi ha navegació per source_ref (alerta, decisió, gate).

**Incertesa:** Si `snoozeTask` hauria de posar status `snoozed` en lloc de `open`; el schema ho permet però el codi deixa `open`.

---

## 4. Legacy / overlap assessment

| Cas | Classificació | Detall |
|-----|----------------|--------|
| `project_tasks` ús únic | **Controlled debt** | useBlockedProjects llegeix project_tasks; Dashboard “Requereix atenció” i Create unblock task (project_gate) es basen en aquesta llista. project_tasks no es mostra com a “tasques” genèriques; es mostra com a “projectes bloquejats”. No hi ha bridging ambigu tasks ↔ project_tasks a la UI. |
| Sticky notes → task | **Acceptable** | convertStickyNoteToTask escriu source='sticky_note'; Calendar pot amagar-les amb showStickyDerived. No conflicte amb inbox; és un origen més. |
| Alertes / decisions / gates creen task | **Acceptable** | Crear task des d’alerta/decisió/gate afegeix una tasca a la mateixa taula tasks; es veu al TasksWidget i Calendar. No hi ha “soroll duplicat” (no es mostren dues cues separades). |
| TasksWidget vs TasksSection vs Calendar | **Controlled debt** | Tres maneres de veure tasques (widget global, per entitat, per data); cap és “la inbox canònica”. Consolidar o etiquetar seria 4.3.B. |
| RLS tasks per user_id | **Risky** | Policy “Users can manage own tasks” (user_id). Si l’app no passa org_id, getTasks retorna totes les tasques del user (totes les orgs). L’app passa org_id a tots els punts “normals”; Diagnostics crida getTasks({}) sense org → possible cross-org en context de diagnòstic. |
| getTasks() sense org_id | **Risky** | phaseGates i getCalendarEvents passen orgId quan el tenen; TasksSection passa activeOrgId “si existeix”. Si activeOrgId és null (e.g. abans de bootstrap workspace), la query no filtra per org → retornaria totes les tasques del user. |
| Cap UI mostra source/source_ref | **Acceptable** | No és legacy; és gap. Per una inbox canònica es podria voler filtrar per source o mostrar “origen”. |
| Calendar.jsx vs CalendarPage | **Controlled debt** | Calendar.jsx (getCalendarEvents → getTasks) no està muntat; /app/calendar carrega CalendarPage (project_events). Codi de “tasks al calendari” existeix però no és la vista en ús. |

**Blockers:** Cap identificat. **Risky:** dependència de passar sempre org_id/activeOrgId a totes les crides; RLS per user_id, no per org.

---

## 5. Multi-tenant safety assessment

- **getTasks:** Filtra per `org_id` només si `filters.org_id` existeix. Quan s’omple des de l’app (TasksSection, getCalendarEvents, phaseGates, Diagnostics amb activeOrgId), org és correcte. **Risc:** crides sense org_id (Diagnostics sense activeOrgId; TasksSection si activeOrgId null) retornen totes les tasques del user (cross-org a nivell de dades retornades).
- **getOpenTasks:** Filtra per org només si `activeOrgId` és passat. TasksWidget passa `activeOrgId ?? undefined` → si null, no filtra.
- **getCalendarEvents:** Passa orgId a taskFilters; si orgId null, getTasks rep {} → mateix risc.
- **createTask:** Exigeix org (payload, activeOrgId o entitat project); fail-fast si no. Correcte.
- **createOrGetTaskFromOrigin / findOpenTaskByOrigin:** Sempre reben activeOrgId; correcte.
- **updateTask / deleteTask:** No reben org; es basen en id. RLS per user_id impedeix modificar tasques d’un altre user; no impedeix modificar tasques d’una altra org del mateix user si policy fos per org (avui no ho és).
- **Derivació d’org:** createTask deriva org de project quan entity_type project + entity_id; createOrGetTaskFromOrigin usa activeOrgId. No hi ha first-membership.
- **Workspace context:** Tots els components que llegeixen tasks obtenen activeOrgId de useApp() o useWorkspace(); no hi ha validació explícita “activeOrgId obligatori” abans de getTasks/getOpenTasks.

**Conclusió:** Org correctness es manté sempre que l’app passi org_id/activeOrgId en totes les crides. Hi ha risc de cross-org si activeOrgId és null en algun context (inicialització, error) o si es crida getTasks/getOpenTasks sense org. RLS actual (user_id) no garanteix aïllament per org; l’aïllament per org és responsabilitat de l’app.

---

## 6. Verdict

- **Existeix una base real per una canonical inbox?** **Sí, parcial.** El **TasksWidget** al Dashboard és la superfície més propera: llegeix `getOpenTasks(limit, activeOrgId)`, mostra tasques open, amb accions Mark done, Snooze, Bulk i navegació per entity. Les tasques creades des d’alerta/decisió/gate hi apareixen perquè totes viuen a `tasks`. El que **no** existeix és: (1) una vista única etiquetada “inbox” o “cua operativa”, (2) filtre per source/origen a la UI, (3) exposició de source/source_ref_type a l’usuari, (4) un sol lloc que aglutini “totes les tasques de l’org” amb opcions de filtre (status, source, entitat). La base de dades i el servei són canònics; la UI està dispersa (widget, secció per entitat, calendar).

---

## 7. Minimum opening for 4.3.B

- **Següent pas mínim correcte (sense implementar):** Definir 4.3.B com a “Canonical task inbox — consolidació i contracte UI”: (1) Formalitzar que la vista “inbox” operativa es construeix sobre `getTasks`/`getOpenTasks` amb `org_id` obligatori i, opcionalment, filtres per status i source. (2) Decidir si la inbox és el TasksWidget actual ampliat (més filtres, source/origen visible), una pàgina dedicada, o una combinació (widget + enllaç “Veure tot” a una pàgina). (3) Assegurar que cap crida de llistat de tasks es faci sense org_id (tancar el risc de cross-org). (4) No reanimar project_tasks com a font principal; no canviar RLS en aquest subbloc tret que es documenti com a decisió explícita.
- **No fer encara:** Refactor massiu de totes les superfícies; unificar Calendar amb inbox; automatismes o nous motors; obrir FASE 5.
