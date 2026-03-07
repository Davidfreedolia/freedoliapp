# FREEDOLIAPP — Official Documentation Index (SSOT)

Rule: This `docs/` folder is the official technical documentation.  
No parallel docs elsewhere. If it's not here, it's not official.

Last verified against: (run: `git rev-parse --short HEAD`) — 2025-02-17

---

## 0. Document Oficial Viu

- **FREEDOLIAPP_DOSSIER_TECNIC_LIVE.docx** — Editable; font única oficial del dossier (afegir a `docs/` si s’utilitza).
- **releases/** — PDFs versionats (snapshots); veure `docs/releases/README.md`.

(No duplicar contingut; només enllaçar.)

---

## D0 — Executive & Vision
- `docs/D0/D0__executive-vision__v1.0.md` — status: stable
- `docs/D0_PRODUCT_STRATEGY_AND_ROADMAP.md` — product strategy, roadmap, F10 core, beta & feedback
- `docs/USER_FEEDBACK.md` — user feedback log (beta and early users)

## D10 — Product Core Architecture
- `docs/D10_PRODUCT_CORE_ARCHITECTURE.md` — F10 Product Core (Product Brain, Profit Truth, Launch Pipeline, Portfolio Brain)

## D1 — Architecture Overview
- `docs/D1/D1__architecture-overview__v1.0.md` — status: stable

## D2 — Database & RLS Model
- `docs/D2/D2__database-rls-model__v1.0.md` — status: stable
- docs/D2/D2.2__schema-gaps-tracker__v1.0.md — status: stable

## D2.1 — Migrations Log
- `docs/D2/D2.1__migrations-log__v1.0.md` — status: stable

## D3 — Multi-tenant Contract
- `docs/D3/D3__multi-tenant-contract__v1.0.md` — status: stable

## D4 — Frontend & Tracking Architecture
- `docs/D4/D4__frontend-architecture__v1.0.md` — status: stable
- `docs/D4/F4_TRACKING_17TRACK_ARCHITECTURE.md` — status: draft

## D5 — Security Model
- `docs/D5/D5__security-model__v1.0.md` — status: stable

## D6 — SaaS Roadmap
- `docs/D6/D6__saas-roadmap__v1.0.md` — status: draft

## D7 — Observability & Support
- `docs/D7/D7__observability-support__v1.0.md` — status: draft

## D8 — Functional Modules
- `docs/D8/D8__functional-modules-index__v1.0.md` — status: draft
- `docs/D8/D8.4__orders-sales-module__v1.0.md` — status: draft
- `docs/D8/D8.1_ACTIVATION_WIZARD.md` — status: draft
- `docs/D8/D8.2_BILLING_STRIPE.md` — status: draft
- `docs/D8/D8.3_ASANA_INSPIRED_BLUEPRINT.md` — status: draft (UX contract, dashboard dual-mode)

## Stripe Billing

- **D10 — Stripe Webhook Integration** — `docs/D10/STRIPE_WEBHOOK_INTEGRATION.md`  
  Configuració del webhook Stripe, verificació de signatures, integració amb Supabase Edge Functions, esdeveniments escoltats i problemes resolts durant la implementació.

## D11 — Billing Engine

- **D11.1 Billing Architecture** — `docs/D11/D11_BILLING_ENGINE.md`  
  Overview, Stripe Checkout/Webhook, taules billing_subscriptions i billing_org_entitlements, Feature Gating Architecture, features_jsonb, lifecycle, helpers i limits enforcement.
- **D11.2 Feature Gating Engine** — `docs/D11/D11_FEATURE_GATING.md`  
  Single source of truth (billing_org_entitlements), helper API, errors canònics i exemples d’ús.
- **D11.8 Billing UI** — `docs/D11/D11.8_BILLING_UI.md`  
  Slices 1–5 (complete): ruta `/app/billing`, redirect, Current Plan, Usage, Locked features, Billing alerts. LimitReachedBanner (used ≥ limit), CTAs reutilitzen handleUpgrade; UX d’avís, gating real als guards.

## D12 — Workspace Usage Engine

- **D12 Workspace Usage Engine** — `docs/D12/D12_WORKSPACE_USAGE_ENGINE.md`  
  Motor, hook, Billing, WorkspaceLimitAlert global. Slice 5: `nearLimits` quan `used/limit >= 0.8`. D12 complete.

## D13 — Profit Engine (Precheck + Slice 1 + Slice 2 + Slice 3 + Slice 4 + Slice 5 + Slice 6)

- **D13 Profit Engine** — `docs/D13/D13_PROFIT_ENGINE.md`  
  Precheck: fonts financeres, buits, estratègia. Slice 1: motor pur `calculateAsinProfit`. Slice 2: `getAsinProfitData`. Slice 3: `getWorkspaceProfit`. Slice 4: pàgina Profit (src/pages/Profit.jsx), ruta `/app/profit`. Slice 5: `getProfitTimeseries`, profit per dia. Slice 6: gràfic de tendència de benefici (Net Profit per dia) a la pàgina Profit, connectat a `getProfitTimeseries()`; secció "Profit trend visualization".

## D14 — Margin Compression Engine

- **D14 Margin Alerts** — `docs/D14/D14_MARGIN_ALERTS.md`  
  Slice 1: `detectMarginCompression`. Slice 2: `getMarginCompressionAlerts`, alertes per workspace ordenades per marginDrop DESC. Slice 3: secció "Margin alerts" a la pàgina Profit (`/app/profit`). Slice 4: franja global d’alerta `MarginCompressionAlertStrip` al layout (App.jsx), visible a /app/*, CTA "View details" → /app/profit; secció "Global margin alert strip".

## D15 — Custom Home Dashboard (Pre-Design)

- **D15 Custom Home Dashboard** — `docs/D15/D15_CUSTOM_HOME_DASHBOARD.md`  
  Pre-disseny: arquitectura del dashboard personalitzable per usuari; **Home Dashboard v1** — definició funcional i UI (objectiu de la Home, principis UX, layout canònic per files, catàleg de widgets aprovats/no aprovats, regles visuals, navegació, dependències, regla de roadmap). Implementació encara NO iniciada.

## D16 — Inventory Intelligence

- **D16 Inventory Intelligence** — `docs/D16/D16_INVENTORY_INTELLIGENCE.md`  
  Slice 1: `detectStockoutRisk`. Slice 2: `getStockoutAlerts`, alertes per workspace ordenades per daysOfStock ASC. Slice 3: secció "Stockout risk" a la pàgina Profit (`/app/profit`), amb icona d’avís, color amber i format integer/decimal. Slice 4: franja global `StockoutAlertStrip` al layout (App.jsx), visible a /app/*, CTA "View details" → /app/profit; secció "Global stockout alert strip".

## D17 — Cashflow Forecast Engine (Pre-Design)

- **D17 Cashflow Engine** — `docs/D17/D17_CASHFLOW_ENGINE.md`  
  Pre-disseny: objectiu del motor ("quants diners tindré?"), inputs (v_product_econ_day, PO, shipments, payouts), output (sèrie date/cashBalance), API getCashflowForecast(supabase, orgId, options), càlcul simplificat, MVP rules, UI prevista (Home widget Cash Snapshot, pàgina /app/cash), widget kpi_cash_snapshot, dependències, prerequisite per D18/D19. Sense implementació.

## D9 — Runbooks & Incident Playbooks
- `docs/D9/D9__runbooks__v1.0.md` — status: draft

## D10 — Appendix / Verification Scripts
- `docs/D10/D10__verification-scripts__v1.0.md` — status: stable
