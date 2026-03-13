# FREEDOLIAPP — V1 UI/UX Polish Audit

## Status
Draft

## Goal
Identify visible UI/UX issues that should be cleaned up before internal V1 testing.

---

## 1. Surfaces Reviewed

Based on the current repository, the following V1 surfaces have been reviewed at least at code level (and, where possible, structural UX):

- Public:
  - Landing page (`src/pages/Landing.jsx`)
  - Landing header/footer (`src/components/landing/LandingHeader.jsx`, `LandingFooter.jsx`)
  - Trial page (`src/pages/Trial.jsx`)
  - Login page (`src/pages/Login.jsx`)
  - Legal pages (`src/pages/legal/*.jsx`)
  - Cookie banner & preferences (`src/components/legal/CookieBanner.jsx`, `CookiePreferences.jsx`)
- Auth / Onboarding:
  - Activation wizard (`src/pages/ActivationWizard.jsx`)
  - Onboarding gate (`OnboardingGate` in `src/App.jsx`)
- App shell:
  - App router and layout (`src/App.jsx`)
  - Sidebar (`src/components/Sidebar.jsx`)
  - Top navbar (`src/components/TopNavbar.jsx`)
  - Global alerts and banners:
    - Billing banner (`components/billing/BillingBanner.jsx`)
    - Workspace limit alert (`components/billing/WorkspaceLimitAlert.jsx`)
    - Demo banner, margin/stock alert strips
- Core product:
  - Dashboard / Home (`src/pages/Dashboard.jsx`)
  - Projects list & empty state (`src/pages/Projects.jsx`)
  - Project detail route (`src/pages/ProjectDetailRoute.jsx` and project cards)
  - Suppliers (`src/pages/Suppliers.jsx`)
  - Orders / POs (`src/pages/Orders.jsx`)
  - Inventory (`src/pages/Inventory.jsx`)
  - Finances (`src/pages/Finances.jsx`, `FinanceExports.jsx`, `Cashflow.jsx`, `Profit.jsx`)
  - Decisions (`src/pages/Decisions.jsx`, decision badges and alerts)
  - Automations operator UI and analytics (`src/pages/automations/*`, `src/components/automations/*`)
- Billing & usage:
  - Billing main (`src/pages/Billing.jsx`)
  - Billing locked (`src/pages/BillingLocked.jsx`)
  - Billing over-seat (`src/pages/BillingOverSeat.jsx`)
  - Billing usage on home (`components/home/HomeBillingUsage.jsx`)
  - Settings billing section (`src/pages/BillingSettings.jsx`, `src/pages/Settings.jsx`)

---

## 2. Critical Before Internal Test

Issues that materially affect perceived completeness or can confuse internal testers:

1. **Mixed language / untranslated copy in core views**
   - Several core pages (Projects, Suppliers, Orders, Dashboard, Billing) contain hardcoded Catalan/Spanish strings mixed with English (e.g. “Carregant…”, “Nou projecte”, “Comandes (PO)”) without consistent i18n usage.
   - Impact: product feels unfinished and inconsistent, especially for non-Catalan speakers doing internal QA.

2. **Non-final consent and legal wording visible to users**
   - Login consent text and cookie banner/legal pages clearly indicate draft/legal placeholders.
   - Impact: for internal test this is acceptable, but wording should at least be coherent and not obviously placeholder for team members assessing user flows.

3. **Dashboard “first value” banner copy & style**
   - The first value banner in `Dashboard.jsx` uses hardcoded English copy (“Welcome to Freedoliapp. Start by creating your first product.”) and does not use i18n.
   - Impact: small but highly visible; on first open of `/app` it sets the tone. Needs to be localized and visually aligned with the rest of the UI.

4. **Workspace selector visual hierarchy**
   - The workspace selector in `TopNavbar` sits among multiple right-side elements (DEMO/LIVE pill, decisions badge, preferences, user avatar). The selector’s label “Workspace: …” is small and visually similar to other pills.
   - Impact: internal testers may miss that multiple workspaces exist or that they can switch. Needs a slightly clearer affordance (spacing/weight) without redesigning the topbar.

5. **Inconsistent CTA hierarchy across core lists**
   - Projects, Suppliers, Orders all have “New …” CTAs, but button variants, sizes and labels vary slightly (“Nou projecte”, “Nou Proveïdor”, “Nova Comanda”) and sometimes do not use the same `Button` variant as primary action in the toolbar.
   - Impact: the app feels stitched together; internal testers may perceive separate “eras” of UI in different modules.

