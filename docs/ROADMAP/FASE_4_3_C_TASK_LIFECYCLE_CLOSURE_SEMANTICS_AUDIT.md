# FASE 4.3.C — TASK LIFECYCLE / CLOSURE SEMANTICS AUDIT

Auditoria només. No s'ha implementat res. Repo real; tracker: `docs/ROADMAP/IMPLEMENTATION_STATUS.md`.

---

## 1. Status contract actually present

| Origen | Valors admesos | Fitxer / objecte |
|--------|----------------|------------------|
| **DB schema** | `status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'done', 'snoozed'))` | `supabase/migrations/bootstrap_dev.sql` (taula `tasks`, línia ~1077) |
| **Índex dedupe FASE 4.2** | Partial index inclou files amb `status IN ('open', 'snoozed')` | `supabase/migrations/20260316120000_f4_2_tasks_source_linkage.sql` (idx_tasks_origin_open) |
| **Helpers** | `getTasks`: accepta qualsevol `filters.status` (passat a la query). `getOpenTasks`: fix `status = 'open'`. `findOpenTaskByOrigin`: `.in('status', ['open', 'snoozed'])`. | `src/lib/supabase.js` |
| **Transicions** | `markTaskDone`: escriu `status: 'done'`. `snoozeTask`: escriu `status: 'open'` (i due_date). `bulkMarkTasksDone`: escriu `status: 'done'`. `bulkSnoozeTasks`: escriu `status: 'open'`. Cap codi escriu `'snoozed'`. | `src/lib/supabase.js` |
| **Creació** | `createTask`: no imposa status; el payload pot portar `status: 'open'` (QuickCreateTaskModal, TasksSection, Diagnostics). DB default = `'open'`. `createOrGetTaskFromOrigin`: no envia status → default open. | `src/lib/supabase.js`, callers |
| **UI (TaskInbox)** | Filtre: open / done / all. Mostra `task.status` en badge (valor literal). Accions (Mark done, Snooze) només per `task.status === 'open'`. | `src/pages/TaskInbox.jsx` |
| **UI (TasksWidget)** | Sempre llista “open” (getOpenTasks). Mostra tasques i accions Mark done / Snooze. | `src/components/TasksWidget.jsx` |
| **UI (TasksSection)** | Llegeix amb `status: 'open'`. Crea amb `status: 'open'`. | `src/components/TasksSection.jsx` |
| **Phase gates** | Llegeix `getTasks({ status: 'done', entityType: 'project', entityId, org_id })`. | `src/modules/projects/phaseGates.js` |
| **Calendar** | `getCalendarEvents`: si `!filters.showCompleted` → `taskFilters.status = 'open'`. | `src/lib/supabase.js` getCalendarEvents |
| **Diagnostics** | Crea tasca amb `status: 'open'`; marca done amb `updateTask(..., { status: 'done' })`; llegeix amb `status: 'done'` i `org_id`. | `src/pages/Diagnostics.jsx` |

**Coherència:** El schema i l’índex de dedupe admeten **open, done, snoozed**. Tota l’app només escriu **open** i **done**. **snoozed** no s’escriu en cap camí; només es llegeix a `findOpenTaskByOrigin` (i teòricament a l’índex). Hi ha **divergència**: schema/índex inclouen `snoozed`, però cap mutació el fa servir.

**completed_at:** La taula `tasks` té columna `completed_at timestamptz` (bootstrap_dev.sql). Cap helper ni UI l’omple en marcar una tasca com a feta; `markTaskDone` i `bulkMarkTasksDone` només posen `status: 'done'`. És **deute controlat**: el camp existeix però no forma part del contracte de tancament actual.

---

## 2. Real transitions implemented

| Transició | Qui la dispara | Camp(s) modificats | Abans → Després | due_date | Timestamps | Linkage origen |
|-----------|----------------|--------------------|-----------------|----------|------------|----------------|
| **Create** | createTask, createOrGetTaskFromOrigin; QuickCreateTaskModal, TasksSection, convertStickyNoteToTask, create from alert/decision/gate | insert: title, notes, due_date, priority, status (open), entity_*, source, source_ref_*, user_id, org_id | — → open | opcional | created_at, updated_at (default) | es conserva |
| **Mark done** | markTaskDone(id) | status | open (o snoozed) → done | no | no (updateTask no toca updated_at explícitament aquí) | no es toca |
| **Bulk mark done** | bulkMarkTasksDone(taskIds) | status, updated_at | open/snoozed → done | no | updated_at = now() | no |
| **Snooze** | snoozeTask(id, days) | status, due_date | qualsevol → **open** (no snoozed) | sí (nou due_date) | no | no |
| **Bulk snooze** | bulkSnoozeTasks(taskIds, days) | due_date, status, updated_at | qualsevol → **open** | sí | updated_at | no |
| **Delete** | deleteTask(id) | — | fila eliminada | — | — | — |
| **Update genèric** | updateTask(id, updates) | qualsevol camp (excepte user_id) | depèn de payload | si es passa | si es passa | no |
| **Reopen** | No existeix | — | — | — | — | — |

