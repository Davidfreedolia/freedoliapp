# FASE 4.2 — Task/Action Linkage Implementation

Minimum viable operational linkage so the app can create canonical `tasks` from alerts, decisions, and gate. No automation, no scheduler, no large UI redesign.

## Scope delivered

1. **Create task from alert** — Business alerts drawer: "Create task" per alert; dedupe by origin; entity from alert when present.
2. **Create task from decision** — Decisions dropdown: "Create task" per decision; dedupe by origin.
3. **Create unblock task from gate** — Dashboard "Requereix atenció" (blocked projects): "Create unblock task" per blocked project; `source_ref_type='project_gate'`, `source_ref_id=project:{projectId}`; dedupe by origin. Contract-correct: BillingOverSeat is not a project gate; the action was moved to the real project-gate surface (blocked projects list) in FASE 4.2.A and removed from BillingOverSeat.

## Files created

- `supabase/migrations/20260316120000_f4_2_tasks_source_linkage.sql`
- `docs/ROADMAP/FASE_4_2_TASK_ACTION_LINKAGE_IMPLEMENTATION.md`

## Files modified

- `src/lib/supabase.js` — `findOpenTaskByOrigin`, `createOrGetTaskFromOrigin`
- `src/components/alerts/BusinessAlertsBadge.jsx` — "Create task" on AlertRow; success/error message
- `src/components/decisions/DecisionNotificationItem.jsx` — "Create task" button; layout wrapper
- `src/components/decisions/DecisionDropdown.jsx` — `onCreateTask` prop
- `src/components/decisions/DecisionBadge.jsx` — `handleCreateTask`; pass `onCreateTask` to dropdown
- `src/pages/Dashboard.jsx` — "Create unblock task" per blocked project (project_gate); `handleCreateUnblockTask(project)`, `unblockTaskProjectId` state.
- `src/pages/BillingOverSeat.jsx` — "Create unblock task" with `source_ref_type='workspace_gate'`, `source_ref_id=over_seat:{activeOrgId}` (truthful; not project gate).
- `docs/ROADMAP/IMPLEMENTATION_STATUS.md`

**FASE 4.2.A / finalization:** Project gate use case = Dashboard blocked list only (`project_gate`). BillingOverSeat action re-added with truthful `workspace_gate` typing so it is not a contract mismatch.

## Migration summary

- **20260316120000_f4_2_tasks_source_linkage.sql**
  - Add `source_ref_type text`, `source_ref_id text` (nullable).
  - Expand `source` CHECK to `('manual', 'sticky_note', 'alert', 'decision', 'gate')`.
  - Expand `entity_type` CHECK to include `'org'` (for org-context tasks).
  - Add partial index `idx_tasks_origin_open` on `(org_id, source, source_ref_type, source_ref_id)` WHERE `source_ref_type IS NOT NULL AND source_ref_id IS NOT NULL AND status IN ('open', 'snoozed')` for dedupe lookups.
  - Does not touch `project_tasks`.

## Service/API changes

- **findOpenTaskByOrigin(orgId, { source, source_ref_type, source_ref_id })**  
  Returns existing open or snoozed task for that origin, or null. Used for dedupe.

- **createOrGetTaskFromOrigin(activeOrgId, origin, payload)**  
  If an open task exists for that origin, returns it with `created: false`. Otherwise creates a task with `source`, `source_ref_type`, `source_ref_id` and payload (title, entity_type, entity_id, notes); returns `{ task, created: true }`.  
  Org: from `activeOrgId`; entity fallback `entity_type: 'org'`, `entity_id: activeOrgId`.  
  No first-membership fallback; `createTask` unchanged for existing callers.

## UI changes

- **BusinessAlertsBadge:** Each alert row has "Create task" before Acknowledge/Resolve. On success shows "Task created." or "Task already exists."; on error shows message. Uses alert title and entity_type/entity_id when present.
- **DecisionNotificationItem / DecisionDropdown / DecisionBadge:** Each decision item has "Create task" button. Creates task with title from decision, entity org. No toast in dropdown (minimal); caller can add later.
- **Gate (project_gate) — contract use case:** Dashboard "Requereix atenció — Projectes bloquejats" section: "Create unblock task" button per blocked project. Origin `source='gate'`, `source_ref_type='project_gate'`, `source_ref_id=project:{projectId}`. Toast on success or error. This is the only surface that satisfies the "create unblock task from a TRUE project gate" requirement.
- **BillingOverSeat (workspace_gate) — optional, not project gate:** "Create unblock task" with `source_ref_type='workspace_gate'`, `source_ref_id=over_seat:{activeOrgId}`. Truthful typing; does not count as the project gate use case.

## Dedupe behavior

- Dedupe is by **origin**: same `org_id`, `source`, `source_ref_type`, `source_ref_id`, and status in `('open', 'snoozed')`. No title matching.
- `findOpenTaskByOrigin` does one SELECT; `createOrGetTaskFromOrigin` calls it then either returns existing or calls `createTask` with origin fields.

## Org-safety / tenancy notes

- All three flows require `activeOrgId` (from WorkspaceContext). Task creation uses `createTask`, which requires `org_id` (payload, activeOrgId, or entity-derived) and fails fast otherwise. No first-membership or “first org” inference.

## Tracker/doc updates

- FASE 4.2 marked CLOSED in `IMPLEMENTATION_STATUS.md`. FASE 4 remains OPEN. Brief summary and reference to this doc.

## Remaining controlled debt

- **Decisions:** No toast for "Create task" success in dropdown; user sees no feedback beyond button state. Can be added in a follow-up.
- **Constraint names:** Migration assumes CHECK names `tasks_source_check` and `tasks_entity_type_check`; if bootstrap named them differently, migration may need adjustment.
- **BillingOverSeat:** Has "Create unblock task" with `workspace_gate` (truthful); not counted as project gate. BillingLocked has no task action.
- **project_tasks:** Unchanged; remains legacy/blocking only.
