# D41 — Helper + Virtual Assistant Intake Layer

Status: Draft

---

## 1. Objective

Define the architecture of the **Helper + Virtual Assistant Intake Layer** for FREEDOLIAPP.

Goals:

- Provide a structured way for users to **ask for help**, **pose questions**, or **request actions** through helper/assistant interfaces.
- Capture these interactions in a **traceable, classifiable, and prioritizable** way.
- Prepare future integration paths into **decisions**, **alerts**, or **tasks** without coupling the intake layer to the Decision System.

This document is **architecture-only**: no code or schema changes are introduced in D41.

---

## 2. Why It Is Not Part of the Decision System Overview (D40)

The D32–D40 Decision System focuses on:

- **Engines → Decisions → Inbox → Notifications → Automation → Analytics**.
- System-generated recommendations and operational decisions based on canonical data.

The Helper + Virtual Assistant Intake Layer is different:

- It starts from **user-initiated queries**, not engine outputs.
- It may involve:
  - Conversational helpers.
  - Inline assistants (e.g. “explain this metric”, “help me decide X”).
  - Ad-hoc requests that are **not always operational decisions** (they may be informational, exploratory, or meta-product questions).

Therefore:

- It **interfaces** with the Decision System (e.g. may create decisions or tasks later), but:
  - It is a **separate subsystem**, concerned primarily with **capturing and structuring user intent**, not deciding what to do operationally.

---

## 3. Helper vs Virtual Assistant

D41 distinguishes two related but different concepts:

### 3.1 Helper

Characteristics:

- Contextual, **inline help** in the product:
  - Tooltips.
  - “What is this?” panels.
  - Guided tours or wizards.
- Answers **narrow, UI-adjacent questions**:
  - “What does this metric mean?”
  - “How do I connect Amazon?”
- Typically **stateless** or low-state per interaction.

Primary concerns:

- Accuracy and clarity of explanations.
- Not overwhelming the user with options.

### 3.2 Virtual Assistant

Characteristics:

- A more **conversational interface** (chat-like or panel) that can:
  - Answer questions.
  - Propose actions (e.g. “show me products at risk of stockout”).
  - Navigate or deep-link into parts of the product.
- May maintain **short-term context** across messages.

Primary concerns:

- Correct classification of user intent.
- Safe mapping from natural-language intent to concrete product actions or future decision/task primitives.

---

## 4. Main Use Cases

Examples of user interactions the intake layer should support conceptually:

1. **Explain data / metrics**
   - “What does this profitability metric mean?”
   - “How is time-to-stockout calculated?”

2. **Discover features**
   - “How do I see my decision inbox?”
   - “Where can I connect another Amazon account?”

3. **Operational guidance**
   - “Which products should I reorder this week?”
   - “Show me decisions related to cashflow risk.”

4. **Potential task / decision creation (future)**
   - “Create a reminder to review supplier X next week.”
   - “Flag this product for further research.”

In D41, we only define the **intake and classification architecture**, not the downstream execution.

---

## 5. Intake Flow (User → Intake → Record)

High-level flow of a helper/assistant interaction:

1. **User input**
   - Typed query or interaction in a helper/assistant UI.

2. **Intake Layer**
   - Normalizes input into a **request envelope**:
     - `user_id` (if authenticated).
     - `org_id` (active workspace).
     - `channel` (`helper_inline`, `assistant_chat`, etc.).
     - `context` (page, entity: product/project/decision).
     - `raw_text` (user message).
     - Optional: UI element id / feature area.

3. **Classification & Prioritization (conceptual, see next section)**
   - Determines:
     - `intent_type` (e.g. `question`, `navigation`, `operational_request`).
     - `topic` (e.g. `inventory`, `cashflow`, `decisions`, `billing`).
     - `priority` (low/medium/high) based on context and org state.

4. **Intake Record**
   - Stores the classified request in an **intake log** (conceptual):
     - Allows later audit, analytics, and replay.