**Coherència:** Les transicions reals són create → open; open → done (mark done / bulk); open → open amb nova due_date (snooze); delete. No hi ha transició done → open (reopen). Snooze es representa com a “open + nova data”, no com a estat `snoozed`.

---

## 3. Snoozed assessment

| Àmbit | Present? | Detall |
|-------|----------|--------|
| **Schema** | Sí | `CHECK (status IN ('open', 'done', 'snoozed'))` a bootstrap_dev.sql. |
| **Queries** | Sí (lectura) | `findOpenTaskByOrigin` filtra `.in('status', ['open', 'snoozed'])`. Cap altre getTasks/getOpenTasks usa snoozed. |
| **UI** | Implícit | TaskInbox mostra el valor literal de `task.status`; si existís snoozed es veuria “snoozed”. El filtre de status només té open / done / all (no “snoozed”). |
| **Índex / dedupe** | Sí | idx_tasks_origin_open: `WHERE ... status IN ('open', 'snoozed')`. La dedupe per origen considera open i snoozed com a “actius”. |
| **Accions / mutacions** | No | Cap funció fa `status: 'snoozed'`. snoozeTask i bulkSnoozeTasks posen `status: 'open'`. |
| **Conclusió** | **Status mort (deute controlat)** | `snoozed` és vàlid al schema i s’usa en l’índex i en findOpenTaskByOrigin, però cap flux el genera. Semànticament “snooze” avui = open + due_date endarrerida. No és risc operatiu directe (no es creen tasques snoozed), però la contracte queda brut: el schema i la dedupe fan referència a un estat que l’app no utilitza. |

---

## 4. Status-dependent reads

| Superfície | Fitxer | Status utilitzats | Considera snoozed? | Considera done? | “Open” com a calaix? | Impacte funcional |
|------------|--------|-------------------|---------------------|-----------------|----------------------|-------------------|
| **Task Inbox** | TaskInbox.jsx | Filtre: open, done, all (getTasks) | No (no filtre snoozed; si n’hi hagués, només a “all”) | Sí (filtre done) | No; open és explícit | Correcte per a open/done; snoozed no té filtre propi. |
| **TasksWidget** | TasksWidget.jsx | getOpenTasks → status = open | No | No | Open és únic | Només tasques open. |
| **TasksSection** | TasksSection.jsx | getTasks(..., status: 'open') | No | No | Open explícit | Llista tasques open per entitat. |
| **Phase gates** | phaseGates.js | getTasks({ status: 'done', ... }) | No | Sí | No | Comprova tasques “done” de projecte. |
| **getCalendarEvents** | supabase.js | taskFilters.status = 'open' si !showCompleted | No | Implícit (showCompleted inclou totes) | Open quan no completed | Calendar: open vs totes. |
| **findOpenTaskByOrigin** | supabase.js | .in('status', ['open', 'snoozed']) | Sí | No | Open + snoozed com a “actius” | Dedupe: no es crea una segona tasca open/snoozed per mateix origen. |
| **Diagnostics** | Diagnostics.jsx | getTasks(org_id, status: 'done') per verificar mark done | No | Sí | No | Coherent. |

**Resum:** Cap lectura fa servir “open” com a calaix de sastre per altres estats; open i done estan ben delimitats. `snoozed` només apareix a findOpenTaskByOrigin i a l’índex; cap llistat (inbox, widget, section, calendar) filtra per snoozed perquè no n’hi ha.

---

## 5. Dedupe / lifecycle interaction

- **Dedupe:** L’índex parcial idx_tasks_origin_open restringeix a `status IN ('open', 'snoozed')`. findOpenTaskByOrigin busca una tasca amb mateix (org_id, source, source_ref_type, source_ref_id) i status open o snoozed. createOrGetTaskFromOrigin retorna aquesta tasca si existeix; si no, en crea una de nova.
- **Quan una tasca origin-linked es marca done:** status passa a 'done'. La fila deixa de complir la condició de l’índex (ja no és open ni snoozed). findOpenTaskByOrigin no la trobarà. Una crida posterior a createOrGetTaskFromOrigin pot crear una **nova** tasca open per al mateix origen. Això és coherent: la primera queda tancada; la segona és una nova acció oberta. No hi ha bloqueig incorrecte de recreació.
- **Snooze amb status open:** snoozeTask posa status = 'open' i nova due_date. La tasca segueix dins de l’índex i de findOpenTaskByOrigin. No es pot crear una segona tasca per al mateix origen mentre segueixi open. Coherent.
- **Risc de duplicació falsa:** No. La constraint/índex i la lògica d’app coincideixen: una sola tasca “activa” (open o snoozed) per origen. Com que snoozed no s’escriu, en la pràctica només open participa.
- **Incoherència:** L’única és que el schema i l’índex reserven `snoozed` però cap flux l’assigna; la semàntica real de “snooze” és open + due_date. No trenca dedupe ni crea duplicats.

