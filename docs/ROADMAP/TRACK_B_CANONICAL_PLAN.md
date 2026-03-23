# Track B — Product Continuity: canonical execution plan

**Status:** Planning source of truth (documentation).  
**Scope:** Track B only. Does **not** replace **Track A (Amazon Production Readiness)**. Does **not** claim production completion for any block below unless explicitly stated.

**Execution rule:** One active implementation block at a time; this document defines **order and dependencies**, not parallel mega-work.

---

## 1. Two layers of “UI” work (product decision)

| Layer | What it is | When |
|--------|------------|------|
| **A — UI system / style definition** | Tokens, typography, components, patterns, “how Freedoliapp looks and behaves” as a **system** | **Early / mid Track B** — **not** left for the end as a cosmetic afterthought |
| **B — Large-scale visual harmonization** | Applying the system across **many** screens, polish, consistency sweeps | **Later Track B** — **after** the system exists, so rollout is cheap and coherent |

**Rule:** **Define the system before** mass harmonization. Avoid treating “all UI polish” as a single endgame phase: **definition first**, **rollout second**.

---

## 2. Language work: policy before control

| Step | Type | Content |
|------|------|---------|
| **Canonical app language policy** | **Definition** | Default locale, fallback rules, copy ownership, i18n key conventions, what “done” means for strings |
| **In-app language selector** | **Implementation** | User-facing control + persistence + wiring to i18n |

**Rule:** **B3 (policy) before B4 (selector).** Implementing B4 without B3 invites rework and inconsistent behavior.

---

## 3. Assistant: role before surface

- **Canonical in-app role** is **already documented** (`docs/SYSTEMS/ASSISTANT_LAYER.md`).
- **Assistant UX surface** (layout, entry points, conversational UI patterns, how answers are shown) must align with:
  1. That **role definition**, and  
  2. The **canonical UI direction** from **B2**.

**Rule:** **B5 after** assistant role doc (done) **and after B2**. Do not treat the assistant panel as purely cosmetic; it is a **product surface** that must match system + role.

---

## 4. Canonical block order

### Completed (repo / documentation — not a future block)

| Item | Outcome |
|------|---------|
| **Activation / wizard closure** | Final step framed as completion; onboarding refetch on route change; i18n cleanup for import + obsolete guidance keys |
| **Assistant canonical in-app role** | `docs/SYSTEMS/ASSISTANT_LAYER.md` — what the assistant is/is not, tone, boundaries, vs wizard vs agents |

---

### B2 — Canonical UI style definition

- **Canonical doc (repo):** `docs/PRODUCT/CANONICAL_UI_SYSTEM.md` — dirección visual, principios, patrones de shell/layout, interacción, familias de pantalla, do/don’t, preparación Pencil. Tokens hex/escala base: `docs/PRODUCT/VISUAL_IDENTITY_SYSTEM_V1.md`.
- **Type:** **Definition** (may include small reference implementations / Storybook / token file — product decides).
- **Scope:** Design system foundations: color, type, spacing, core components, states, accessibility baselines, naming.
- **Out of scope:** Harmonizing every screen (that is **B6**).

---

### B3 — App language canonicalization

- **Canonical doc (repo):** `docs/PRODUCT/CANONICAL_APP_LANGUAGE_POLICY_B3.md` — política (català font; es/en traduccions), governança, límits B3 vs B4, **auditoria de repo** (JSON, hardcoded, barreges, duplicat `billing` a `ca.json`, sistemes paral·lels).
- **Type:** **Definition** (plus doc-only or minimal repo conventions if needed).
- **Scope:** Single source of truth for language policy: defaults, fallbacks, locale list intent, content rules, i18n structure expectations.
- **Out of scope:** Full selector UX ( **B4** ).

---

### B4 — In-app language selector

- **Type:** **Implementation**.
- **Scope:** User-visible selector, persistence, integration with existing i18n.
- **Dependency:** **B3** complete enough to implement against.

---

### B5 — Assistant in-app UX surface

- **Type:** **Definition** (canonical UX surface) + **Implementation** (when opened as engineering work).
- **Canonical spec:** `docs/PRODUCT/B5_ASSISTANT_IN_APP_UX_SURFACE.md` — entry points, surface model (right drawer), internal structure, tone in UI, context model, scope boundaries, state examples, hand-off.
- **Scope:** How the assistant appears and behaves in-app per `ASSISTANT_LAYER.md`, using **B2** patterns at polish time.
- **Dependencies:** Role doc (done) + **B2** direction + **B5 UX doc** (repo) for consistent implementation.
- **Out of scope:** Claiming full “intelligent conversational” backend in one block unless explicitly scoped; productization of LLM/tools is a **separate** commitment — document per block when opened.

---

### B6.1 — Visual Foundations

- **Type:** **Definition** (documentation / repo source of truth).
- **Canonical doc:** `docs/PRODUCT/B6_1_VISUAL_FOUNDATIONS.md`.
- **Scope:** Fix the canonical visual foundations for the authenticated app: palette usage, buttons, cards, inputs, radius, shadows, icons, breakpoints, and shell-base tone.
- **Dependency:** Builds on **B2** (`docs/PRODUCT/CANONICAL_UI_SYSTEM.md`) without reopening screen patterns or layout families.
- **Out of scope:** Screen rollout, CSS implementation, or page-by-page harmonization.

---

### B6.2 — Core screen visual harmonization

- **Type:** **Implementation** (large surface area).
- **Scope:** Apply **B2 + B6.1** across priority screens (product-defined list): dashboard, key flows, settings, etc.
- **Dependency:** **B6.1** approved/stable enough to avoid thrash.
- **Out of scope:** Pixel-perfect everything at once — prioritize by product value.

---

### B7 — Production verification passes

- **Type:** **Verification** (manual + scripted as available).
- **Scope:** End-to-end checks after Track B slices ship: activation, assistant entry, language switch, critical flows, regression smoke.
- **Dependency:** Relevant **implementation** blocks above are candidate for verification when closed.
- **Does not claim:** “Production complete” for the whole product — only **evidence** for the scope verified.

---

## 5. Phase types (summary)

| Type | Blocks |
|------|--------|
| **Definition** | B2, B3, B6.1 |
| **Implementation** | B4, B5, B6.2 |
| **Verification** | B7 |

*B5:* canonical **UX surface** is specified in `docs/PRODUCT/B5_ASSISTANT_IN_APP_UX_SURFACE.md`; engineering work implements against that spec + `ASSISTANT_LAYER.md` + B2.

**Completed (doc/repo closure)** is listed separately and is **not** B2–B7.

---

## 6. Related documents

- `docs/PRODUCT/CANONICAL_UI_SYSTEM.md` — **B2** canonical UI system (product patterns + Pencil readiness).  
- `docs/PRODUCT/CANONICAL_APP_LANGUAGE_POLICY_B3.md` — **B3** canonical language policy + repo audit basis.  
- `docs/PRODUCT/B6_1_VISUAL_FOUNDATIONS.md` — **B6.1** canonical visual foundations for app UI.  
- `docs/ROADMAP/IMPLEMENTATION_STATUS.md` — live phase tracker; Track B summary points here for **order**.  
- `docs/ROADMAP/ROADMAP_CURRENT_POSITION.md` — executive snapshot; Track B pointer.  
- `docs/SYSTEMS/ASSISTANT_LAYER.md` — assistant canonical role.  
- Track A framing: `IMPLEMENTATION_STATUS.md` section *Parallel roadmap tracks*.
