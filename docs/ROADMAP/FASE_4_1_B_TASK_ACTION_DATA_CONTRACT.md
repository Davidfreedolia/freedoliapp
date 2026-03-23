# FASE 4.1.B — TASK/ACTION DATA CONTRACT

This document closes the data-contract decision required before implementation of FASE 4.2. No schema, code, or UI changes are made here; the contract is formalized for use in 4.2.

---

## Purpose

This document closes FASE 4.1.B by formalizing the canonical task/action data contract. It defines the semantic roles of fields, the allowed source set, the minimal future linkage contract, dedupe and tenancy rules, and in-scope use cases. Implementation (schema, services, UI) is deferred to FASE 4.2.

---

## Canonical model decision

- **`tasks`** is the canonical visible operational task model. All user-facing operational tasks (to-dos, action items) that appear in the main task list and calendar are represented in `tasks`. Org scoping and entity association are defined on this table.
- **`project_tasks`** is not the canonical general operational model. It is a separate table used only for blocking/attention semantics (e.g. `useBlockedProjects()`). It is not the single source of truth for “tasks” in the product sense.
- **`project_tasks`** remains legacy / controlled debt / blocking-support only for now. No large refactor or unification with `tasks` is in scope for FASE 4.1; any such work is out of scope for 4.2 as defined by this contract.

---

## Semantic field contract

- **`source`** = operational origin of the task (where the task came from: manual, sticky_note, or in the future alert, decision, gate). It identifies the system or action that caused the task to exist.
- **`entity_type`** = associated navigable entity context (e.g. project, purchase_order, supplier, shipment). It answers “which entity is this task about?” for navigation and for org derivation when applicable. It must not be overloaded to mean “source” or “origin system.”
- **`entity_id`** = associated entity id; the primary key of the entity identified by `entity_type` when present.
- **Future source linkage** must not be inferred from title or notes. Any link from an alert, decision, or gate to a task must be stored in explicit structured fields (e.g. `source_ref_type`, `source_ref_id`), not derived from free text.

---

## Allowed source values for FASE 4 scope

The FASE 4 contract allows the following **source** values:

| Value        | Meaning                    | Status today                          |
|-------------|----------------------------|----------------------------------------|
| `manual`    | User-created task          | Exists in current schema              |
| `sticky_note` | Task created from sticky note | Exists in current schema           |
| `alert`     | Task created from business alert | Contract-approved for 4.2; not in schema yet |
| `decision`  | Task created from decision | Contract-approved for 4.2; not in schema yet |
| `gate`      | Task created from gate (e.g. unblock) | Contract-approved for 4.2; not in schema yet |

- Only **`manual`** and **`sticky_note`** exist today in the current `tasks` schema (per repo: `source` CHECK constraint in bootstrap_dev.sql).
- **`alert`**, **`decision`**, and **`gate`** are contract-approved future values for implementation in 4.2 (schema and logic to be added there).

---

## Minimal future linkage contract

For FASE 4.2, the minimum conceptual linkage fields required to link a task to its origin are:

- **`source_ref_type`** — identifies the kind of origin object (e.g. `alert`, `decision`, `gate`). Enables querying “tasks from this type of origin” and aligns with dedupe by origin.
- **`source_ref_id`** — the id of the origin record (e.g. alert id, decision id, gate/session id). Together with `source_ref_type` and `org_id`, it uniquely identifies the effective origin for dedupe.

**Expected semantics (conceptual examples):**

- **Alert-origin task:** User clicks “Create task” from a business alert. Task gets `source = 'alert'`, `source_ref_type = 'alert'`, `source_ref_id = <alerts.id>`. Optional: `entity_type` / `entity_id` may be set from the alert’s entity when the task is “about” that entity.
- **Decision-origin task:** User creates a task from a decision. Task gets `source = 'decision'`, `source_ref_type = 'decision'`, `source_ref_id = <decision_id or decision_log id as per model>`. Entity fields may reflect the decision context (e.g. project, quote, purchase_order).
- **Gate-origin task:** User creates an “unblock” or gate-related task (e.g. “upgrade to unlock”). Task gets `source = 'gate'`, `source_ref_type = 'gate'`, `source_ref_id = <gate/session or stable gate key>`. Entity may be org or null depending on gate semantics.

No extra optional linkage fields are required by this contract unless 4.2 design strictly needs them. Exact column names, types, and indexes are deferred to 4.2 implementation.

---

## Dedupe rule (conceptual)

- **Duplicate open operational tasks** should not be created for the same effective origin. If a task already exists that is open (or equivalent active status) and has the same effective origin (same `org_id`, same `source`, and same source reference — e.g. same `source_ref_type` and `source_ref_id`), the system should not create a second open task; it should reuse or surface the existing one.
- **Dedupe must be based on source linkage** (e.g. `source` + `source_ref_type` + `source_ref_id` + `org_id`), not on free-text title matching.
- **Exact DB/index implementation** (unique index, partial index, or application-level check) is deferred to 4.2.

---

## Org / tenancy safety rule

- **Task creation** must continue to require either explicit `org_id`, or reliable entity-derived org (e.g. from project when `entity_type = 'project'` and `entity_id` is set), or **fail-fast** (no silent fallback).
- **No first-membership fallback patterns.** Do not infer org from “first org_memberships row” or similar (per S3.2.C).
- **Multi-tenant correctness** remains mandatory: every task must be scoped to an org; RLS and application logic must enforce org boundary.

---

## In-scope use cases for future 4.2

Only these use cases are approved for 4.2 implementation under this contract:

1. **Create task from alert** — User creates a task from a business alert; task is linked to the alert via source + source_ref; dedupe by origin applies.
2. **Create task from decision** — User creates a task from a decision; task is linked to the decision via source + source_ref; dedupe by origin applies.
3. **Create unblock task from gate** — User creates a task from a gate context (e.g. “unblock” or “follow up after gate”); task is linked to the gate via source + source_ref; dedupe by origin applies.

---

## Explicitly out of scope

- **No automatic task generation** in 4.1; 4.1 is documentation/contract only.
- **No scheduler work** in this subphase.
- **No automatic closure/reopen logic** for tasks (e.g. auto-close when alert is resolved) in this contract; can be considered in later phases.
- **No universal operations inbox** in 4.1 or as a 4.2 requirement from this doc.
- **No large refactor of `project_tasks`**; it remains as-is for blocking support.
- **No FASE 5 financial workflow overlap**; this contract does not open or define FASE 5.

---

## Exit criteria for 4.1 closure

FASE 4.1 can be considered **closed** once:

- the canonical model decision is documented (tasks = canonical; project_tasks = legacy/blocking only);
- semantic field roles are documented (source, entity_type, entity_id; no inference from title);
- the approved source set is documented (manual, sticky_note, alert, decision, gate);
- the minimal linkage contract is documented (source_ref_type, source_ref_id; examples for alert, decision, gate);
- the dedupe rule (by source linkage, not title) and tenancy safety rule are documented.

This document (FASE_4_1_B_TASK_ACTION_DATA_CONTRACT.md) satisfies those criteria. FASE 4.1 is closed as documentation/contract only; implementation is 4.2.
