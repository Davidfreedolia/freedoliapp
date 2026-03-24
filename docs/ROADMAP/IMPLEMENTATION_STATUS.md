# FREEDOLIAPP — IMPLEMENTATION STATUS

This file is the **canonical live status tracker** for implementation phases. It is the single place to check first to know where the project stands. When older docs (e.g. ROADMAP_STATUS.md, phase-specific audits) conflict with this file, **this file is the current implementation truth**. Update this document after each closed phase; do not mark a phase CLOSED without repo-grounded proof (code or migration present).

---

## Status legend

| Status | Meaning |
|--------|--------|
| **CLOSED** | Phase completed; deliverables in repo; no open work. |
| **IN PROGRESS** | Work underway; not yet closed. |
| **PENDING** | Approved or planned; not started. |
| **PARKED** | Explicitly deferred; not active. |
| **LEGACY / RISK** | Implemented but carries known risk or is superseded by later design; monitor only. |

---

## Current position

- **Fases internes tancades:**  
  - **FASE 3 — Business alerts**: motor, API/hook i UI Bell+Drawer consolidades.  
  - **FASE 4 — Tasks / inbox / origins / gates alignment**: model de tasks canònic, linkage `source`/`source_ref_*`, inbox `/app/inbox`, gates ↔ tasks documentats i alineats.  
  - **FASE 5 — Finance canonical model / profit / cashflow**: ledger + FX canònics, contractes de P&L i cashflow fixats, profit engine alineat amb ledger, UI de Profit V1 honestada.  
  - **FASE 6 — Future prep**: contractes futurs per COGS/landed cost, realized cashflow UI, Admin Console i profit coverage, més estratègia de finances/dashboard legacy.
- **Blocs P0/P1:**  
  - **P0 — Blockers reals i preparació immediata:** treball completat (multi-tenant visible cleanup, PO hardening i reset documental reflectits al repo).  
  - **P1 — Producte visible / UI / UX:**  
    - **P1.1 Dashboard V1 = CLOSED**  
    - **P1.2 Projects / ProjectDetail = CLOSED**  
    - **P1.3 Operations flow visible = CLOSED**  
    - **P1.4 Onboarding / demo flow = CLOSED**  
    - **P1.5 Visual consistency / polish = CLOSED**
- **Estat actual del producte visible:**  
  - **Status:** *pilot-ready with caveats*  
  - Producte visible, coherent i demo-worthy; apte per **pilot controlat i acompanyat**, no per self-serve massiu.

### Parallel roadmap tracks (product framing — March 2026)

**Regla de treball:** L’**execució** al repositori segueix sent **un bloc actiu cada vegada** (mode estricte). El **roadmap** pot descriure **vies paral·leles** sense obligar a implementar-les fusionades. **Amazon no està aparcat ni desprioritzat**: és una **línia crítica** separada perquè el seu desbloqueig depèn sobretot de **setup extern i burocràcia del portal Amazon**, mentre el producte pot avançar en paral·lel dins del repo.

#### Track A — Amazon Production Readiness (crítica / dependent de l’exterior)

- **Paper:** SP-API i el flux Amazon-first continuen sent **dependència core** del producte; aquest track és el camí cap a **connexió i dades reals en producció** quan el compte i l’aplicació de venedor ho permetin.
- **Estat actual (documentat):**
  - **Sandbox only**; l’oferta **no és encara publicable** com a producte final d’integració producció.
  - **Tax interviews** incompletes (requisits del portal).
  - **Solution type** / perfil d’aplicació **incomplet** on apliqui.
  - **Camí producció / públic encara no desbloquejat** al portal Amazon (Seller Central / Developer) segons el procés vigent.
  - **SP-API continua sent dependència crítica de producte** — desbloquejar aquest track no és opcional a mitjà termini; separar-lo del dia a dia del repo **no** en redueix la prioritat estratègica.

#### Track B — Product Continuity (paral·lela al repo)

