# D57 — Decision Automation

Status: ARCHITECTURE READY  
Phase: D57  
Type: Architecture only  
Implementation status: Not started  
Scope lock: No execution logic in this phase

---

## 1. Objective

Define the architecture for **Decision Automation** in FREEDOLIAPP.

Decision Automation extends Decision System V1 with a controlled path from insight to action:

**decision → proposed action → approval gate → execution**

This phase defines:

- automation principles
- automation levels
- approval-gate model
- automation event flow
- safety constraints
- automation data model

This phase does **not** implement execution.

---

## 2. Current state after D56

Decision System V1 is considered complete and validated.

### Implemented foundation
- **D32 — Decision Engine**
- **D33 — Decision Bridge**
- **D34 — Decision Scheduler**
- **D36 — Decision Inbox**
- **D53 — Decision Notifications**
- **D54 — Decision Dashboard**
- **D55 — Decision Feedback**
- **D56 — Decision Analytics**

### What the system can already do
- generate decisions
- notify sellers
- display operational recommendations
- collect seller feedback
- measure outcomes
- analyze decision performance

### What the system still does not do
- create business actions automatically
- create POs
- execute reorders
- update prices
- send supplier messages
- run autopilot actions

### Architectural implication
Decision System V1 is already a **decision intelligence layer**, but not yet an **action orchestration layer**.

D57 introduces that missing layer without breaking the core rule:

> **The system never executes business actions blindly.**

---

## 3. Automation principles

Decision Automation must follow these principles.

### 3.1 Human control is the default
Automation is allowed only when:
- the action type supports automation
- risk is within allowed thresholds
- the context is still valid
- required approvals are satisfied

### 3.2 Decisions never equal execution
A decision is an analytical recommendation.  
An automation proposal is an operational candidate.  
An execution is a separate audited event.

These three things must remain separate.

### 3.3 Approval gates are first-class architecture
Approval is not a UI checkbox bolted on top later.  
Approval gates are part of the execution model and must be persisted, auditable, and enforceable server-side.

### 3.4 Context freshness is mandatory
No automation proposal may execute if the source context changed materially after proposal generation.

### 3.5 Risk-based automation only
Automation permission depends on:
- decision type
- business impact
- quantity/value
- confidence
- reversibility
- org rule configuration

### 3.6 Tenant safety is non-negotiable
All automation entities must be scoped by `org_id`, follow workspace isolation, and respect the canonical tenant model already defined for FREEDOLIAPP.

### 3.7 Full audit trail
Every proposal, approval, rejection, invalidation, execution, failure, cancellation, and rollback attempt must be auditable. This follows the product's existing direction toward hard auditability and production-safe workflows.

---

## 4. Automation levels

Automation levels define what the system is allowed to do for a given action type.

### Level 0 — Recommendation only
The system:
- generates a decision
- shows recommendation
- may notify the seller

The system does **not** prepare or execute any action.

**Typical use**
- strategic decisions
- sensitive commercial decisions
- low-confidence decisions
- decisions missing complete context

**Example**
- "Reorder SKU A in the next 7 days"
- nothing is prepared

---

### Level 1 — Prepared action
The system:
- creates an automation proposal
- prebuilds the action draft
- calculates payload and parameters
- waits for human approval

The system does **not** execute.

**Typical use**
- draft PO payload
- draft price change plan
- draft liquidation/disposal recommendation
- draft supplier communication template

**Example**
- PO draft prepared for 500 units
- human still has to approve

---

### Level 2 — Execute after approval
The system:
- prepares the action
- collects required approvals
- executes only after approval gate passes
- records execution outcome

**Typical use**
- reorder execution
- approved price updates
- supplier communication
- low-risk operational changes with clear reversibility or bounded impact

**Example**
- approved reorder draft becomes executed PO creation event

---

### Level 3 — Guardrailed automatic execution
The system:
- executes automatically without per-action approval
- only if preconfigured safeguards are satisfied
- only for explicitly allowed action classes
- only within org-configured risk boundaries
- must support immediate invalidation and strong audit

**Typical use**
Only for narrowly bounded, repetitive, reversible, low-risk automations.

**Example candidates**
- internal low-risk status sync
- internal reminder generation
- non-financial operational housekeeping

**Explicit restriction**
For FREEDOLIAPP, **business actions with financial or supplier impact should not start at Level 3**.  
Level 3 exists in the model, but should be initially disabled for:
- PO creation
- reorder execution
- price change
- liquidation/disposal
- supplier messaging

That's where people usually get cute and then cry later.

---

## 5. Approval gates

Approval gates define where human approval is mandatory.

### 5.1 Mandatory human approval categories

