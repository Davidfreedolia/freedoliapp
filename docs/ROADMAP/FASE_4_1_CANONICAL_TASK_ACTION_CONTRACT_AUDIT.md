# FASE 4.1 — CANONICAL TASK/ACTION CONTRACT AUDIT

Documentació només. Sense implementació. Contracte i direcció per a FASE 4.1 formalitzats abans de treball d’implementació (4.2).

---

## Executive verdict

- **`tasks`** is the canonical visible operational task layer for FASE 4. The app’s task CRUD, calendar, and task UIs operate on `tasks`; org scoping uses `org_id`; entity association uses `entity_type` + `entity_id`.
- **`project_tasks`** is not the canonical general task model. It is a separate table (project-scoped, org-scoped) used today only for blocking/attention semantics (e.g. `useBlockedProjects()`). It is not the single source of truth for “tasks” in the product sense.
- **`project_tasks`** remains legacy / controlled debt / blocking-support only for now. No large refactor of `project_tasks` is in scope for FASE 4.1; any future unification or migration is out of scope.

---

## Current reusable repo state

Findings grounded in the repo:

- **`tasks` CRUD/service layer in `src/lib/supabase.js`:** `getTasks`, `getOpenTasks`, `createTask`, `updateTask`, `deleteTask`, `markTaskDone`, `snoozeTask`; bulk actions; org_id and entity_type/entity_id filters. `createTask` derives `org_id` from payload, `activeOrgId`, or from project when `entity_type === 'project'` and `entity_id` set; fail-fast on missing org context.
- **UI surfaces:** `TasksSection`, `TasksWidget`, `QuickCreateTaskModal` (create with `entity_type: 'project'`), `Calendar` (getCalendarEvents uses getTasks; filters by `showStickyDerived`, passes `source` on events). Dashboard and Orders use these.
- **Sticky note → task precedent:** `convertStickyNoteToTask` in supabase.js inserts into `tasks` with `source: 'sticky_note'`, sets `entity_type`/`entity_id` from sticky note; `sticky_notes.linked_task_id` links back. Calendar and demo filter by `task.source === 'sticky_note'`. This establishes that “source” is used for origin and that a single task table can carry both manual and derived tasks.
- **Alerts surfaces:** FASE 3 business alerts (BusinessAlertsBadge, useBusinessAlerts, alerts table with entity_type/entity_id). No current linkage from alert → task.
- **Decisions surfaces:** DecisionBadge, DecisionDropdown, decision_log / decisions; no current linkage from decision → task.
- **Gate surfaces:** BillingLocked, BillingOverSeat, workspace/seat gates; no task creation from gates today.
- **`useBlockedProjects()`:** Reads `projects` and `project_tasks`; computes “blocked” projects from project_tasks presence/state. Only consumer of `project_tasks` in app code. Relation: blocking/attention list, not the general task list.

---

## Real contract gap

- **`tasks.source` too narrow:** Schema allows only `('manual', 'sticky_note')`. No value for alert-derived, decision-derived, or gate-derived tasks. Extending source (or introducing explicit source linkage) is a contract decision for 4.2, not done in 4.1.
- **No explicit source linkage:** There is no `source_ref_type` / `source_ref_id` (or equivalent) on `tasks`. Sticky-note link is inverse only (`sticky_notes.linked_task_id`). So “where did this task come from?” is not queryable from the task row for alerts, decisions, or gates.
- **No canonical alert → task / decision → task / gate → task linkage:** Today, no automatic or explicit creation of a `tasks` row from an alert, a decision, or a gate. No shared convention for “create a task from this alert/decision/gate” or for storing the back-reference.
- **`entity_type` must remain associated entity semantics, not source semantics:** In the repo, `tasks.entity_type` is used for the navigable entity (project, purchase_order, supplier, shipment) and for org derivation when `entity_type === 'project'`. It should not be overloaded to mean “source system” (e.g. alert, decision). Source and entity are separate concerns; future linkage must use explicit fields for source, not repurpose entity_type.

---

## Canonical contract decision for FASE 4.1

- **`tasks`** = canonical operational task layer. All user-visible “to-do” / action items that live in the main task list and calendar come from `tasks`. No second general-purpose task table is introduced; `project_tasks` stays as blocking-support only.
- **`source`** = operational origin (e.g. manual, sticky_note; future: alert, decision, gate if added in later subphases). Remains a distinct concept from “which entity this task is about.”
- **`entity_type`** = associated navigable entity (project, purchase_order, supplier, shipment, etc.). Used for navigation and for org resolution where applicable. Not repurposed for “source” or “origin system.”
- **Future linkage must be explicit, not inferred from title text.** Any link from alert/decision/gate to a task must be stored in structured fields (e.g. source_ref_type, source_ref_id or extended source + ref id), not inferred from title or notes.
- **Org safety** must continue to follow explicit `org_id` / reliable derivation (e.g. from project when entity_type is project) / fail-fast. No resurrection of first-membership or “first org” inference patterns (per S3.2.C).

---

## Out of scope

- No implementation yet; this is audit and contract documentation only.
- No task auto-creation from alerts, decisions, or gates in 4.1.
- No scheduler work in 4.1.
- No FASE 5 overlap; FASE 5 is not referenced or opened.
- No large refactor of `project_tasks`; it remains as-is for blocking support.
- No universal gate framework in this subphase; gates remain as current surfaces.

---

## Likely impact surface for next subphase

Forward reference only (for 4.2 planning; not implemented here):

- **`tasks` schema:** Possible extension of `source` enum or addition of source reference columns; must stay consistent with entity_type = associated entity.
- **`src/lib/supabase.js`:** Task create/read helpers if new source types or source_ref are added; org and entity semantics unchanged.
- **Alerts UI/actions:** Possible “create task from alert” action; would need explicit source_ref and task creation path.
- **Decisions UI/actions:** Possible “create task from decision” action; same.
- **Project gate surfaces:** Possible “create task from gate” or similar; same.

No code or schema changes in 4.1; the above is for scoping 4.2 only.
