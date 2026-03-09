# D58 — Automation Operator UI (Architecture)

Status: Documented (architecture only)  
Phase: D58  
Scope: UI architecture for operators to interact with the automation system (D57). No automation logic implementation.

---

## 1. Objective

D58 exposes the automation system (D57) to operators through a UI surface so they can:

- **review automation proposals** — see what the system has proposed and in what state
- **approve / reject proposals** — act on the approval gate with clear context
- **trigger executions** — run manual execution for queued intents
- **inspect results** — see execution outcomes, result_json, and status
- **diagnose failures** — understand error_message, error_code, and context when executions fail
- **observe system activity** — follow the automation event stream (proposals, approvals, executions)

D58 is **UI architecture only**. It does not implement automation logic; that remains in D57 (backend helpers, tables, events). D58 defines the operator-facing screens, workflows, and permissions so that implementation can follow a single, coherent design.

---

## 2. Current System State (Post D57)

The automation backend is already implemented.

**Existing tables:**

- **automation_rules** — configuration per org and action_type (enabled, level, approval mode, risk limits)
- **automation_proposals** — proposals generated from decisions (status, payload, context, approval state)
- **automation_approvals** — approval steps and who approved/rejected
- **automation_executions** — execution intents and results (queued, running, succeeded, failed)
- **automation_events** — append-only audit stream (proposal_created, approval_granted, execution_requested, etc.)

**The system can already:**

- generate decisions (Decision Engine, D32–D34)
- convert decisions into proposals (D57.2)
- enforce approval gates (D57.3)
- create execution intents (D57.5)
- record execution results and support manual execution (D57.6)

However, there is **no operator interface yet**. Operators cannot see proposals, approve them, trigger executions, or inspect results through the product. D58 defines that interface.

---

## 3. Operator Goals

Operators must be able to:

- **see automation proposals** — list and filter by status, action type, org
- **understand why they exist** — decision context, source entity, risk, rule
- **approve / reject proposals** — with optional comment, respecting approval mode (single/dual/role)
- **see approval chains** — who approved, who rejected, timestamps
- **trigger execution** — for approved, readiness-validated proposals (manual execution D57.6)
- **inspect execution results** — succeeded/failed, result_json, error_message
- **diagnose failures** — error_code, error_message, payload, and link back to decision/proposal
- **observe automation activity** — global or filtered view of automation_events

---

## 4. UI Surfaces

### Automation Inbox

Main operational screen showing proposals.

**Each proposal card must include:**

- **product thumbnail** — visual identifier (e.g. product image or placeholder)
- **action_type** — e.g. create_internal_task, schedule_review, prepare_reorder
- **product identity** — asin, project_id, or other source entity from context
- **risk level** — risk_band / risk_score if present
- **decision source** — decision_id or short summary of why the proposal was created
- **automation progress bar** — pipeline stage: Decision → Proposal → Approval → Execution → Result
- **quick actions** — approve / reject / open (to Proposal Detail)

---

### Proposal Detail

Full context view including:

- **decision context** — decision summary, type, status, relevant entity
- **proposal payload** — payload_json (read-only)
- **rule source** — which automation_rule applies (action_type, level, approval mode)
- **event history** — automation_events for this proposal (proposal_created, approval_requested, etc.)
- **approval panel** — embedded Approval Panel (see below)
- **execution panel** — embedded Execution Panel (see below)
- **operational timeline** — product state timeline (e.g. Supplier → Production → In Transit → …) where relevant

---

### Approval Panel

**Shows:**

- **approval chain** — steps (single/dual/role_constrained), current step, required role
- **who approved** — actor, timestamp
- **who rejected** — actor, timestamp, optional comment
- **approval timestamps** — acted_at per step

**Allows:**

- **approve** — call approveAutomationProposal (D57.3)
- **reject** — call rejectAutomationProposal (D57.3)

---

### Execution Panel

Allows operators to:

- **trigger execution** — call runAutomationExecutionManually (D57.6) when proposal is approved and execution is queued
- **see execution results** — execution_status, result_json, finished_at
- **inspect failures** — error_code, error_message, link to execution record
- **retry execution** — where applicable (e.g. new intent or same execution if supported by policy)

---

### Automation Activity

Global timeline of automation events.

**Shows:**

- **proposal_created**
- **approval_requested**
- **approval_granted**
- **approval_rejected**
- **proposal_approved**
- **proposal_rejected**
- **execution_requested**
- **execution_started**
- **execution_succeeded**
- **execution_failed**
- **proposal_invalidated** / **proposal_readiness_checked** (optional, for diagnosis)

