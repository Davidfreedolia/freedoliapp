# FREEDOLIAPP — B5: Canonical in-app Assistant UX surface

**Status:** Canonical **UX/product definition** (documentation). **Not** an implementation ticket.  
**Block:** Track B — **B5 — Assistant in-app UX surface**.  
**Depends on:** `docs/SYSTEMS/ASSISTANT_LAYER.md` (role), `docs/PRODUCT/CANONICAL_UI_SYSTEM.md` (B2 patterns — apply at implementation time), B4 (i18n selector — UI language applies to assistant copy).

**Out of scope for this document:** New AI/LLM backend, autonomous agents, Amazon/SP-API, onboarding/wizard redesign, B6 visual harmonization rollout.

---

## 1. Entry points

### 1.1 Primary entry point (canonical)

- **Top app bar** — A dedicated control (e.g. message/assistant icon + short label where space allows) that **opens the assistant surface** from any screen that shows the main app chrome (`TopNavbar`).
- **Rationale:** Predictable, always available during operational work, does not compete with primary navigation for screen creation (PO, project, etc.).

### 1.2 Secondary entry points (optional, product-decided later)

- **Contextual “Help with this screen”** — e.g. link from Help modal or empty states; must **open the same canonical surface** (not a different chat UI).
- **Next-step / guidance cards** (e.g. `NextStepCard`) — May **deep-link** into the assistant with a **pre-filled or suggested prompt**; still the same surface.
- **Not required for B5 closure:** Duplicating entry on every page; floating bubble over content by default (too intrusive for an ops tool).

### 1.3 Visibility and intrusiveness

- **Present:** When user is authenticated inside `/app` (and equivalent gated routes) with standard chrome.
- **Absent / no separate entry:** Login, public marketing/legal surfaces (assistant is **in-app**; see `ASSISTANT_LAYER.md`).
- **Billing gate screens** (locked / over-seat): Optional compact entry only if product wants parity; **default recommendation:** no assistant chrome on those full-screen gates unless explicitly added later — avoids implying the assistant can bypass billing.

### 1.4 Repo anchor (today)

- `TopNavbar` → opens `AssistantPanel` (R0.4). B5 definition **aligns with** this as the primary pattern; future work refines structure/states, not the fundamental “navbar opens assistant” idea.

---

## 2. Surface model

### 2.1 Canonical surface: **right-side overlay panel (drawer)**

- **Model:** **Push-over or overlay drawer** anchored to the **end** of the screen (LTR: right), **full viewport height**, bounded **max-width** on desktop (e.g. ~360–400px — current shipped ~380px is in range).
- **Backdrop:** Semi-transparent scrim; click-outside and **Escape** close (accessibility + expectation match for overlay).
- **Why not a full page by default:** Keeps the user **in context** of the screen they were looking at; assistant is **adjacent help**, not a mode switch.
- **Why not a centered modal:** Conversation needs **vertical space** and repeated use; center modals feel like “one-off alerts,” not ongoing helper.

### 2.2 Hybrid allowance

- **Future:** If a **wider breakpoint** warrants a two-column layout inside the panel (e.g. short “tips” rail + conversation), it remains **one surface** (same entry, same component family) — not a separate “assistant page” unless product explicitly promotes a **dedicated `/app/help/assistant` route** later.

### 2.3 Desktop behavior

- Panel **slides in** or appears with consistent motion (to be aligned with B2 motion tokens when implemented).
- Main app remains **visible but dimmed**; focus moves to the dialog per `role="dialog"` / focus trap rules (implementation detail).

### 2.4 Narrow layouts (mobile / small tablet)

- **Canonical:** Same overlay pattern but **width: 100%** (or nearly full width) so the surface is **usable**; one column only.
- **Avoid:** Permanent split-screen with main content on phones — too cramped for ops tables.
- **Optional:** Bottom sheet variant **only if** it matches B2 mobile patterns; otherwise full-width drawer is sufficient and simpler.

---

## 3. UX structure inside the assistant

| Zone | Purpose |
|------|---------|
| **Header** | Product name for the assistant (i18n), **close** control, optional **subtle** icon. No fake “online” or “typing” indicators unless tied to real backend state. |
| **Context strip** | Short, **non-creepy** line: e.g. current **screen family** (Dashboard, Orders, Project detail) from route — not private data dumps. Optional opaque **project id snippet** only if it helps support/debug and is already visible in URL; prefer **human labels** when available later. |
| **Suggested prompts (chips)** | 3–5 **tappable shortcuts** (i18n) for high-value intents: e.g. “What can I do here?”, “What’s next?”, “Where are orders?” — aligned with `assistant.quick.*` / intent taxonomy. |
| **Conversation area** | Scrollable **message list** (future) or **single answer block** (V1 rule-based): user message + assistant reply **visually distinct**. V1 may show **only the latest** reply; spec assumes **multi-turn** layout eventually. |
| **Empty state** (first open, no messages) | Friendly **one-liner** + chips; invite **tap a suggestion** or type; **no** fake chat history. |
| **Input row** | Single-line or growing textarea (product decision); **Send** + placeholder i18n; **Enter** submits where appropriate. |
| **Response blocks** | Body text (i18n or server-rendered markdown later); **primary/secondary actions** as buttons: “Open Orders”, “Open Projects” — **real routes only**. |
| **Loading / thinking** | If a future backend exists: **short** label (“Working on it…”) + **non-blocking** spinner; **no** fake streaming unless real. For **rule-based V1:** **instant** response — no artificial delay. |
| **Error / unavailable** | Clear, **non-blaming** copy: service down, rate limit, or “I can’t answer that from here”; **one** recovery action (retry, open Help manual, contact support) as appropriate. |
| **Limitations** | When confidence is low: **explicit** copy (“I’m not sure”, “I don’t have access to live data for that”) + **redirect** to UI or docs — see `ASSISTANT_LAYER.md`. |

