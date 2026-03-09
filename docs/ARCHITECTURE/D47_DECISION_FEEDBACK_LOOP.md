# D47 — Decision Feedback Loop

Status: Draft

---

## 1. Objective

Define the **Decision Feedback Loop** architecture for FREEDOLIAPP.

Goals:

- Capture **explicit seller feedback** on decisions:
  - “Useful”, “Not useful”, “Wrong”, etc.
- Integrate feedback collection into:
  - **Decision Inbox** (operational surface).
  - **Decision Dashboard** (analytics surface).
- Store feedback in a way that:
  - Is **traceable** and **multi-tenant safe**.
  - Can be used by **analytics (D39)** and future **engine improvements**.

This document is **architecture only**: no code or schema is implemented in D47.

---

## 2. Feedback Types and Signals

The feedback loop focuses on **simple, interpretable signals**:

### 2.1 Per-decision feedback

For each decision, sellers should be able to indicate:

- **useful**:
  - “This recommendation is helpful / correct.”
- **not_useful**:
  - “This recommendation doesn’t help me.”
- **wrong**:
  - “This recommendation is incorrect / based on wrong assumptions.”

Optional extensions (future):

- **missing_context**:
  - “I need more information to act.”
- **too_late**:
  - “This arrived after I already acted.”

### 2.2 Implicit signals (conceptual)

Beyond explicit buttons, D47 notes the existence of **implicit signals**:

- Decisions that are **acted on quickly** → positive implicit signal.
- Decisions that are **dismissed immediately** or consistently ignored → negative implicit signal.

These signals already exist in `decisions` and `decision_events` and can be combined with explicit feedback.

---

## 3. Interaction Points (Inbox & Dashboard)

### 3.1 Decision Inbox

Primary feedback touchpoints:

- **Decision detail view**:
  - After reading a decision, the seller can mark:
    - “Was this useful?” → Yes / No / Wrong.
- **Post-action micro-feedback**:
  - After “Mark as done” or “Dismiss”, optionally:
    - “How was this recommendation?” → optional quick response.

UX emphasis:

- Feedback should be:
  - **Low-friction**.
  - **Optional**, not blocking workflows.

### 3.2 Decision Dashboard

Feedback-oriented views:

- Aggregated metrics showing:
  - % of decisions marked as useful/not useful/wrong.
  - Per decision_type or per engine.
- Drill-downs:
  - Clicking into segments (e.g. “Wrong reorder decisions”) navigates to Inbox filtered view.

Dashboard itself does **not** collect per-decision feedback, but:

- Can surface patterns and allow orgs to adjust preferences or thresholds.

---

## 4. Recording Feedback Signals

D47 proposes a conceptual way to record feedback without altering existing semantics:

### 4.1 Using `decision_events`

Extend the use of `decision_events` to capture explicit feedback:

- `event_type` values:
  - `feedback_useful`
  - `feedback_not_useful`
  - `feedback_wrong`
- `event_data` fields:
  - `actor_type` (`user`)
  - `actor_id` (user id)
  - `feedback_value` (`useful` / `not_useful` / `wrong`)
  - `reason` (optional free text or code)

Benefits:

- Reuses the existing event log for:
  - Analytics (D39).
  - Traceability & audit.
- Feedback is naturally tied to:
  - `decision_id`
  - `org_id`

### 4.2 Optional dedicated feedback view (future)

In later phases, a dedicated projection/table (e.g. `decision_feedback_summary`) could:

- Aggregate counts per:
  - `decision_id`, `decision_type`, `source_engine`, etc.
- Cache results for analytics without scanning all events.

D47 only defines these **concepts**, not actual tables.

---

## 5. Relation to Analytics (D39)

Decision Feedback is a **first-class input** for analytics:

### 5.1 Per decision_type / engine metrics

For each `decision_type` or `source_engine`:

- Compute:
  - **Feedback useful rate**:
    - `#feedback_useful / (#feedback_useful + #feedback_not_useful + #feedback_wrong)`
  - **Wrong rate**:
    - `#feedback_wrong / total_feedback`.

Use cases:

- Identify decision types/engines that:
  - Perform well (high useful rate).
  - Require refinement (high wrong/not_useful rate).

### 5.2 Correlating feedback with outcomes

Combine explicit feedback with lifecycle outcomes:

- For example:
  - Are “useful” decisions:
    - Acted on more often?
    - Closed faster?
  - Are “wrong” decisions:
    - Strongly correlated with quick dismissals?

These analyses feed back into:

- Engine improvement roadmap.
- Threshold tuning and rule adjustments.

---

## 6. How Feedback Improves Engines (Conceptual Loop)

Feedback loop stages:

1. **Decision generation** (engines + Decision Bridge).
2. **Seller interaction** (Inbox / Dashboard).
3. **Feedback collection**:
   - Explicit via buttons.
   - Implicit via lifecycle patterns.
4. **Feedback aggregation** (analytics).
5. **Engine improvement** (human-in-the-loop):
   - Product/engineering teams:
     - Analyze which rules/features are underperforming.
     - Adjust engine logic and thresholds.
   - Over time, decisions become:
     - More accurate.
     - Less noisy.

Important:

- D47 assumes **human-driven iteration**.
- Automated retraining or auto-tuning is **not** introduced in this phase.

---

## 7. Non-goals (D47)

D47 does **not**:

- Implement UI for feedback buttons or flows.
- Change engine logic based on feedback in an automated way.
- Add new tables or migrations (all recording is conceptual via `decision_events`).
- Define complex ML models or learning systems.

It only defines:

- How feedback should conceptually be **captured, represented, and used**.

---

## 8. Definition of Done (D47)

D47 is considered complete when:

- [x] The objective of the Decision Feedback Loop is defined.
- [x] Feedback types and expected signals (useful / not useful / wrong) are documented.
- [x] Interaction points in Inbox and Dashboard are described.
- [x] A conceptual model for recording feedback via `decision_events` is specified.
- [x] The relationship between feedback, analytics (D39), and future engine improvements is outlined.
- [x] Non-goals are clearly stated to keep D47 architecture-only.

---

