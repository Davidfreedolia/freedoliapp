# D38 — Decision Automation

Status: Draft

---

## 1. Objective

Define the **architecture** for Decision Automation in FREEDOLIAPP.

Goals:

- Describe how certain decisions can move from pure **recommendations** to **assisted actions** or **fully automated actions**.
- Ensure automation is **safe, controlled and auditable** in a multi-tenant SaaS context.
- Define contracts and constraints without implementing any code or schema in this phase.

This phase is **architecture only**: no migrations, no runtime logic, no UI changes.

---

## 2. Current State After D37

By the end of D37, the system has:

- **D29–D31**: Supply, product, and inventory ledger architecture.
- **D32**: Decision Engine:
  - Canonical decision model (`decisions`, `decision_context`, `decision_sources`, `decision_events`).
- **D33**: Decision Bridge:
  - Engines → Decisions integration (Reorder integrated; others planned).
- **D34**: Decision Scheduler:
  - Periodic `syncReorderDecisions` execution via Edge Function & cron.
- **D35**: Decision Inbox model:
  - Lifecycle (`open`, `acknowledged`, `acted`, `dismissed`, `expired`).
- **D36**: Decision Inbox implementation:
  - `/app/decisions` page, service layer, lifecycle actions, dashboard widget.
- **D37**: Decision Notifications:
  - Architectural model for in-app notifications and digest concepts (no implementation).

Current behavior:

- Decisions are generated, persisted, visible, and manageable by the seller.
- Notifications architecture is defined, but **automation does not yet exist**: all actions are manual.

---

## 3. Principles of Safety and Control

Automation must adhere to strict principles:

1. **Explicitness**  
   - No “hidden” automation. Every automated behavior must be explicitly configured and visible in settings.

2. **Tenant isolation**  
   - Automation scope is **per org**. One tenant’s automation cannot affect another.

3. **Least privilege**  
   - Automation executes only actions that are strictly necessary and well-bounded (e.g. creating POs within configured limits).

4. **Determinism & Idempotency**  
   - Automated actions must be deterministic and idempotent wherever possible (e.g. re-running the same automation job does not duplicate side effects).

5. **Auditability**  
   - Every automated action must be traceable to:
     - A specific decision.
     - An automation rule/config.
     - A time and executor identity (system vs user-approved).

6. **Opt-in, not opt-out**  
   - No automation is enabled by default. Orgs must opt-in, and often per decision type.

7. **Graceful degradation**  
   - If automation fails, decisions must remain visible and actionable manually. No silent loss of control.

---

## 4. Recommendation vs Assisted Action vs Full Automation

D38 distinguishes three layers:

### 4.1 Recommendation (existing)

- Already implemented via D32–D36.
- System surfaces a **decision** but does **not** execute any business action:
  - Example: “Reorder required for Product X (200 units)”.
- Seller takes manual action (e.g. creates PO in UI).

### 4.2 Assisted Action

- System prepares or pre-fills actions but requires **explicit seller confirmation** before execution.
  - Examples:
    - Pre-drafted PO for approval.
    - Pre-configured shipment plan pending confirmation.
- Flow:
  - Decision → Assisted proposal (e.g. “Generate PO draft”) → Seller approves/edits → System executes.

### 4.3 Full Automation

- System can **execute actions without per-instance approval**, within clearly defined, org-configured boundaries.
  - Examples:
    - Auto-create replenishment POs under a certain budget.
    - Auto-trigger internal tasks or status changes based on safe rules.
- Flow:
  - Decision → Automation rule matches → System executes action autonomously → Audit trail entry created.

Automation maturity progression:

- Recommendation → Assisted Action → Full Automation.
- D38 defines architecture to support this progression; later phases decide where to start.

---

## 5. Eligible vs Non-eligible Decision Types

### 5.1 Eligible decision types (examples)

Potentially eligible for assisted or full automation, **subject to org configuration**:

- `reorder`:
  - Automating creation of replenishment POs within defined constraints.
- `shipment_planning` (future):
  - Pre-building or triggering shipments when inventory/lead-time rules are met.
- `stock_risk_mitigation`:
  - Internal actions like status flags, internal tasks, or priority re-ranking.

Criteria for eligibility:

- Action is **bounded** (e.g. limited financial exposure, known side effects).
- Dependencies are well-modeled in canonical data (ledger, supply network, product identity).
- Failure modes are understood and can be safely surfaced back as decisions.

### 5.2 Non-eligible decision types (for now)

Decisions that should remain **recommendation-only** in D38 architecture:

- High-risk financial automations:
  - Direct cash movements, payouts, or irreversible financial operations.