- **Pla canònic d’execució (ordre B2–B7, dependències UI/idioma/assistent):** `docs/ROADMAP/TRACK_B_CANONICAL_PLAN.md`.  
- **B2 (definició sistema UI app):** tancat a nivell documentació repo — `docs/PRODUCT/CANONICAL_UI_SYSTEM.md` (patrons + famílies de pantalla + Pencil); tokens base segueixen referenciats a `docs/PRODUCT/VISUAL_IDENTITY_SYSTEM_V1.md`. **B6** = harmonització visual massiva al codi, no reobre B2 salvo decisió explícita.  
- **B3 (canonització idioma app):** tancat a nivell documentació + auditoria repo — `docs/PRODUCT/CANONICAL_APP_LANGUAGE_POLICY_B3.md` (català font; es/en traduccions; regles; **no** selector B4 ni refactor massiu). **No** es reclama consistència lingüística a producció fins implementació posterior.  
- **B6.1 (visual foundations):** definit a nivell documentació/repo a `docs/PRODUCT/B6_1_VISUAL_FOUNDATIONS.md` com a base visual canònica de l'app (paleta d'ús, botons, cards, inputs, radius, shadows, icones, breakpoints, shell base). **No** implica implementació ni verificació en producció.  
- **B6.2 (layout primitives):** implementat a nivell repo per shell/layout primitives compartides (`App`, `Sidebar`, `TopNavbar`, `Header`, gutters/toolbar, data states, loaders, error boundary).  
- **B6.3.1 / B6.3.2 / B6.3.3 (Dashboard, Projects, Project Detail rollout):** implementats a nivell repo com a harmonització visual de les superfícies visibles dins l'abast aprovat; no impliquen per si sols validació universal en producció.  
- **B7 (production verification passes):** tancat a nivell documental com a **verificació parcial/substancial** després de runtime hotfixes; el camí principal d'entrada a `/app` queda verificat en producció, però no es reclama prova universal de tots els casos d'autenticació/hidratació. Vegeu `docs/ROADMAP/B7_PRODUCTION_VERIFICATION_AND_RUNTIME_HOTFIX_CLOSEOUT.md`.  
- **Paper:** Mantenir **accés, onboarding i valor visible** mentre Track A avança fora del codi.
- **Estat actual (documentat):**
  - **Access / auth:** blocker principal d'entrada detectat a B7 (`/app` -> `/activation` + white screen / loader buit) **reproduït, auditat i hotfixat**; el camí principal d'accés autenticat a `/app` queda **verificat en producció** en el cas provat.
  - **Activation / wizard:** el bloqueig d'accés associat a `ProtectedRoute` i `WorkspaceContext` queda mitigat al repo i validat al camí principal de producció; el cas extrem de login fresc/incògnit amb hidratació molt primerenca **no** queda encara provat de forma exhaustiva.
  - **In-app assistant:** V1 al repo (panel + intents, sense LLM). El **paper canònic in-app** (helper conversacional dins l’app, no onboarding) queda **definit** a `docs/SYSTEMS/ASSISTANT_LAYER.md`; la **productització** (comportament “AI real” amb model/eines) és **separada** i **no** es dona per feta.
  - **Deute runtime menor (no blocker d'entrada):** els errors de Dashboard `financial_ledger` -> `403` i `inventory` -> `400` queden **resolts i verificats en producció**; queda pendent només la prova extrema de login fresc/incògnit i, si s'obre més endavant, la revisió d'altres lectures directes de `financial_ledger` fora del Dashboard.
  - **Lectura:** el producte **pot seguir avançant** en Track B **mentre** Track A es desbloqueja al portal Amazon.

- **Següent bloc (execució única):** Es continua triant **un sol bloc actiu** per torn (p. ex. un tall concret de **Track B** — tancament activation / gates / producte — **o** un pas de **Track A** al portal Amazon, **o** una verificació tècnica puntual SP-API/infra després de desplegaments). No s’obre una mega fase nova; el marc operatiu **Pilot Preparation / Pilot Execution** segueix vàlid darrere les caveats de pilot, ara explicitades també en funció dels dos tracks.

---

## Canonical phase tracker table

| Phase | Title | Status | Scope summary | Key outcome / current truth | Notes / risks |
|-------|--------|--------|---------------|-----------------------------|---------------|
| **S2.x** | Multi-tenant hardening | CLOSED | Tenant = org_id; RLS; workspace context; billing fields on orgs. | Baseline multi-tenant + FASE 2 CBA (ROADMAP_STATUS). RLS billing gating, seat enforcement RPC, Stripe checkout/portal/webhook. | Legacy doc: ROADMAP_STATUS.md. |
| **S3.1** | Governance / billing cleanup activation | CLOSED (audit) | S3.1.A duplication audit; App gate moved to useWorkspaceUsage/useOrgBilling. | Audit done; gate uses canonical usage (docs ARCHITECTURE/S3_1_A_DUPLICATION_AUDIT.md). | No separate “S3.1.B” phase doc; activation reflected in App.jsx comment. |
| **S3.2.A** | Membership schema preparation | CLOSED | Migration: membership_status enum; org_memberships status, invited_by, invited_at, accepted_at, suspended_at; backfill active. | Migration 20260315100000_s3_2a_membership_lifecycle_schema.sql. | |
| **S3.2.B** | Active seat semantics | CLOSED | Trigger + RPC count only active members; guards is_org_member / is_org_owner_or_admin filter status = 'active'. | Migrations 20260315110000_s3_2b_active_seat_semantics.sql, 20260315120000_s3_2b_2_membership_guards.sql; usage.js, useBillingUsage, UI patches. | |
| **S3.2.C** | First-membership fallback cleanup | CLOSED | Remove “first org_memberships row” org inference from app code. | All high-risk fallbacks removed (S3_2_C_0 audit, S3_2_C_FINAL_VERIFICATION_AUDIT). supabase.js and call sites use activeOrgId or entity-derived org; missing_org_context where needed. | |
| **S3.3.A** | Billing / Access Legacy Audit | CLOSED (audit) | Audit billing/access legacy surfaces. | Identified edge functions and DB surfaces to patch (led to S3.3.B, S3.3.C). | Audit phase only; no separate doc file found; referenced in S3.3.B/C context. |
| **S3.3.B** | Active membership enforcement (billing edge functions) | CLOSED | Add .eq("status", "active") to org_memberships checks in Stripe/billing edge functions. | create_checkout_session, stripe-checkout-session, stripe-portal-session, stripe_create_checkout, stripe_create_portal patched. | |
| **S3.3.C** | DB / RLS Billing Access Audit | CLOSED (audit) | Audit DB helpers, RLS, triggers for billing/seat access. | S3_3_C_DB_RLS_BILLING_ACCESS_AUDIT.md. Found dual billing_status/seat_limit sources; recommended S3.3.D and seat-limit alignment. | |
| **S3.3.D** | Billing RLS active membership enforcement | CLOSED | RLS policies for org_billing, billing_org_entitlements, billing_customers, billing_subscriptions, billing_invoices, billing_org_overrides: require status = 'active' in org_memberships subquery. | Migration 20260315130000_s3_3d_billing_rls_active_membership.sql. | |
| **S3.3.E** | Seat limit source audit | CLOSED (audit) | Audit all DB/runtime seat-limit sources and enforcement/display paths. | S3_3_E_SEAT_LIMIT_SOURCE_AUDIT.md. Recommended aligning org_add_member with trigger (S3.3.F) and UI (S3.3.H, S3.3.I). | |
| **S3.3.F** | Seat limit DB enforcement alignment | CLOSED | org_add_member derives seat limit from get_org_billing_state + get_plan_limits; fallback orgs.seat_limit. | Migration 20260315140000_s3_3f_org_add_member_seat_limit_align.sql. | |
| **S3.3.G** | Seat limit UI surface alignment audit | CLOSED (audit) | Audit UI/runtime surfaces that display or guard on seat limit. | S3_3_G_SEAT_LIMIT_UI_SURFACE_AUDIT.md. Recommended Settings (S3.3.H) and BillingOverSeat (S3.3.I) alignment. | |
| **S3.3.H** | Settings seat limit UI alignment | CLOSED | Settings.jsx: seat limit from useBillingUsage (canonical); fallback org.seat_limit. | useBillingUsage(activeOrgId); seatLimit = canonicalSeatsLimit ?? org?.seat_limit ?? null; display and Add member guard use it. | Repo-grounded: src/pages/Settings.jsx. |
| **S3.3.I** | BillingOverSeat UI alignment | CLOSED | BillingOverSeat.jsx: seat limit from useBillingUsage; fallback org.seat_limit ?? 1. | useBillingUsage(activeOrgId); seatLimit = canonicalSeatsLimit ?? org?.seat_limit ?? 1 for display. | Repo-grounded: src/pages/BillingOverSeat.jsx. |
| **S3.3.J** | DB Billing Status Split-Brain Audit | CLOSED (audit) | Audit DB/runtime billing-status sources and gating. | S3_3_J_DB_BILLING_STATUS_SPLIT_BRAIN_AUDIT.md. Recommended aligning org_billing_allows_access to org_billing.status (S3.3.K). | |
| **S3.3.K** | org_billing_allows_access canonical fallback | CLOSED | Prefer org_billing.status; fallback orgs.billing_status when no org_billing row. | Migration 20260315150000_s3_3k. RLS and triggers now share same effective billing-status source. | |
| **S3.3.L** | Decision Scheduler Billing Status Audit | CLOSED (audit) | Audit scheduler org-selection vs post-S3.3.K gating. | S3_3_L_DECISION_SCHEDULER_BILLING_STATUS_AUDIT.md. Recommended aligning scheduler (S3.3.M). | |
| **S3.3.M** | Decision Scheduler Billing Status Alignment | CLOSED | Scheduler selects orgs via get_org_ids_billing_allows_access() instead of orgs.billing_status. | RPC get_org_ids_billing_allows_access(); decision-scheduler/index.ts calls it. Migration 20260315160000_s3_3m. | |
| **S3.3.N** | Billing Access Logic Deduplication | CLOSED | get_org_ids_billing_allows_access() reuses org_billing_allows_access(id); no duplicated logic. | Migration 20260315170000_s3_3n. Single source of “billing allows access” in DB. | |
| **S3.4.A** | Admin Console / Membership Governance | PARKED | Invitations, invitation expiry, membership/user/account states, admin visibility into billing/seat/user status. | **Not implemented.** Planned for future phase. | Do not implement in current S3.x scope. |
| **FASE 3** | Alertes de negoci | CLOSED | 3.1–3.5 tancats: audit RLS/definicions, motor F2/O1/S1/O2, API/hook, UI Bell+drawer, doc. | Contracte biz:; run_alert_engine; useBusinessAlerts; BusinessAlertsBadge. FASE_3_5_DOCUMENTACIO_I_TANCAMENT.md. | V1: invocació manual; sense auto-resolve; F6 no tocat. |
| **FASE 3.1** | Alertes — Auditoria RLS i definicions | CLOSED | RLS, convenció dedupe_key (biz:), contracte definicions. | FASE_3_1_ALERTES_RLS_DEFINICIONS_AUDIT.md. READY per 3.2. | Només auditoria; sense canvis de codi. |
| **FASE 3.2** | Motor d'alertes de negoci | CLOSED | RPC run_alert_engine(org_id); F2, O1, S1, O2; escriptura a alerts amb biz:. | Migration 20260315180000_f3_2_run_alert_engine.sql. | Invocació manual; sense UI ni auto-resolve. |
| **FASE 3.3** | API / helpers per a la UI d’alertes | CLOSED | Lectura, comptatge, acknowledge/resolve, runEngine; filtre biz:; hook useBusinessAlerts. | src/lib/alerts/businessAlertsApi.js; src/hooks/useBusinessAlerts.js. | Sense Bell ni Drawer (3.4). |
| **FASE 3.4** | UI Bell + comptador + Drawer | CLOSED | BusinessAlertsBadge al TopNavbar; comptador; drawer amb llista, Acknowledge/Resolve; useBusinessAlerts. | src/components/alerts/BusinessAlertsBadge.jsx; TopNavbar.jsx. | Només alertes biz:; sense barreja OPS/SHIPMENT. |
| **FASE 3.5** | Documentació i tancament | CLOSED | Consolidació doc; contracte final; limitacions V1; riscos/debt; cauteles. | FASE_3_5_DOCUMENTACIO_I_TANCAMENT.md. Només documentació. | FASE 3 formalment tancada. |
| **FASE 4** | Tasques / accions canòniques | CLOSED | 4.1–4.4 tancades: contracte de tasks, linkage origins, inbox canònica, lifecycle net, gates ↔ tasks alineats i documentats. | tasks + source_linkage; createOrGetTaskFromOrigin; UI alert/decision/gate; canonical task inbox /app/inbox; lifecycle open/done; minimal origin navigation per decisions; contracte gates/blocking-state documentat. | FASE_4_1_*, FASE_4_2_*, FASE_4_3_*, FASE_4_4_*. |
| **FASE 4.1** | Contracte task/action canònic | CLOSED | 4.1.A audit; 4.1.B contract de dades. Tancament doc/contracte únic; sense implementació. | FASE_4_1_CANONICAL_TASK_ACTION_CONTRACT_AUDIT.md; FASE_4_1_B_TASK_ACTION_DATA_CONTRACT.md. | Contracte tancat; 4.2 pendent. |
| **FASE 4.2** | Linkage alert/decision/gate → task | CLOSED | Migració source + source_ref; UI: alerts, decisions, Dashboard (project_gate), BillingOverSeat (workspace_gate). | Migration 20260316120000_f4_2; supabase.js; BusinessAlertsBadge; DecisionBadge; Dashboard; BillingOverSeat. | Dedupe per origin; project_gate al Dashboard; workspace_gate a BillingOverSeat. |
| **FASE 4.3.A** | Canonical task inbox audit | CLOSED (audit) | Auditoria surfaces de dades i UI de tasks; lifecycle; legacy/solapaments; multi-tenant; gaps per 4.3.B. | FASE_4_3_A_CANONICAL_TASK_INBOX_AUDIT.md. Només auditoria; sense implementació. | Verdict: base real parcial (TasksWidget); no existeix inbox única; següent mínim = 4.3.B. |
| **FASE 4.3.B** | Canonical task inbox — UI + mínim | CLOSED | Pàgina /app/inbox; filtres status i source; visibilitat source; org_id obligatori; getOpenTasks sense org retorna []; Diagnostics task check skip sense org. | TaskInbox.jsx; getTasks(filters.source); TasksWidget “View all”; Sidebar; FASE_4_3_B_CANONICAL_TASK_INBOX_IMPLEMENTATION.md. | Inbox canònica usable; no RLS, no calendar, no source_ref nav. |
| **FASE 4.3.C** | Task lifecycle / closure semantics audit | CLOSED (audit) | Auditoria lifecycle: status (open/done/snoozed), transicions, snoozed no escrit, dedupe, UI, tenancy. | FASE_4_3_C_TASK_LIFECYCLE_CLOSURE_SEMANTICS_AUDIT.md. | Verdict: contracte parcial; snoozed = deute; següent opcional 4.3.D. |
| **FASE 5** | Finance canonical model / profit / cashflow | CLOSED | 5.1–5.5 tancades: data model financer auditat; P&L i cashflow canònics fixats; profit engine alineat; UI Profit V1 honestada; exports trimestrals sobre ledger+FX. | `financial_ledger` + `org_settings` + `exchange_rates_daily` + profit truth engine (F10.2) com a base canònica; `Finances.jsx` i taules legacy marcades fora del core. | FASE_5_1_*, FASE_5_2_*, FASE_5_3_*, FASE_5_4_*, FASE_5_5_*. |
| **FASE 6** | Future prep / governance / legacy finances | CLOSED | 6.1–6.5 tancades: contracte futur de COGS/landed cost; contracte futur de realized cashflow UI; contracte futur d’Admin Console; contracte de coverage/completeness de profit; estratègia de finances/dashboard legacy. | Fases purament documentals (no-code) que preparen el futur sense activar-lo; S3.4.A continua PARKED a nivell d’implementació. | FASE_6_1_*, FASE_6_2_*, FASE_6_3_*, FASE_6_4_*, FASE_6_5_*. |
| **R0.4** | In-app Assistant V1 | CLOSED | Panel assistent des de navbar; intents/FAQ; matching client; context de pantalla; sense LLM ni backend nou. | AssistantPanel; assistantIntents.js; entrada a TopNavbar; i18n assistant.* (ca, en, es). | R0_4_IN_APP_ASSISTANT_AUDIT_REPORT.md (contracte); R0_4_IN_APP_ASSISTANT_IMPLEMENTATION_REPORT.md. |

---

## Detailed section by major block

### S2.x — Multi-tenant hardening

- **Status:** CLOSED.
- **Confirmed done:** Tenant boundary org_id; RLS; workspace context (active_org_id, bootstrap); billing fields on orgs; RLS billing gating (org_billing_allows_access); seat enforcement via RPC; Stripe checkout/portal/webhook; BillingLocked/BillingOverSeat gates; i18n base for billing.
- **Not done (by design):** No change in this tracker; see ROADMAP_STATUS.md for FASE 2 CBA detail.
- **Note:** ROADMAP_STATUS.md remains the historical FASE 2 snapshot; this tracker supersedes for S2/S3 phase status.

### S3.1 — Governance / billing cleanup activation

- **Status:** CLOSED (audit); activation reflected in code.
- **Confirmed done:** S3.1.A duplication audit (docs/ARCHITECTURE/S3_1_A_DUPLICATION_AUDIT.md); App gate switched to useWorkspaceUsage + useOrgBilling per comment in App.jsx.
- **Not done:** No separate “S3.1.B” implementation doc; no broad refactor of all duplicated surfaces beyond gate.
- **Note:** Legacy/risk: Some legacy orgs.seat_limit / org.billing_status reads remained until S3.3.H / S3.3.I and DB alignment (S3.3.F).

### S3.2.A — Membership schema preparation

- **Status:** CLOSED.
- **Confirmed done:** membership_status enum; org_memberships extended; backfill; constraints (migration 20260315100000).
- **Not done:** N/A.
- **Note:** Design in S3_2_MEMBERSHIP_LIFECYCLE_DESIGN.md.

### S3.2.B — Active seat semantics

- **Status:** CLOSED.
- **Confirmed done:** enforce_seat_limit and org_add_member count only active; is_org_member and is_org_owner_or_admin require status = 'active'; usage.js and useBillingUsage count active; UI patches (Settings, BillingOverSeat) for active count where applied; WorkspaceContext bootstrap/revalidate filter active.
- **Not done:** N/A.
- **Note:** Seat *limit* source was still split (trigger vs RPC) until S3.3.F.

### S3.2.C — First-membership fallback cleanup

- **Status:** CLOSED.
- **Confirmed done:** S3_2_C_0_FIRST_MEMBERSHIP_FALLBACK_AUDIT; patches S3.2.C.1–S3.2.C.11 to supabase.js and call sites; S3_2_C_FINAL_VERIFICATION_AUDIT confirms zero remaining dangerous first-membership inference in app code.
- **Not done:** Edge functions and migrations were out of scope for that audit; no “first membership” there by design.
- **Note:** Pattern: require activeOrgId or entity-derived org_id; fail with missing_org_context when neither.

### S3.3.A — Billing / Access Legacy Audit

- **Status:** CLOSED (audit).
- **Confirmed done:** Audit that led to S3.3.B (edge functions) and S3.3.C (DB/RLS).
- **Not done:** No standalone audit doc file in repo; status inferred from S3.3.B/C context.
- **Note:** If a dedicated S3.3.A doc is added later, link it here.

### S3.3.B — Active membership enforcement (billing edge functions)

- **Status:** CLOSED.
- **Confirmed done:** create_checkout_session, stripe-checkout-session, stripe-portal-session, stripe_create_checkout, stripe_create_portal: org_memberships check includes .eq("status", "active").
- **Not done:** N/A.
- **Note:** Repo: supabase/functions/*.ts.

### S3.3.C — DB / RLS Billing Access Audit

- **Status:** CLOSED (audit).
- **Confirmed done:** docs/ARCHITECTURE/S3_3_C_DB_RLS_BILLING_ACCESS_AUDIT.md; recommended S3.3.D (billing RLS active) and seat-limit alignment.
- **Not done:** Billing status and seat-limit source canonicalization at DB level not fully done (org_billing_allows_access still uses orgs.billing_status; see “Current open risks”).
- **Note:** Audit only; patches applied in S3.3.D and S3.3.F.

### S3.3.D — Billing RLS active membership enforcement

- **Status:** CLOSED.
- **Confirmed done:** Migration 20260315130000_s3_3d_billing_rls_active_membership.sql: org_billing_select_own, billing_org_entitlements_select, billing_customers_select, billing_subscriptions_select, billing_invoices_select, billing_overrides_select_same_org now require status = 'active' in org_memberships.
- **Not done:** N/A.
- **Note:** RLS only; no change to org_billing_allows_access or billing_status source.

### S3.3.E — Seat limit source audit

- **Status:** CLOSED (audit).
- **Confirmed done:** docs/ARCHITECTURE/S3_3_E_SEAT_LIMIT_SOURCE_AUDIT.md; recommended S3.3.F (org_add_member) and UI alignment (S3.3.H, S3.3.I).
- **Not done:** Webhook does not write orgs.seat_limit; UI was still on org.seat_limit until S3.3.H/I.
- **Note:** Audit only; patches applied in S3.3.F, S3.3.H, S3.3.I.

### S3.3.F — Seat limit DB enforcement alignment

- **Status:** CLOSED.
- **Confirmed done:** Migration 20260315140000_s3_3f_org_add_member_seat_limit_align.sql: org_add_member derives v_seat_limit from get_org_billing_state + get_plan_limits with fallback to orgs.seat_limit.
- **Not done:** N/A.
- **Note:** Trigger unchanged; RPC and trigger now share same plan-based limit source when org_billing row exists.

### S3.3.G — Seat limit UI surface alignment audit

- **Status:** CLOSED (audit).
- **Confirmed done:** docs/ARCHITECTURE/S3_3_G_SEAT_LIMIT_UI_SURFACE_AUDIT.md; recommended S3.3.H (Settings) and S3.3.I (BillingOverSeat).
- **Not done:** N/A.
- **Note:** Audit only; patches applied in S3.3.H, S3.3.I.

### S3.3.H — Settings seat limit UI alignment

- **Status:** CLOSED.
- **Confirmed done:** Settings.jsx consumes useBillingUsage(activeOrgId); seatLimit = canonicalSeatsLimit ?? org?.seat_limit ?? null; display “Seat limit” and Add member guard/disabled use it; assertOrgWithinLimit kept.
- **Not done:** N/A.
- **Note:** Repo-grounded: src/pages/Settings.jsx (import useBillingUsage, canonicalSeatsLimit, S3.3.H comment).

### S3.3.I — BillingOverSeat UI alignment

- **Status:** CLOSED.
- **Confirmed done:** BillingOverSeat.jsx consumes useBillingUsage(activeOrgId); seatLimit = canonicalSeatsLimit ?? org?.seat_limit ?? 1; display billingOverSeat_seatsCount uses it.
- **Not done:** N/A.
- **Note:** Repo-grounded: src/pages/BillingOverSeat.jsx (import useBillingUsage, canonicalSeatsLimit, S3.3.I comment).

### S3.3.J — DB Billing Status Split-Brain Audit

- **Status:** CLOSED (audit).
- **Confirmed done:** docs/ARCHITECTURE/S3_3_J_DB_BILLING_STATUS_SPLIT_BRAIN_AUDIT.md; recommended S3.3.K (org_billing_allows_access prefer org_billing.status).
- **Not done:** N/A.
- **Note:** Audit only; patch applied in S3.3.K.

### S3.3.K — org_billing_allows_access canonical fallback

- **Status:** CLOSED.
- **Confirmed done:** Migration 20260315150000_s3_3k_org_billing_allows_access_canonical.sql. org_billing_allows_access now prefers org_billing.status with fallback to orgs.billing_status; RLS and triggers share same effective source.
- **Not done:** N/A.
- **Note:** Single DB helper for “billing allows access”; no change to policy expressions.

### S3.3.L — Decision Scheduler Billing Status Audit

- **Status:** CLOSED (audit).
- **Confirmed done:** docs/ARCHITECTURE/S3_3_L_DECISION_SCHEDULER_BILLING_STATUS_AUDIT.md; recommended aligning scheduler to same billing-access semantics (S3.3.M).
- **Not done:** N/A.
- **Note:** Audit only; patch applied in S3.3.M.

### S3.3.M — Decision Scheduler Billing Status Alignment

- **Status:** CLOSED.
- **Confirmed done:** RPC get_org_ids_billing_allows_access() (migration 20260315160000); decision-scheduler/index.ts selects orgs via this RPC instead of orgs.billing_status.
- **Not done:** N/A.
- **Note:** Scheduler no longer uses legacy orgs.billing_status only.

### S3.3.N — Billing Access Logic Deduplication

- **Status:** CLOSED.
- **Confirmed done:** Migration 20260315170000_s3_3n. get_org_ids_billing_allows_access() now reuses org_billing_allows_access(o.id); duplicated LEFT JOIN + COALESCE logic removed.
- **Not done:** N/A.
- **Note:** Single source of billing-access semantics in DB; scheduler and RLS both use org_billing_allows_access.

### S3.4.A — Admin Console / Membership Governance

- **Status:** PARKED (planned; not implemented).
- **Confirmed done:** Nothing. Explicitly out of scope for S3.x.
- **Not done:** Invitations; invitation expiry; membership/user/account states; admin visibility into billing/seat/user status. No implementation.
- **Note:** Do not implement in current S3.x scope; reopen when phase is approved.

### FASE 3 — Alertes de negoci

- **Status:** CLOSED.
- **Confirmed done:** 3.1: Auditoria RLS i definicions; convenció dedupe_key biz:; contracte F2/O1/S1/O2 (FASE_3_1_ALERTES_RLS_DEFINICIONS_AUDIT.md). 3.2: RPC `run_alert_engine(p_org_id)`; F2, O1, S1, O2; escriptura a `alerts` amb biz: (migració 20260315180000_f3_2). 3.3: businessAlertsApi.js + useBusinessAlerts; filtre biz:; acknowledge/resolve/runEngine. 3.4: BusinessAlertsBadge al TopNavbar; drawer amb llista, Acknowledge/Resolve. 3.5: Documentació i tancament (FASE_3_5_DOCUMENTACIO_I_TANCAMENT.md): contracte final, limitacions V1, riscos/debt, cauteles.
- **Limitacions V1 (expressament fora):** Invocació manual del motor; sense auto-resolve; sense nous canals; sense unificació amb OPS/SHIPMENT; F6 severity no tocat. Dependències futures (no activades): cron/scheduler per al motor; nous tipus; patch F6; i18n; enllaços a entitat.

### FASE 3.1 — Auditoria RLS i definicions

- **Status:** CLOSED.
- **Confirmed done:** Auditoria d’alerts/alert_definitions, RLS, RPCs ack/resolve/mute; convenció dedupe_key; proposta de contaminació (prefix biz:); contracte mínim per al motor. Decisió READY per 3.2.
- **Note:** Només document; sense canvis de codi.

### FASE 3.2 — Motor d'alertes de negoci

- **Status:** CLOSED.
- **Confirmed done:** Migració 20260315180000_f3_2_run_alert_engine.sql; funció run_alert_engine(org_id); comprovacions F2, O1, S1, O2; INSERT a alerts amb ON CONFLICT; severity dins ('low','medium','high','critical'); document FASE_3_2_MOTOR_ALERTES_IMPLEMENTATION.md.
- **Not done:** UI; auto-resolve; cron; no s’ha executat la migració en entorn real ni invocat des del client.

### FASE 3.3 — API / helpers per a la UI d'alertes

- **Status:** CLOSED.
- **Confirmed done:** businessAlertsApi.js: getBusinessAlerts (filtrat dedupe_key LIKE 'biz:%'), getBusinessAlertsCount, alertAcknowledge, alertResolve, runBusinessAlertEngine. useBusinessAlerts(orgId): alerts, count, loading, error, refetch, acknowledge(id), resolve(id), runEngine(). Tot org-scoped; sense contaminació OPS/SHIPMENT.
- **Not done:** Bell UI; Drawer UI (implementats a 3.4).

### FASE 3.4 — UI Bell + comptador + Drawer

- **Status:** CLOSED.
- **Confirmed done:** BusinessAlertsBadge (icona AlertTriangle, badge amb count) al TopNavbar (davant de DecisionBadge). Drawer: capçalera "Business alerts", llista d’alertes (títol, message truncat, severity dot), botons Acknowledge i Resolve per fila; loading/empty/error; refetch en obrir i després d’accions (via hook). Consum de useBusinessAlerts(activeOrgId); només alertes biz: (sense OPS/SHIPMENT).
- **Not done:** runEngine no exposat a la UI (opcional per a fase futura).

### FASE 3.5 — Documentació i tancament

- **Status:** CLOSED.
- **Confirmed done:** Document FASE_3_5_DOCUMENTACIO_I_TANCAMENT.md: contracte final de FASE 3, limitacions V1, riscos i control debt explícits, cauteles post-tancament, dependències futures anotades però no activades. Actualització del tracker: FASE 3 i 3.5 marcats CLOSED; resum executiu actualitzat.
- **Not done:** Cap canvi de codi, motor, API ni UI; només tancament documental.

### FASE 4 — Tasques / accions canòniques

- **Status:** CLOSED.
- **Confirmed done:** 4.1–4.4 tancades: contracte task/action canònic (tasks vs project_tasks); linkage `source` + `source_ref_type` + `source_ref_id`; Task Inbox canònica a `/app/inbox`; lifecycle net `open` / `done`; gates/blocking-state documentats i alineats amb tasks.
- **Not done:** No scheduler/automation de tasks; no navegació generitzada per `source_ref_*`; `project_tasks` continua com a engine legacy per `project_gate`; Admin Console segueix PARKED (S3.4.A).

### FASE 4.1 — Contracte task/action canònic

- **Status:** CLOSED (documentation/contract only; no implementation).
- **4.1.A completed:** FASE_4_1_CANONICAL_TASK_ACTION_CONTRACT_AUDIT.md: canonical model (tasks vs project_tasks), repo state, contract gaps, decisions, out-of-scope.
- **4.1.B completed:** FASE_4_1_B_TASK_ACTION_DATA_CONTRACT.md: semantic field contract (source, entity_type, entity_id); allowed source set (manual, sticky_note, alert, decision, gate); minimal linkage (source_ref_type, source_ref_id); dedupe and tenancy rules; in-scope use cases for 4.2; exit criteria met.
- **Not done:** No schema, code, or UI changes; implementation deferred to 4.2.

### FASE 4.2 — Linkage alert/decision/gate → task

- **Status:** CLOSED (4.2.A gate contract fix applied).
- **Confirmed done:** One migration: tasks.source expanded; source_ref_type, source_ref_id added; entity_type includes org; index for origin dedupe. Service: findOpenTaskByOrigin, createOrGetTaskFromOrigin. Alert → task: BusinessAlertsBadge. Decision → task: DecisionNotificationItem / DecisionBadge. **Gate → task (contract-correct):** Dashboard "Requereix atenció" (blocked projects): "Create unblock task" per project with `source_ref_type='project_gate'`, `source_ref_id=project:{projectId}`. **4.2.A:** BillingOverSeat is not a project_gate; action removed from BillingOverSeat and implemented on Dashboard blocked list only. Org safety: activeOrgId required; no first-membership.
- **Not done:** No automation; no scheduler; no decision success toast in dropdown. BillingOverSeat has "Create unblock task" with `workspace_gate` (truthful; not the project gate use case). See FASE_4_2_TASK_ACTION_LINKAGE_IMPLEMENTATION.md.

### FASE 4.3.A — Canonical task inbox audit

- **Status:** CLOSED (audit only; no implementation).
- **Confirmed done:** FASE_4_3_A_CANONICAL_TASK_INBOX_AUDIT.md. Exhaustive list of task data surfaces (getTasks, getOpenTasks, findOpenTaskByOrigin, getCalendarEvents, TasksSection, TasksWidget, phaseGates, Diagnostics); current UI surfaces (Dashboard/TasksWidget, Orders/TasksSection, Calendar.jsx vs CalendarPage); lifecycle (open/done/snooze; RLS user_id); legacy/overlap (project_tasks, sticky notes, Calendar.jsx unmounted); multi-tenant (org_id must be passed by app; RLS is user_id). Verdict: partial base (TasksWidget); no single canonical inbox; minimum opening for 4.3.B documented.
- **Not done:** No code or UI changes; 4.3.B implemented separately.

### FASE 4.3.B — Canonical task inbox (UI contract + minimal implementation)

- **Status:** CLOSED.
- **Confirmed done:** Pàgina dedicada Task Inbox a `/app/inbox` (TaskInbox.jsx). Llegeix `tasks` amb `getTasks({ org_id: activeOrgId })`; filtres mínims status (open/done/all) i source (all/manual/sticky_note/alert/decision/gate). UI mostra title, status, due_date, entity context, **source** (badge), accions Mark done, Snooze +1d/+3d, Open entity; bulk Mark done i Snooze. getTasks accepta `filters.source`; getOpenTasks retorna [] si no hi ha activeOrgId. Diagnostics: skip task check si !activeOrgId; totes les crides getTasks amb org_id. Enllaç “View all” al TasksWidget; entrada Sidebar (nav.taskInbox); ruta a App.jsx. i18n tasks.inbox.* i nav.taskInbox (en, ca, es). FASE_4_3_B_CANONICAL_TASK_INBOX_IMPLEMENTATION.md.
- **Not done:** No RLS changes; no calendar unification; no navegació per source_ref_type/source_ref_id; no analytics, comments, assignacions, SLA, histories, automatismes.

### FASE 4.3.C — Task lifecycle / closure semantics audit

- **Status:** CLOSED (audit only; no implementation).
- **Confirmed done:** FASE_4_3_C_TASK_LIFECYCLE_CLOSURE_SEMANTICS_AUDIT.md. Contracte real de status (open/done/snoozed a schema i índex; només open/done escrits); transicions (create, mark done, snooze, delete, bulk); avaluació snoozed (present a schema/índex/findOpenTaskByOrigin, cap mutació el fa servir = deute controlat); lectures que depenen de status; dedupe/lifecycle; semàntica UI; multi-tenant en camins de lifecycle. Verdict: contracte parcialment acceptable; següent mínim = subbloc opcional 4.3.D lifecycle semantics cleanup (decisió snoozed, opcional completed_at).
- **Not done:** No code or schema changes; 4.3.D implementat posteriorment com a cleanup mínim (vegeu 4.3.D).

### FASE 4.3.D — Task lifecycle semantics cleanup

- **Status:** CLOSED.
- **Confirmed done:** Migration 20260317120000_f4_3_d_tasks_status_cleanup.sql: normalitza qualsevol `status = 'snoozed'` a `open`; elimina tots els CHECK constraints existents sobre `tasks.status` i en crea un de nou `tasks_status_check` amb contracte `status IN ('open', 'done')`; actualitza l'índex `idx_tasks_origin_open` perquè consideri només `status = 'open'` com a actiu per a dedupe d'origen. Helper `findOpenTaskByOrigin` ara busca exclusivament tasques amb `status = 'open'`. Contracte canònic simplificat a dos estats: open / done; snooze = open + due_date futura.
- **Not done:** No RLS; no canvis de UI ni de comportament de snooze; no ús de completed_at.

---

## Controlled debt (non-blocking)

- **Legacy project gate engine:** `project_tasks` continua existint com a engine legacy de `project_gate`; el contracte canònic de tasks/gates ja el tracta com a supporting-only.
- **BillingLocked hard gate:** `BillingLocked` continua sense unblock task; es considera un gate dur que requereix resolució de billing directa.
- **phaseGates.js:** continua com a validació complementària, no com a gate engine primari.
- **Tasks RLS:** `tasks` manté RLS per `user_id` en lloc de `org_id`; l’app força org-safety des de frontend/serveis; és deute conegut.
- **Finances legacy:** `Finances.jsx`, `expenses`, `incomes`, `recurring_expenses`, `finance_categories`, `payments` continuen com a món legacy; el core financer canònic és ledger+FX+profit engine+exports.
- **COGS / landed cost:** continuen parcials / no activats; els contractes futurs (Fase 6.1 i 6.4) estan fixats, però no s’han activat càlculs ni UI.
- **Cashflow UI:** `Cashflow.jsx` continua sent forecast (`getCashflowForecast`), no una UI de cashflow realitzat sobre ledger.
- **Dashboard heurístics:** KPIs com `getDashboardStats` i altres agregats sobre `payments` continuen existint com a mètriques heurístiques, no com a reporting financer oficial.
- **Admin Console:** la consola d’admin (S3.4.A) encara no està implementada; només existeix el contracte futur (FASE 6.3).

---

## Parked / future tracked items

| Item | Scope note | Status |
|------|------------|--------|
| **S3.4.A — Admin Console / Membership Governance** | Invitations; invitation expiry; membership/user/account states; admin visibility into billing/seat/user status. | PARKED — no implementation yet (only contract documented in FASE 6.3). |

---

## Roadmap blocs (P0 / P1 / P2 / P3)

### P0 — Blockers reals

- **Status:** CLOSED (multi-tenant visible cleanup, PO hardening i reset documental aplicats).  
- **Scope original:**  
  - **P0.1 — Multi-tenant cleanup de superfícies visibles**  
  - **P0.2 — Purchase Orders hardening**  
  - **P0.3 — Roadmap / documentation reset**

### P1 — Producte visible / UI / UX

- **Status:** CLOSED  
- **Scope realitzat:**  
  - **P1.1 — Dashboard V1:** dashboard usable de veritat (widgets, estat org, alertes, tasks).  
  - **P1.2 — Projects / ProjectDetail:** projectes i detall productitzats, amb flows principals clars.  
  - **P1.3 — Operations flow visible:** connexions visibles entre Projects, Orders, Suppliers i Inventory.  
  - **P1.4 — Onboarding / demo flow comercial:** recorregut d’entrada i demo entendible per prospects.  
  - **P1.5 — Visual consistency / polish:** passades de consistència visual i polish sobre superfícies clau.

### P2 — Millores fortes

- Analytics net (sobre el model canònic).
- Realized cashflow UI (sobre `amount_base_cash`/`cash_at`).
- Observabilitat mínima (logs, mètriques bàsiques, health).
- Encapsular finances legacy darrere surfaces canòniques.
- Governance/admin millor (read models i superfícies d’admin).
- Responsive i polish fort (layouts, interaccions, accessibilitat bàsica).

### P3 — Futur / expansió

- Admin Console completa.
- COGS complet (cost pool + WAC activats).
- Automatitzacions avançades (decision/alerts/tasks).
- Connectors nous (Shopify, altres marketplaces).
- Assistant layer.
- Listing intelligence.
- Expansió de plataforma (més sistemes i fluxos).

---

## Rules for updating this file

- Update this file **after each closed phase** so it remains the single checkpoint.
- Do **not** mark a phase CLOSED without **repo-grounded proof** (migration file, code change, or audit doc present in repo).
- Use this file as the **first checkpoint** before opening a new phase: confirm current status and open risks, then proceed.
- When adding a phase, add a row to the tracker table and a detailed subsection; keep “Current open risks” and “Parked” sections tight and factual.