#### A. Purchase order creation
Human approval required because it creates supplier-side commercial commitment.

**Mandatory minimum gate:** owner/admin approval

#### B. Reorder execution
Human approval required because inventory, cashflow, and lead-time assumptions may have changed.

**Mandatory minimum gate:** owner/admin approval

#### C. Price changes
Human approval required because pricing affects margin, velocity, and marketplace behavior.

**Mandatory minimum gate:** owner/admin approval

#### D. Disposal / liquidation
Human approval required because it can destroy unit economics and inventory recovery potential.

**Mandatory minimum gate:** owner/admin approval

#### E. Supplier communication
Human approval required because outbound communication is a brand/commercial action.

**Mandatory minimum gate:** owner/admin approval

---

### 5.2 Optional approval categories
Depending on future modules and org policy, approval may also be required for:
- shipment prioritization
- transfer recommendations
- budget reallocations
- ad spend operational changes
- listing suppression actions

---

### 5.3 Approval gate model

Each automation proposal may have one of these gate modes:

**Gate mode 1 — No approval required**  
Allowed only for explicitly safe Level 3 internal automations.

**Gate mode 2 — Single approval**  
One eligible approver is enough.

**Gate mode 3 — Dual approval**  
Two eligible approvers required.

**Gate mode 4 — Role-constrained approval**  
Approval must come from a specific role such as:
- owner
- admin
- finance
- operations lead

**Gate mode 5 — Conditional approval**  
Approval required only if thresholds are exceeded.

Examples:
- reorder value > X EUR
- quantity > Y units
- confidence below threshold
- stockout window < Z days
- supplier is not preferred
- cashflow forecast below safe buffer

---

### 5.4 Approval gate outcome states
An approval gate can resolve to:
- `pending`
- `approved`
- `rejected`
- `expired`
- `invalidated`

---

## 6. Automation event flow

This is the canonical D57 flow.

### 6.1 Stage 1 — Decision created
Decision Engine produces a decision.

Outputs:
- decision record
- decision context
- analytics / inbox / notification surfaces

No automation happens yet.

---

### 6.2 Stage 2 — Automation eligibility evaluation
Automation layer evaluates whether the decision is eligible for automation.

Checks:
- action type supported
- org automation enabled
- automation level allowed
- safety thresholds satisfied
- required context present
- no blocking issues on decision
- no conflicting open proposal already exists

Output:
- `eligible`
- `not_eligible`
- `eligible_with_gate`

---

### 6.3 Stage 3 — Proposal generation
If eligible, the system generates an `automation_proposal`.

Proposal contains:
- target action type
- source decision
- proposed payload
- risk score / risk band
- required approval mode
- validity window
- context snapshot hash/version
- idempotency key / dedupe key

At this stage, nothing is executed.

---

### 6.4 Stage 4 — Proposal review
Proposal is surfaced in the appropriate UI:
- decision inbox
- automation queue
- product/project detail
- approval center
- notification surfaces

Human can:
- approve
- reject
- edit if allowed by action type
- defer
- invalidate manually

---

### 6.5 Stage 5 — Pre-execution revalidation
Before any execution, the system must revalidate that the proposal is still safe.

Mandatory checks:
- proposal not expired
- proposal not invalidated
- decision still open/active if required
- context snapshot still valid
- no stronger contradictory decision exists
- thresholds still pass
- related entities still exist and are accessible
- no execution already completed for the same idempotency key

If revalidation fails:
- proposal becomes `invalidated`
- execution is blocked
- invalidation reason is stored

---

### 6.6 Stage 6 — Execution request
If gates pass and revalidation passes, an execution request is created.

**Important:**  
Execution request is a separate object from proposal.  
This prevents muddying analytical intent with operational outcome.

---

### 6.7 Stage 7 — Execution outcome
Execution produces one of:
- `succeeded`
- `failed`
- `partially_succeeded`
- `canceled`

Outcome must store:
- timestamps
- actor/system source
- payload used
- result references
- error codes/messages
- rollbackability flag
- follow-up actions required

---

### 6.8 Stage 8 — Post-execution linkage
Execution outcome is linked back to:
- decision
- decision events
- analytics
- feedback loop
- affected business entities

This allows D56 analytics to later analyze:
- proposal rate
- approval rate
- execution success rate
- invalidation rate
- rollback rate
- business impact by automation type

---

## 7. Safety constraints

D57 is worthless without hard brakes.

### 7.1 Risk thresholds
Every proposal must carry:
- `risk_score`
- `risk_band` (`low`, `medium`, `high`, `critical`)

Risk must consider:
- monetary exposure
- quantity exposure
- forecast confidence
- reversibility
- time sensitivity
- data freshness
- supplier criticality
- stockout severity
- inventory uncertainty

