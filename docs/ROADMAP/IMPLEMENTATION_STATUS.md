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

## Current executive summary

- **Architectural focus:** Multi-tenant and billing/seat hardening (S3.x). **S3.3 is now operationally consolidated.** **FASE 3 — Alertes de negoci is CLOSED.** Membership lifecycle, active-seat semantics, billing RLS/edge alignment, seat-limit and billing-status gating are in place. Business alerts V1: motor (run_alert_engine), API/hook, UI Bell + drawer (F2, O1, S1, O2); prefix biz:; manual invocation; no auto-resolve.
- **Stabilized:** S2 multi-tenant baseline; S3.2 membership and active-seat semantics; S3.3 billing/access alignment; FASE 3.1–3.5 (audit, motor, API, UI, doc closure).
- **Remaining (controlled debt / future work):** Billing: `billing_org_entitlements` not used for RLS gating; `orgs.seat_limit` never updated by webhook. FASE 3: motor not auto-invoked; F6 severity not patched; i18n/entity links not done. Tracked for future phases only.
- **Current next approved phase:** None formally opened. **S3.4.A — Admin Console / Membership Governance** remains **PARKED** (planned, not active).

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

---

## Current open risks

1. **billing_org_entitlements not used for RLS gating:** Webhook writes entitlements; RLS and org_billing_allows_access do not read them for access decisions. Entitlements drive app usage/gate and UI; DB gating uses org_billing (prefer) + orgs fallback. Controlled debt for a future phase.
2. **orgs.seat_limit never updated by webhook:** Stripe webhook updates only billing_org_entitlements. orgs.seat_limit remains default 1 unless updated elsewhere. UI and RPC use canonical/plan-based source with fallback; display aligned. Any other consumer still reading orgs.seat_limit would see stale value.
3. **FASE 3 (alertes de negoci) controlled debt:** Motor invocat només manualment; F6 (run_ops_health_checks) pot escriure severity no vàlida a `alerts` (no patchejat). Documentat a FASE_3_5_DOCUMENTACIO_I_TANCAMENT.md; no bloqueja tancament.

---

## Parked / future tracked items

| Item | Scope note | Status |
|------|------------|--------|
| **S3.4.A — Admin Console / Membership Governance** | Invitations; invitation expiry; membership/user/account states; admin visibility into billing/seat/user status. | PARKED — no implementation yet. |

---

## Rules for updating this file

- Update this file **after each closed phase** so it remains the single checkpoint.
- Do **not** mark a phase CLOSED without **repo-grounded proof** (migration file, code change, or audit doc present in repo).
- Use this file as the **first checkpoint** before opening a new phase: confirm current status and open risks, then proceed.
- When adding a phase, add a row to the tracker table and a detailed subsection; keep “Current open risks” and “Parked” sections tight and factual.