6. **Billing screens copy and states**
   - Billing-related pages (Billing, BillingLocked, BillingOverSeat) contain English system messages and some raw error text (“Checkout failed”, “Portal failed”) mixed with translated keys.
   - Impact: when testing billing flows internally, error and lock screens may feel rough and not clearly explain what to do next.

---

## 3. Important Before External Users

Issues that are acceptable for internal testing but should be cleaned up before exposing the app to real customers:

1. **Consistent language across the app**
   - Decide on primary UI language for V1 (likely English) and ensure all visible copy (including tooltips, empty states, error messages) uses i18n keys.

2. **Landing page visual refinement**
   - The landing hero and feature cards use the base UI components but could benefit from slightly better spacing, typography scale and perhaps one or two supporting visuals.
   - No structural changes are required; only CSS/spacing cleanup.

3. **Empty state messaging depth**
   - Current empty states for Projects, Suppliers and Orders are functional but very short.
   - They should briefly explain:
     - what the module is for,
     - what happens after creating the first item.

4. **Dashboard widget overload**
   - The dashboard currently surfaces many widgets and KPIs in a relatively dense layout.
   - For external users, we may want to:
     - collapse or hide some secondary widgets by default,
     - ensure mobile/tablet breakpoints keep a clear hierarchy.

5. **Billing usage widget clarity**
   - `HomeBillingUsage` shows plan/status/trial date; for external users, labeling and formatting should be extra clear (e.g., explicit “Trial ends on …” vs. ambiguous dates).

6. **Automations & analytics visual cohesion**
   - The automation inbox/activity/analytics screens are implemented but their styling may differ slightly from core operations pages (badges, typography, spacing).
   - Before external exposure, align these with the main design language (buttons, table/row spacing, empty/loading states).

---

## 4. Can Wait Post-V1

Nice-to-have polish items that do not block V1 internal or initial external testing:

1. **Advanced responsiveness for rare layouts**
   - Fine-grained handling of very narrow widths or very large screens on secondary pages (e.g., long tables in Orders, complex cards in Suppliers) can be improved later.

2. **Icon consistency across all modules**
   - Some modules use more decorative icons than others (e.g., different icon sets or sizes). Harmonizing these is nice-to-have but not critical for V1.

3. **Animations and micro-interactions**
   - Subtle transitions for opening modals, dropdowns or switching tabs can be added post-V1 to improve perceived smoothness.

4. **Deep theming and dark-mode polish**
   - Dark mode is present in many places but not necessarily perfect in every edge case (e.g., nested cards, some badges).
   - Full theme QA can be scheduled after initial customer feedback.

5. **In-app help and documentation links**
   - The Help page exists; deeper contextual help, guided tours or inline tips can be added as a follow-up iteration.

---

## 5. Recommended Fix Order

Suggested order to address issues with minimal risk and maximum impact:

1. **Language & i18n cleanup (CRITICAL)**
   - Standardize on one primary language for V1 (likely English) and:
     - move hardcoded strings (Dashboard banner, Projects/Suppliers/Orders labels, Billing errors) into i18n,
     - ensure Login/Trial/Activation/Legal use consistent wording.

2. **Entry & first-value experience (CRITICAL)**
   - Refine the dashboard first-value banner style + copy and ensure it uses i18n.
   - Double-check empty states for Projects/Suppliers/Orders show clear, concise guidance.

3. **Workspace selector & shell clarity (CRITICAL/IMPORTANT)**
   - Slightly adjust spacing/weight of the workspace selector in `TopNavbar` so workspace name and affordance are more noticeable without redesigning the header.

4. **Billing UX messaging (CRITICAL/IMPORTANT)**
   - Harmonize copy in Billing, BillingLocked, BillingOverSeat:
     - consistent tone,
     - clearer action labels (“Update billing”, “Retry payment”, etc.),
     - translated via messages/i18n where possible.

5. **Secondary module cohesion (IMPORTANT)**
   - Pass over Suppliers, Orders, Finances and Automations pages:
     - align primary/secondary buttons,
     - normalize titles and subtitles,
     - ensure toolbars and cards share consistent spacing and styles.

