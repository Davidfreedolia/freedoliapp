# Assistant / Copilot — FREEDOLIAPP

**Status:** Canonical **in-app product role** defined in this document (documentation level).  
**Implementation:** Repo today ships a **rule-based V1** (navbar panel, static intents, no LLM) per `R0.4`. **Intelligent conversational** behavior described below is the **target product position**, not a claim about current shipped capabilities.

---

## 1. Canonical in-app role (product — fixed)

### What the assistant is

- An **in-app intelligent conversational helper** for users **already inside FREEDOLIAPP** (authenticated, in a workspace, past or aside from first-run activation concerns).
- A surface where the user can **ask in natural language** and receive answers that are **friendly, approachable, clear, practical**, and **useful** for operating the product.
- A helper that may **interpret workspace context** (where they are in the app, what the product domain is) to **orient** the user and **suggest next steps** in plain language—without replacing explicit UI or user control.

### What the assistant is not

- **Not** the activation wizard, **not** first-run onboarding, and **not** a substitute for completing `org_activation` or setup flows.
- **Not** a decorative chatbot that only fills space or parrots marketing copy.
- **Not** an autonomous agent that **executes** purchases, changes billing, deletes data, or performs irreversible actions **without** clear user confirmation through normal product controls.
- **Not** a system that **pretends** to have performed actions it did not perform, **pretends** to know data it cannot access (including behind RLS or external systems), or **pretends** that Amazon/SP-API or other integrations work when they do not.

### Primary role

Answer **operational and product** questions, help the user **understand what they are looking at**, **where to go next**, and **how FREEDOLIAPP fits their workflow**—in a conversational style that feels close to **talking to an AI**, while staying **honest about limits**.

### Target moment of use

- **Inside the app**, during **day-to-day work** (dashboard, projects, orders, decisions, settings, etc.).
- **Not** the primary channel for “finish signing up” or “connect Amazon for the first time”; those remain **wizard / dedicated flows**. The assistant may **refer** users to those surfaces when relevant.

### Tone and personality expectations

- **Warm, close, helpful**; concise when possible; **no condescension**.
- **Natural** language; avoids robotic filler; admits uncertainty (“I don’t have live data for that here”) instead of hallucinating.
- **Professional**: aligned with an operations/finance tool, not a toy.

### Allowed help types (in scope)

- Explain **what a screen or concept is for** (e.g. “What is the Task Inbox?”, “Where do POs live?”).
- **Orient**: “What should I do next?” within honest limits of what the product can infer or what is documented.
- **Interpret** high-level context the product is allowed to expose (e.g. current route, labels, documented behaviors)—not secrets or other users’ data.
- Suggest **navigation** (“Open Orders from the sidebar”) and **next steps** that match real app capabilities.
- Clarify **limitations** (“Amazon ingest depends on your plan and connection status; I can’t see your live seller account from here.”).

### Boundaries and limitations

- Must respect **identity, org, and RLS**: no answer may leak data the user cannot already access in the UI/API.
- Must not claim **real-time** or **external** system state unless that data is actually available through an integrated, authorized path.
- Must not **override** billing gates, permissions, or legal/consent flows.
- **“Feels like real AI”** in this product means: **natural, conversational, helpful responses** with **transparent limits**—not magic omniscience or silent side effects.

### Versus wizard / onboarding

| Wizard / activation | In-app assistant |
|---------------------|------------------|
| Structured steps, completion criteria, persistence (`org_activation`) | Conversational, on-demand |
| Owns first-run **closure** | Does **not** own onboarding; may **point to** Settings or wizard if user asks |
| Product-led sequence | User-led questions |

### Versus future autonomous / agent workflows

- **Today’s direction** is **helper**: explain, orient, suggest; user stays in control.
- **Future** automation agents (e.g. proposal → approve → execute) would be **separate product contracts**, with explicit approval and audit—not the assistant silently acting as an autopilot.

---

## 2. Examples (practical)

### Valid user asks (examples)

- “Where do I create a purchase order?”
- “What’s the difference between this dashboard card and Profit?”
- “I’m stuck—what should I do after I create a project?”
- “Can you explain what ‘decision’ means in this app?”

### In-scope response behaviors (examples)

- Short explanation + **link or navigation hint** to the real screen.
- “I can’t see your ledger from this chat; in the app, open Profit for your org and check…”
- “That depends on your Amazon connection; use Settings / Amazon imports or the activation flow if you haven’t connected yet.”

### Out-of-scope (must not pretend)

- “I’ve placed the PO for you” (unless a future approved automation exists and is truthfully described).
- “Your Amazon sales yesterday were X” without a real data path.
- Completing **activation** or **billing checkout** on the user’s behalf without UI.

---

## 3. Current repo truth (implementation)

- **Shipped:** `AssistantPanel`, `assistantIntents.js`, `TopNavbar` entry, i18n `assistant.*`, rule-based matching—**no LLM** in repo as of `R0.4` closure.
- **Productization** of the **canonical conversational** role (model, prompts, safety, data tools) is **out of scope of this document** and **not claimed done** here.

---

## 4. Strategic alignment (architecture stub — retained)

Longer term, a **context engine** (route, org, role), **explanation** of decisions/automation, and **summaries** of analytics remain aligned with this canonical role, provided they respect the same **honesty and permission** boundaries above.

**Non-goals (unchanged):** autopilot without approval; general-purpose chat unrelated to FREEDOLIAPP; breaking existing architecture layers.

---

## 5. Related documentation

- `docs/PRODUCT/B5_ASSISTANT_IN_APP_UX_SURFACE.md` — **Track B B5:** canonical **in-app UX surface** (entry points, drawer model, internal structure, tone in UI, context, scope, examples, hand-off).  
- `docs/ROADMAP/R0_4_IN_APP_ASSISTANT_AUDIT_REPORT.md` — R0.4 scope and audit.  
- `docs/ROADMAP/R0_4_IN_APP_ASSISTANT_IMPLEMENTATION_REPORT.md` — what was built for V1.