**Minimum rule**
- `high` or `critical` risk proposals cannot bypass approval
- `critical` risk proposals should not auto-execute at all

---

### 7.2 Maximum automated quantities
For quantity-based actions, the system must support guardrails such as:
- max units per execution
- max EUR value per execution
- max % of recommended quantity auto-approved
- max daily automated exposure per org
- max open proposals per SKU / project / supplier

Example:
- never auto-execute reorder above configured cap
- never prepare reorder above supplier MOQ multiple without explicit review if mismatch exists

---

### 7.3 Rollback logic
Not every action is truly reversible, so rollback must be modeled honestly.

**Rollback states**
- `not_applicable`
- `possible`
- `manual_only`
- `blocked`

**Rules**
- rollback capability must be declared per action type
- rollback request must be auditable
- rollback must never assume external side effects can be undone automatically
- when rollback is not possible, compensating action may be required instead

Example:
- internal status transition might be reversible
- supplier email is not truly reversible
- PO sent to supplier is definitely not magic-eraser territory

---

### 7.4 Context invalidation rules
Proposal must be invalidated if relevant context changes before execution.

Examples of invalidating changes:
- stock level changed materially
- incoming PO status changed
- lead time changed
- supplier changed
- demand forecast changed beyond threshold
- decision superseded by newer decision
- price floor or margin constraint changed
- cashflow safety buffer no longer satisfied
- project/product archived or disabled

Proposal invalidation is not an error.  
It is a safety feature.

---

### 7.5 Idempotency and dedupe
Execution must be protected against duplication.

Required:
- idempotency key per actionable proposal
- dedupe logic against same decision/action target/context
- one successful execution per valid proposal unless explicitly retried via controlled process

---

### 7.6 Time validity
Each proposal must have:
- `valid_from`
- `expires_at`

Expired proposals cannot execute.  
Some decisions age like milk.

---

### 7.7 Permission constraints
Approval and execution must enforce:
- org membership
- role eligibility
- action-specific permissions
- no cross-tenant leakage

This aligns with the existing org-boundary and RLS discipline already defined for FREEDOLIAPP.

---

## 8. Data model

D57 requires a distinct automation layer.

### 8.1 Core entities

#### `automation_rules`
Defines org-level policy and action eligibility.

**Purpose**
- configure automation behavior
- assign automation level by action type
- define thresholds and gate modes
- enable/disable automation types

**Suggested fields**
- `id`
- `org_id`
- `action_type`
- `is_enabled`
- `automation_level`
- `approval_mode`
- `risk_threshold_max`
- `max_units_per_execution`
- `max_value_per_execution`
- `max_daily_exposure`
- `require_fresh_context`
- `allow_auto_execute`
- `valid_from`
- `valid_to`
- `created_at`
- `created_by`
- `updated_at`
- `updated_by`

---

#### `automation_proposals`
Represents a specific proposed action generated from a decision.

**Purpose**
- bridge analytical output and operational action
- persist proposal state
- support review, approval, invalidation, and execution handoff

**Suggested fields**
- `id`
- `org_id`
- `decision_id`
- `decision_event_id` (nullable)
- `action_type`
- `source_entity_type`
- `source_entity_id`
- `target_entity_type`
- `target_entity_id`
- `proposal_status`
- `automation_level`
- `approval_mode`
- `risk_score`
- `risk_band`
- `payload_json`
- `context_snapshot_json`
- `context_hash`
- `idempotency_key`
- `valid_from`
- `expires_at`
- `invalidated_at`
- `invalidation_reason`
- `approved_at`
- `approved_by`
- `rejected_at`
- `rejected_by`
- `created_at`
- `created_by_system`

**Proposal statuses**
- `drafted`
- `pending_approval`
- `approved`
- `rejected`
- `invalidated`
- `expired`
- `queued_for_execution`
- `executed`
- `execution_failed`

---

#### `automation_approvals`
Stores approval events independently.

**Purpose**
- support single or multi-step approval chains
- preserve audit trail
- avoid mutating proposal record as the only source of truth

**Suggested fields**
- `id`
- `org_id`
- `proposal_id`
- `approval_step`
- `required_role`
- `approval_status`
- `acted_at`
- `acted_by`
- `comment`
- `created_at`

**Approval statuses**
- `pending`
- `approved`
- `rejected`
- `expired`
- `skipped`

---

#### `automation_executions`
Represents actual execution attempts.

**Purpose**
- separate proposal from execution
- track outcome, retries, and failures

