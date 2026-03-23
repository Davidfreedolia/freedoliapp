# FASE 4.3.B — Canonical Task Inbox — Implementation

Implementació acotada. Repo real; tracker: `docs/ROADMAP/IMPLEMENTATION_STATUS.md`.

---

## 1. Què s’ha implementat

- **Surface canònica d’inbox:** Pàgina dedicada `/app/inbox` (`TaskInbox.jsx`) que llegeix `tasks` de l’org actiu amb `getTasks({ org_id: activeOrgId, ... })`. Requereix `activeOrgId`; si no n’hi ha, mostra missatge “Select a workspace”.
- **Filtres mínims:**
  - **Status:** open | done | all (dropdown).
  - **Source:** all | manual | sticky_note | alert | decision | gate (dropdown).
- **Dades mostrades per tasca:** title, status, due_date (amb etiqueta de venciment), entity context (entity_type), **source** (badge visible), priority (si no normal), notes. Accions: Mark done, Snooze +1d / +3d, Open entity. Bulk: selecció múltiple, Mark done i Snooze en massa (reutilitzant `bulkMarkTasksDone`, `bulkSnoozeTasks`).
- **Source visibility:** Cada fila mostra un badge amb l’origen (Manual, Sticky note, Alert, Decision, Gate) segons `task.source`; per defecte “Manual” si `source` és null.
- **Reutilització:** `getTasks`, `markTaskDone`, `snoozeTask`, `bulkMarkTasksDone`, `bulkSnoozeTasks`; cap nova arquitectura paral·lela.
- **Navegació:** Enllaç “View all” al `TasksWidget` del Dashboard cap a `/app/inbox`. Entrada al Sidebar (nav.taskInbox) i ruta a `App.jsx`.
- **Org correctness:**
  - `getTasks` per la inbox sempre rep `org_id: activeOrgId`.
  - `getOpenTasks`: si no es passa `activeOrgId`, retorna `[]` (no retorna tasques de totes les orgs del user).
  - **Diagnostics:** El check de tasks s’omple si no hi ha `activeOrgId` (skip amb WARNING); totes les crides a `getTasks` dins del check passen `{ org_id: activeOrgId }`.
- **Filtre per source a backend:** `getTasks(filters)` accepta `filters.source`; la query a `tasks` afegeix `.eq('source', filters.source)` quan és present. Demo mode: filtre client-side per `source`.

---

## 2. Fitxers modificats / creats

| Fitxer | Canvi |
|--------|--------|
| `src/lib/supabase.js` | Filtre `source` a `getTasks` (query + demo); `getOpenTasks` retorna `[]` si no hi ha `activeOrgId`; query sempre amb `org_id` quan es passa. |
| `src/pages/TaskInbox.jsx` | **Nou.** Pàgina canonical task inbox: filtres status/source, llistat amb source visible, accions i bulk. |
| `src/App.jsx` | Lazy `TaskInbox`; ruta `path="inbox"` dins `/app`. |
| `src/components/Sidebar.jsx` | Entrada “Task Inbox” al grup Operations; prefetch `/inbox`. |
| `src/components/TasksWidget.jsx` | Enllaç “View all” a `/app/inbox` (i18n `tasks.inbox.viewAll`). |
| `src/pages/Diagnostics.jsx` | Skip del check de tasks si `!activeOrgId`; totes les crides `getTasks` amb `{ org_id: activeOrgId }`. |
| `src/i18n/locales/en.json` | `tasks.inbox.*` (title, filters, filterStatus*, filterSource*, source*, empty, openEntity, viewAll); `nav.taskInbox`. |
| `src/i18n/locales/ca.json` | Mateix bloc `tasks.inbox.*` i `nav.taskInbox`. |
| `src/i18n/locales/es.json` | Mateix bloc `tasks.inbox.*` i `nav.taskInbox`. |
| `docs/ROADMAP/FASE_4_3_B_CANONICAL_TASK_INBOX_IMPLEMENTATION.md` | **Nou.** Aquest document. |
| `docs/ROADMAP/IMPLEMENTATION_STATUS.md` | Fila 4.3.B i secció detallada FASE 4.3.B. |

---

## 3. Què queda fora expressament

- No tocar RLS.
- No tocar billing, alerts engine, decisions engine.
- No tocar `project_tasks` (no es mostra a la inbox; no hi ha confusió directa).
- No tocar `/app/calendar`.
- No analytics, comments, assignacions, SLA, histories, automatismes.
- No navegació per `source_ref_type` / `source_ref_id` (només visibilitat de `source`).
- No refactors massius ni canvis visuals grans.

---

## 4. Riscos / controlled debt restant

- **RLS de `tasks`** segueix sent per `user_id`; l’aïllament per org es garanteix a nivell d’app (sempre passar `org_id`). Si alguna crida nova de tasks no passés org, es podria veure dades d’una altra org del mateix user.
- **Calendar.jsx** (getCalendarEvents → getTasks) no està muntat; la pàgina de calendari en ús és CalendarPage (project_events). Deute controlat documentat a 4.3.A.
- **snoozeTask** deixa la tasca en `status: 'open'` (no `snoozed`); el schema ho permet però el comportament no canvia en aquesta fase.