5. **Routing (future phases)**
   - Depending on classification, the request may:
     - Be answered directly (helper explanation).
     - Trigger navigation or UI state change.
     - Propose creation of a decision, alert, or task.

In D41, we **do not** implement the intake log or router; we only define their contracts.

---

## 6. Classification and Prioritization Model

### 6.1 Intent Types (conceptual)

Some example intent types:

- `info_explain_metric`
- `info_how_to`
- `navigate_to_feature`
- `query_decision_state` (e.g. “show me open reorder decisions”)
- `request_action` (e.g. “create a reminder / draft PO / etc.”)

The intake layer must:

- Map raw text to an `intent_type` and `topic`.
- Remain **extensible** (new intent types can be added later).

### 6.2 Priority

Priority is not the same as severity, but may be influenced by it.

Examples:

- **High**:
  - User is on a critical screen and asks about stockout or billing failure.
  - The question references high-severity decisions (e.g. “Why is this product at risk?”).
- **Medium**:
  - Operational questions that are time-sensitive but not urgent.
- **Low**:
  - Exploratory questions or documentation-style queries.

In future phases, priority can influence:

- Whether the intake request becomes a task, decision, or is just logged.

---

## 7. Traceability and Logging

The intake layer must be **auditable**:

1. **Intake log (conceptual)**
   - Each interaction is recorded with:
     - `id`
     - `org_id`
     - `user_id` (if available)
     - `channel`
     - `intent_type`, `topic`, `priority`
     - `raw_text`
     - `context` (e.g. page/entity identifiers)
     - `created_at`

2. **Linking to downstream artifacts (future)**

If an intake request leads to:

- A **decision**:
  - The decision record should store a reference to the intake id (e.g. in `decision_sources.source_reference` or future field).
- A **task/alert**:
  - The task/alert row should point back to the intake id.

3. **Privacy & security**

- Any logging must respect:
  - Tenant boundaries.
  - Data protection rules (e.g. not logging sensitive texts if not necessary).

---

## 8. Future Relationship with Decisions / Alerts / Tasks

The intake layer can act as a **front door** for several downstream subsystems:

1. **Decisions**
   - Example:
     - User asks: “Can you watch this product and tell me when it’s at risk of stockout?”
     - Future behavior:
       - Create a **watch rule** and use the Decision Engine to generate decisions when conditions are met.

2. **Alerts**
   - Helper/assistant may:
     - Subscribe the user to certain **alerts**.
     - Future integration with notifications (D37).

3. **Tasks**
   - Some intake requests are better modeled as **tasks**, not decisions:
     - “Remind me to renegotiate with supplier X after Chinese New Year.”
   - Future phases can:
     - Map these to a task system with due dates and assignees.

In D41:

- We only document these paths.
- No new decisions/alerts/tasks are automatically created.

---

## 9. Non-goals (D41)

D41 explicitly **does not**:

- Implement any helper or assistant UI.
- Add conversational AI or LLM-based reasoning.
- Create or modify database tables (intake logs, tasks, etc.).
- Auto-create decisions, alerts, or tasks from intake.
- Implement routing logic to downstream services.

The phase is solely about **defining the intake layer architecture and contracts**.

---

## 10. Definition of Done (D41)

D41 is considered complete when:

- [x] The purpose and separation of the Helper + Virtual Assistant Intake Layer from the Decision System are documented.
- [x] The distinction between **helper** (inline help) and **virtual assistant** (conversational) is clear.
- [x] Main use cases and the **intake flow** from user input to intake record are described.
- [x] A conceptual **classification and prioritization model** is specified.
- [x] Requirements for **traceability and logging** are defined.
- [x] Future relationships with decisions, alerts, and tasks are outlined.
- [x] Non-goals are explicitly frozen to keep D41 architecture-only with no code or schema changes.

---