Filterable by org, proposal, execution, event_type, date range.

---

## 5. Timelines

Two different timelines exist.

### Automation Progress (progress bar)

Represents the **automation pipeline stage**:

**Decision → Proposal → Approval → Execution → Result**

- Used in: **Automation Inbox**, **Proposal Detail**
- Purpose: at a glance, show where the proposal is in the automation lifecycle (drafted, pending_approval, approved, queued_for_execution, executed / execution_failed).

---

### Operational Timeline (visual timeline)

Represents **real-world product state** (supply chain / project lifecycle).

**Example stages:**

Supplier → Production → In Transit → Warehouse → Amazon → Completed

**Color gradient:** red → orange → yellow → blue → light green → green

- Used in: **Project cards**, **Shipment views**, **Proposal Detail**
- Purpose: show where the product or project is in the physical/operational world, not the automation pipeline. Complements the automation progress bar.

---

## 6. Operator Workflows

### Reviewing proposals

**Automation Inbox → Proposal Detail → Review context**

Operator opens Inbox, sees proposal cards. Clicks “open” (or card) → Proposal Detail. Reviews decision context, payload, rule, and event history to understand why the proposal exists and whether to approve.

---

### Approval

**Proposal Detail → Approval Panel → Approve / Reject**

From Proposal Detail, operator uses the Approval Panel. Sees approval chain and who has already acted. Clicks Approve or Reject (with optional comment). Backend: approveAutomationProposal / rejectAutomationProposal (D57.3).

---

### Execution

**Approved proposal → Execution Panel → Trigger execution**

When proposal is approved and (after D57.5) an execution intent exists in state queued, operator opens Execution Panel and triggers execution. Backend: runAutomationExecutionManually (D57.6). Panel then shows execution_status, result_json or error_message.

---

### Failure diagnosis

**Execution Panel → inspect error_message / result_json**

When execution has failed, operator stays in Execution Panel (or Proposal Detail) and inspects error_message, error_code, result_json, and related events to diagnose. No new UI surface required beyond Execution Panel and Automation Activity.

---

## 7. Permissions Model

**Roles:**

- **owner**
- **admin**
- **member**

**Permissions:**

| Action | Owner | Admin | Member |
|--------|-------|-------|--------|
| View proposals | ✔ | ✔ | ✔ |
| Approve proposals | ✔ | ✔ | ✖ |
| Reject proposals | ✔ | ✔ | ✖ |
| Trigger execution | ✔ | ✔ | ✖ |
| Retry execution | ✔ | ✔ | ✖ |
| View automation activity | ✔ | ✔ | ✔ |

**Execution allowed only when:** `proposal.status = approved` (and, per D57.6, execution exists and is queued, readiness is ready, action_type is allowed for manual execution).

---

## 8. Observability

Operators must be able to see:

- **automation activity** — event stream (Automation Activity UI)
- **failed executions** — list or filter by execution_status = failed, with error_message
- **blocked proposals** — proposals that did not pass readiness or are blocked by approval
- **duplicate prevention** — where relevant, indication that an active execution already exists for a proposal (D57.5 dedupe)
- **pipeline health** — high-level sense of how many proposals are in each stage (drafted, pending_approval, approved, queued, executed, failed) — can be reflected in Inbox filters and counts

---

## 9. Non-Goals

D58 does NOT implement:

- **autopilot automation** — no automatic execution without operator action in this phase
- **cron workers** — no new schedulers or queue runners
- **execution queues** — no queue UI or queue processing logic
- **reorder automation** — no PO creation, no supplier messaging, no price updates in UI scope (backend may exist in other phases)
- **supplier messaging**
- **price updates**
- **analytics dashboards** — no new analytics or KPIs
- **notification systems** — no new notification channels or triggers

D58 is UI architecture and, when implemented, UI only. Backend behaviour remains as in D57.

---

## 10. Definition of Done

D58 is complete when:

- **Automation Inbox UI** defined (cards, progress bar, quick actions)
- **Proposal Detail** defined (context, payload, rule, events, approval panel, execution panel, operational timeline)
- **Approval UI** defined (Approval Panel: chain, approve/reject)
- **Execution UI** defined (Execution Panel: trigger, results, failures, retry)
- **Observability UI** defined (Automation Activity, failed executions, blocked proposals, pipeline health)
- **Permissions** defined (owner/admin/member matrix)
- **Timelines** defined (Automation Progress bar, Operational Timeline)
- **Architecture documented** (this document)

**No implementation yet.** This is the architecture and specification for the Automation Operator UI; implementation is a subsequent step.