- Legal / compliance-sensitive actions:
  - Takedown notices, policy appeals, etc.
- Multi-party actions requiring external approvals.

Rule:

- When in doubt: **stay in recommendation or assisted mode**, not full automation.

---

## 6. Preconditions for Automation

Before any decision can drive automation, D38 requires:

1. **Stable canonical data**  
   - Product identity, inventory, and ledger must be sufficiently accurate for the targeted decision type.

2. **Clear business invariants**  
   - Example for `reorder`:
     - Never exceed configured budget per period.
     - Never break minimum coverage thresholds without explicit override.

3. **Org-level configuration**  
   - Automation features must be explicitly enabled per org, with:
     - Allowed decision types.
     - Budget/limit parameters.
     - Approval requirements.

4. **Monitoring & alerting in place**  
   - Basic observability for automated actions (success/failure counts, alerts for anomalies).

Automation **must not** proceed if preconditions are not met.

---

## 7. Approval Gates

D38 introduces the concept of **approval gates** as architectural building blocks:

### 7.1 Gate types

1. **No gate (pure recommendation)**  
   - Existing behavior: decisions only, no automation.

2. **Single-level approval (assisted)**  
   - Decision proposes an action; a user (e.g. org owner or admin) must approve it.

3. **Multi-level approval (future-compatible)**  
   - Sequence of approvals (e.g. ops + finance) before execution.

### 7.2 Gate configuration

Conceptual configuration per org:

- `automation_rules`:
  - `decision_type`: e.g. `reorder`.
  - `mode`: `recommendation_only | assisted | automated`.
  - `approval_required`: boolean (or role-based).
  - `max_amount` / `max_quantity` / other constraints.

Approval events should:

- Be recorded in `decision_events` or a future dedicated approval table.
- Include actor id, timestamp, and outcome.

---

## 8. Audit Trail

Automation must produce a **complete audit trail** of:

- Decisions → Proposed actions → Executed actions.

Requirements:

1. **Linkage to `decisions`**  
   - Every automated action references a `decision_id` (or set of decisions).

2. **Lifecycle events**  
   - `decision_events` must record:
     - `event_type` such as:
       - `automation_rule_matched`
       - `automation_executed`
       - `automation_failed`
       - `automation_cancelled`
     - `event_data` including:
       - rule identifier.
       - executor (`system` vs specific user approvals).
       - error details, if any.

3. **Execution records (future tables)**  
   - D38 anticipates one or more **execution tables**, for example:
     - `decision_automation_executions`:
       - `id`
       - `org_id`
       - `decision_id`
       - `rule_id`
       - `execution_status` (`pending`, `executed`, `failed`, `cancelled`)
       - `execution_payload` (parameters used)
       - `created_at`, `executed_at`

These tables are **not created** in D38 but are part of the future data model.

---

## 9. Relationship to `decisions` and `decision_events` (and Future Execution Tables)

### 9.1 `decisions`

- Remains the **canonical driver**:
  - Automation rules are evaluated **against decisions** (and their context).
- Automation must **not bypass** decisions:
  - No “naked” automation flows detached from the decision model.

### 9.2 `decision_events`

- Acts as the **time-ordered log** of lifecycle and automation-relevant events.
- Automation may:
  - Consume events to trigger rules.
  - Emit events to record automation activity and outcomes.

### 9.3 Future execution tables

Future phases may introduce:

- `decision_automation_rules`:
  - Stores org-scoped rules and configurations.
- `decision_automation_executions`:
  - Stores individual execution records.

D38 defines the need and shape of these tables but does not create them.

---

## 10. Non-goals (D38)

D38 **does not**:

- Implement any automation logic (no code paths that execute POs, shipments, or financial actions).
- Create database tables or migrations.
- Change existing decision lifecycle states or semantics.
- Introduce new decision types or modify engines.
- Add UI for configuring automation rules (only mentions concepts).
- Implement scheduling for automation beyond what D34 already provides.

The phase is strictly about **architecture, constraints, and contracts**.

---

## 11. Definition of Done (D38)

D38 is considered complete when:

- [x] The distinction between **recommendation**, **assisted action**, and **full automation** is clearly defined.
- [x] Eligible vs non-eligible decision types for automation are described.
- [x] Preconditions and safety principles for automation are documented.
- [x] Approval gate concepts and configuration model are specified.
- [x] Audit trail requirements and relationships to `decisions` and `decision_events` are documented.
- [x] The need and rough structure of future execution tables are described (without implementing them).
- [x] Non-goals are explicitly frozen to keep D38 as **architecture-only**, with no code or schema changes.

---