**Suggested fields**
- `id`
- `org_id`
- `proposal_id`
- `decision_id`
- `action_type`
- `execution_status`
- `execution_mode` (`manual_trigger`, `approved_trigger`, `automatic_trigger`)
- `payload_json`
- `result_json`
- `error_code`
- `error_message`
- `started_at`
- `finished_at`
- `executed_by`
- `executed_by_system`
- `rollback_state`
- `rollback_reference`
- `created_at`

**Execution statuses**
- `queued`
- `running`
- `succeeded`
- `failed`
- `partially_succeeded`
- `canceled`
- `rolled_back`

---

#### `automation_events`
Append-only audit stream for lifecycle tracking.

**Purpose**
- log all meaningful automation state changes
- make investigations and analytics simpler

**Suggested fields**
- `id`
- `org_id`
- `proposal_id`
- `execution_id` (nullable)
- `decision_id` (nullable)
- `event_type`
- `event_payload_json`
- `created_at`
- `actor_type` (`system`, `user`)
- `actor_id`

**Example event types**
- `proposal_created`
- `proposal_blocked`
- `approval_requested`
- `approval_granted`
- `approval_rejected`
- `proposal_invalidated`
- `execution_requested`
- `execution_started`
- `execution_succeeded`
- `execution_failed`
- `rollback_requested`
- `rollback_completed`

---

### 8.2 Relationships

**Decisions**
- one decision can produce zero or many automation proposals
- each proposal belongs to exactly one source decision

**Decision events**
- proposal generation may reference the triggering decision event
- execution outcomes should emit linked decision events for analytics continuity

**Products / projects**
- proposals may target a product, SKU, ASIN, project, or supplier-linked object
- target references must be explicit, not inferred later

**Purchase orders**
- future PO-related automation executions may generate or link to `purchase_orders`
- in D57 this is only modeled, not implemented

**Inventory context**
- proposals for reorder/disposal/transfer must store enough inventory context snapshot to allow later invalidation and audit

---

### 8.3 Multi-tenant requirements
All automation tables must include:
- `org_id`
- RLS by org membership
- no permissive policies
- audit-friendly timestamps and actors

This is mandatory under the canonical FREEDOLIAPP SaaS architecture.

---

### 8.4 State separation rule
Do **not** overload `decisions` table with execution state.

Keep separate:
- decision state
- proposal state
- approval state
- execution state

Mixing them would rot the model fast.

---

## 9. Initial action taxonomy for D57

D57 should define action types now, even if execution is future work.

### Action families

**Inventory / supply**
- `prepare_reorder`
- `execute_reorder`
- `prepare_transfer`
- `prepare_liquidation`
- `prepare_disposal`

**Pricing**
- `prepare_price_change`
- `execute_price_change`

**Supplier operations**
- `prepare_supplier_message`
- `send_supplier_message`

**Internal operations**
- `create_internal_task`
- `schedule_review`
- `raise_priority_flag`

### D57 recommendation
Start future implementation with:
- `prepare_reorder`
- `create_internal_task`
- `schedule_review`

These are cleaner than jumping straight into financial execution.

---

## 10. Non-goals

D57 explicitly does **not** implement:

- real execution engine
- PO creation
- reorder execution
- price updates
- supplier messaging
- liquidation/disposal execution
- external connector side effects
- autopilot mode
- rollback engine
- approval UI implementation
- cron execution logic
- queue workers

Architecture only. No cowboy stuff.

---

## 11. Definition of done

D57 is done when all of the following are documented and frozen:

1. current system state after D56 is validated as the starting point
2. automation principles are clearly defined
3. automation levels are defined and bounded
4. approval gates are defined by action type and risk
5. canonical automation flow is documented
6. safety constraints are documented
7. automation data model is documented
8. relationships with decisions, events, projects, inventory, and POs are documented
9. non-goals are explicitly listed
10. no implementation work is included in this phase

---

## 12. Final architectural decisions (what yes / what no)

### YES
- automation is a separate layer above decisions
- proposals are distinct from decisions
- executions are distinct from proposals
- approval is first-class
- pre-execution revalidation is mandatory
- invalidation on context change is mandatory
- org-level automation rules control behavior
- risk thresholds control eligibility
- full audit trail is required

### NO
- no blind execution
- no financial action without gate model
- no mixing decision analytics state with execution state
- no Level 3 autopilot for sensitive business actions in initial rollout
- no implementation in D57

---

## 13. Recommended implementation order after D57 (for future phase, not now)

When D57 is approved, future implementation should likely follow this order:

1. data model + RLS
2. proposal generation for one safe action type
3. approval workflow
4. invalidation / revalidation
5. execution layer for one bounded action
6. analytics extension

This is noted only to preserve architectural direction.  
It is **not** part of D57 execution scope.