---

## 4. Tone translated into UI behavior

| Principle | UI behavior |
|-----------|-------------|
| **Friendly and close** | Short paragraphs, **second person**, warm microcopy in i18n; **rounded** chips and buttons per B2; avoid cold legal blocks inside the panel. |
| **Avoid fake magic** | No checkmarks like “Done!” for actions the assistant did not perform; no fabricated numbers; **separate** “suggested next step” from “completed action.” |
| **Avoid robotic / help-center-only** | Not **only** links to static articles; **blend** short answer + optional “Open manual” for depth. |
| **Serious enough for business** | No playful avatars that undermine trust; **density** and typography match **ops** app, not consumer chat stickers. |
| **Honest limits** | **Dedicated** visual pattern for uncertainty (e.g. muted callout or prefix “From what I can see…” ) when product defines it in B6. |

---

## 5. Context model (what we show vs hide)

### 5.1 May show (UI-safe)

- **Route-derived screen name** (dashboard, orders, project detail, etc.) — already approximated in repo via `getScreenFromPath`.
- **Workspace name** (if already shown in top bar) — optional echo in assistant header **only if** it reduces confusion in multi-workspace setups; not required for V1.
- **Language** — follows global app language (B4).

### 5.2 Should stay implicit or hidden

- Raw **user id**, **internal org ids** (except short debug snippet policy if any).
- **RLS-protected** or **unfetched** metrics — never displayed as if known.

### 5.3 Signaling “I’m using your app context”

- **Copy pattern:** “Based on where you are (**Orders**)…” or “For **this screen**…” — **one line**, not a data dossier.
- **Avoid:** “I know everything about your business” or personalized surveillance framing.

---

## 6. Scope boundaries (this surface, first)

### 6.1 In scope for the surface (first iterations)

- **Product orientation:** where things live, what a screen is for, **next step suggestions** aligned with real app routes.
- **Light process:** high-level flow (project → PO → inventory) with **links**.
- **Honest deflection** when data or capability is missing.

### 6.2 Explicitly out of scope (this stage)

- **Executing** irreversible actions from chat without normal confirmation UI.
- **Live Amazon / sales / ledger** claims without a data pipe.
- **Replacing** activation, billing checkout, or legal consent flows.
- **Autonomous multi-step agents** (proposal → execute) — separate product contract (`ASSISTANT_LAYER.md`).

### 6.3 Versus future agent workflows

- This surface is the **conversation shell**; agents (if any) would attach **tools** and **approval** flows **outside** “the assistant silently did it.” The UX spec **reserves** message types for “action proposed” / “needs confirmation” **later**, without implementing them now.

---

## 7. Screen / state examples (concrete)

### 7.1 First open

- User taps assistant in navbar → drawer opens → **empty conversation** → chips visible → short line: “Ask something or tap a suggestion below.”

### 7.2 No conversation yet (after open)

- Same as 7.1; input focused optional (implementation).

### 7.3 User asks a product/operational question (matched intent)

- User: “Where do I create a PO?”  
- Assistant: Short answer (i18n) + **primary CTA** “Open Orders” → navigates and **closes** drawer (current repo behavior) or stays open (product choice — **documented preference:** close on successful navigation to reduce clutter).

### 7.4 Assistant suggests next step

- User taps “What’s next?” on Dashboard.  
- Assistant: Guidance text + **secondary** actions to Projects / Orders (pattern already in `AssistantPanel` for `NEXT_STEP`).

### 7.5 Assistant cannot answer confidently

- User: obscure or unmatched query.  
- Assistant: `noMatch` style message — suggest **rephrasing**, **chips**, or **Help manual**; **no** random guess.

### 7.6 Depends on unavailable data / system

- User asks for live sales.  
- Assistant: Explain **where in app** to look + **plan/connection** caveats per `ASSISTANT_LAYER.md`; no numbers.

---

## 8. Hand-off to later implementation

### 8.1 This definition enables

- **B6:** Apply tokens, typography, spacing, and **consistent** message/loading/error patterns to the drawer without re-debating layout.
- **Engineering:** Multi-turn history, LLM backend, richer intent router — **inside a stable shell** (header, context strip, list, input).
- **Content:** i18n keys under `assistant.*` can grow with **stable** UI slots (chip, paragraph, CTA row).

### 8.2 Waits for B6 or later

- **Visual polish** (exact shadows, motion curves, illustration).
- **New components** (avatars, rich markdown, code blocks) unless B2 already defines them.
- **Full conversational backend** and **tool calling** — explicit product/tech commitment outside this UX doc.

---

## 9. Related documentation

- `docs/SYSTEMS/ASSISTANT_LAYER.md` — canonical **role**, tone, boundaries, vs wizard vs agents.  
- `docs/PRODUCT/CANONICAL_UI_SYSTEM.md` — B2 UI system (apply when styling).  
- `docs/ROADMAP/R0_4_IN_APP_ASSISTANT_AUDIT_REPORT.md` / `R0_4_IN_APP_ASSISTANT_IMPLEMENTATION_REPORT.md` — shipped V1 scope.  
- `src/components/assistant/AssistantPanel.jsx`, `src/lib/assistant/assistantIntents.js` — current repo anchor.