---

## 6. UI semantics assessment

- **Inbox (filtres):** L’usuari veu “Open”, “Done”, “All”. El sistema interpreta open = status open, done = status done, all = sense filtre. No hi ha opció “Snoozed”; si existissin tasques snoozed, només apareixerien a “All” i es mostrarien amb badge “snoozed” però sense botons Mark done / Snooze (reservats a `task.status === 'open'`). Com que no n’hi ha, el comportament actual és consistent.
- **Snooze visual:** En fer Snooze, la tasca segueix a la llista (perquè continua open) i canvia la data de venciment. L’usuari pot interpretar-ho com “he ajornat la tasca” (correcte); no veu un canvi d’estat a “snoozed” perquè el sistema no el fa servir.
- **Badges / comptadors:** TaskInbox mostra el valor literal de `task.status` (open / done; teòricament snoozed). TasksWidget no mostra status (només open). No hi ha comptadors que barregin estats de forma incorrecta.
- **Conclusió:** La UI reflecteix el que fa el sistema (open/done; snooze = open + nova data). La semàntica “snoozed” no es comunica perquè no s’usa; no hi ha contradicció evident, però tampoc hi ha contracte fi explícit de lifecycle a la UI.

---

## 7. Multi-tenant safety check (lifecycle paths)

- **createTask / createOrGetTaskFromOrigin:** Requereixen org (activeOrgId o derivat); fail-fast si falta. Correcte.
- **updateTask / deleteTask / markTaskDone / snoozeTask:** Operen per `id`; no reben org_id. La RLS de `tasks` és `auth.uid() = user_id`, de manera que un usuari només pot modificar les seves tasques. Les llistes (inbox, widget, section) es construeixen amb getTasks/getOpenTasks filtrats per org_id, de manera que en context normal l’usuari només veu tasques de l’org actiu. En teoria, si el mateix usuari té tasques en més d’un org, podria obrir una tasca (per URL o historial) i marcar-la feta des d’un context d’un altre org; seria un tema d’UX/consistència, no de filtrat per org a nivell de RLS. No s’ha detectat cap camí de lifecycle que permeti operar tasques d’un altre usuari.
- **bulkMarkTasksDone / bulkSnoozeTasks:** Reben llistes d’ids; RLS limita per user_id. Les IDs només arriben de llistats ja filtrats per org (inbox, widget). Correcte.
- **Lectures:** getTasks/getOpenTasks amb org_id a totes les superfícies d’inbox i widget (4.3.B i patch Diagnostics). Phase gates i getCalendarEvents passen org_id. No s’ha vist cap lectura de lifecycle que perdi l’scope d’org.

**Veredicte:** Els camins de lifecycle (create, update, delete, mark done, snooze) respecten tenancy via RLS (user_id) i via org_id en les lectures que alimenten la UI. No s’identifica risc addicional específic del lifecycle.

---

## 8. Verdict

- **Contracte acceptable tal com està?** **Parcialment.** Open i done estan ben definits i coherents entre schema, helpers i UI. El problema és **snoozed**: existeix al schema i a la dedupe però cap codi el fa servir; “snooze” és open + due_date. Això és **deute controlat**, no un bug: no genera duplicats ni bloquejos incorrectes, però el contracte de lifecycle no és net (estat reservat sense ús).
- **Cal un subbloc de “lifecycle semantics cleanup”?** **Recomanable però no urgent.** Un subbloc podria: (1) decidir si “snoozed” s’ha d’usar (snoozeTask → status 'snoozed') o si s’ha d’eliminar del schema/índex i deixar només open/done; (2) opcionalment omplir `completed_at` en mark done per a traçabilitat. No cal obrir-lo per seguretat ni per correcció de dades; és neteja de contracte i claredat.

---

## 9. Minimum opening for next subblock

- **Següent pas mínim correcte (sense implementar):** Definir 4.3.D (o equivalent) com a **“Task lifecycle semantics cleanup”** amb abast mínim: (1) Documentar la decisió sobre `snoozed` (usar-lo amb snoozeTask → status 'snoozed' i adaptar getOpenTasks/filtres si cal, o eliminar-lo del CHECK i de l’índex i deixar només open/done); (2) si es manté snoozed, assegurar que cap lectura que hagi de considerar “tasques actives” exclogui snoozed on correspongui (getOpenTasks, filtres inbox). Opcional: (3) omplir completed_at en mark done. No canviar RLS; no obrir FASE 5; no refactors amplis.
- **No fer encara:** Implementar canvis de schema o de helpers; no assumir que “snoozed” ha d’existir o desaparèixer sense documentar la decisió.
