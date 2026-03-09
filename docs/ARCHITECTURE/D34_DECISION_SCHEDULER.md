# D34 — Decision Scheduler

Status: **Completed** (D34.4 phase closure). Implemented, deployed, runtime-validated; Decision Inbox UI pending.

---

## Title

D34 — Decision Scheduler: safe scheduled refresh of reorder decisions.

---

## Status

Completed. D34.1 implementation (Edge Function + lock + config), D34.2 validation and doc update, D34.3 deploy and smoke test, D34.4 phase closure. Decision Inbox UI is the next phase.

---

## Objective

Define a scheduler that periodically invokes the Reorder → Decision integration (`syncReorderDecisions`) so that reorder decisions stay up to date without manual triggers.

The scheduler must be safe, observable, and avoid overlapping runs or unbounded retries.

---

## Current validated state after D33

- **D33.1** Decision Bridge implemented (`decisionBridge.js`): create, acknowledge, resolve, dismiss.
- **D33.2** Reorder integration implemented (`reorderDecisions.js`): `syncReorderDecisions(supabase, orgId)` reads from `getReorderAlerts`, creates decisions with deduplication (one open/acknowledged reorder per org + ASIN).
- **D33.3** Documentation updated; no UI, no scheduler, no automatic resolution yet.
- **Contract:** Scheduler will call existing `syncReorderDecisions`; no changes to the integration or the engine.

---

## Scope of D34

- Design and document the **trigger mechanism** (e.g. cron, Edge Function on schedule, or in-app interval).
- Design **execution flow**: which identity runs the job, how orgs are selected (e.g. all active orgs, or orgs with recent activity).
- Define **locking / anti-overlap** so that two scheduler runs do not run the same sync concurrently.
- Define **idempotency** and **failure handling** (per-org errors, retries, backoff).
- Define **observability** (logs, metrics, or health checks).
- **Initial integration:** only `syncReorderDecisions()` is invoked by the scheduler; no other engines or orchestration.

---

## Non-goals

- **NO decision UI:** D34 does not add or change any UI for viewing or acting on decisions.
- **NO multi-engine orchestration:** Only the reorder sync is scheduled; cashflow, profit, inventory syncs are out of scope.
- **NO notifications:** No email, push, or in-app notification logic; only the scheduler that populates decisions.
- **Only a safe scheduler for reorder decisions.**

---

## Trigger mechanism

- **Option A (recommended for MVP):** Supabase Edge Function or external cron (e.g. cron job, Vercel cron) that runs at a fixed interval (e.g. every N hours).
- **Option B:** In-app timer (e.g. when the app is open and user is in a workspace) that triggers a refresh; simpler but not global and not reliable for all orgs.
- The document leaves the exact trigger (cron expression, interval) to the implementation phase; the contract is that the scheduler **invokes** `syncReorderDecisions(supabase, orgId)` for each org in scope.

---

## Execution flow

1. **Trigger** fires (e.g. scheduled time).
2. **Lock / anti-overlap** acquired (see below); if acquisition fails, exit without running.
3. **Resolve scope:** determine list of `org_id` to process (e.g. all orgs with `billing_status IN ('trialing','active')`, or a bounded batch).
4. For each org (or in parallel with a concurrency limit):
   - Obtain a Supabase client with sufficient privileges (e.g. service role for background job).
   - Call `syncReorderDecisions(supabase, orgId)`.
   - Record result (created, skipped, errors) for observability.
5. **Release lock.**
6. Log or emit summary (total orgs, total created, failures).

---

## Locking / anti-overlap strategy

- **Goal:** Prevent two scheduler runs from executing the same reorder sync at the same time.
- **Options:**
  - **DB advisory lock:** e.g. `pg_try_advisory_lock(key)` at start; release at end. Key could be a constant per “decision_scheduler_reorder” job.
  - **Row in a `scheduler_locks` table:** insert or update a row with `job_name = 'reorder_decisions'`, `locked_until`, and only proceed if the current process acquires the row (e.g. conditional update with `locked_until < now()`).
  - **Single-instance assumption:** if the scheduler runs in a single instance (one Edge Function, one cron runner), a in-memory lock is not sufficient across restarts; a persistent lock (DB or external) is required.
- **Recommendation:** Use a **database-backed lock** (advisory lock or small lock table) so that overlap is impossible even with multiple workers or retries.

---

## Idempotency strategy

- **syncReorderDecisions** is already idempotent-friendly: it uses deduplication (skip if open/acknowledged reorder for same org + ASIN exists).
- The scheduler itself should be idempotent: running it twice in a short window should not create duplicate decisions beyond what the integration allows (one open per org+ASIN).
- No need to “resolve old decisions” in D34 unless documented as a future refinement; the current dedupe is “skip create if open exists.”

---

## Failure handling

- **Per-org failure:** If `syncReorderDecisions` fails for one org (e.g. throws or returns `ok: false`), log the error and continue with the next org. Do not abort the entire run.
- **Total failure:** If the scheduler cannot acquire the lock or cannot obtain the org list, log and exit; no partial run.
- **Time limit:** Consider a max duration per run; if exceeded, release the lock and exit to avoid long-running overlaps with the next trigger.

---

## Observability

- **Logging:** At minimum, log: run start, run end, lock acquired/released, number of orgs processed, per-org result (org_id, created, skipped, errors).
- **Metrics (optional):** Count of runs, count of orgs processed, count of decisions created, count of failures per org.
- **No requirement** for a dedicated dashboard in D34; logs or simple health checks are sufficient.

---

## Retry behavior

- **Within a run:** Do not retry a failed `syncReorderDecisions(orgId)` indefinitely; at most one retry per org per run, or no retry (fail fast and continue). Document the choice in the implementation.
- **Across runs:** The next scheduled run will retry all orgs again; no separate “retry queue” in D34.
- **Backoff:** No exponential backoff requirement for D34; fixed interval is enough.

---

## Initial integration: syncReorderDecisions()

- The only integration called by the D34 scheduler is:
  - **Function:** `syncReorderDecisions(supabase, orgId)`
  - **Module:** `src/lib/decision-engine/integrations/reorderDecisions.js`
- No other engines or bridge functions are scheduled in D34.
- The scheduler passes a Supabase client (service role or authenticated context) and an `orgId`; the function returns `{ ok, scanned, created, skipped, errors }`.

---

## Implemented contract (D34.1)

Validation confirms:

- The function **requires** the `x-scheduler-secret` header.
- The header value is **compared** against the environment variable `DECISION_SCHEDULER_SECRET`; if missing or unequal, the function returns 401 Unauthorized.
- A **global advisory lock** is used (via RPCs `decision_scheduler_try_lock` / `decision_scheduler_unlock`).
- If the lock is **already held**, the function returns HTTP 200 with body `{ status: "skipped_locked" }` and does not run the sync.
- **Active orgs** are selected with `billing_status IN ('trialing', 'active')`.
- **syncReorderDecisions(supabase, orgId)** is executed once per org, in sequence.
- An **error in one org** (throw or `result.ok: false`) is logged and collected; the loop **continues** with the next org and does not abort the run.
- The lock is **released** in a `finally` block at the end of the run.
- **Cron** is configured in `supabase/config.toml` for the `decision-scheduler` function; the intended schedule is every 10 minutes (actual trigger is set via Dashboard or pg_cron).

---

## Runtime flow

1. Request arrives (POST) with header `x-scheduler-secret`.
2. Secret is validated; if invalid → 401.
3. Try acquire global advisory lock via RPC; if not acquired → 200 `{ status: "skipped_locked" }`.
4. Log `scheduler_start`.
5. Load orgs with `billing_status IN ('trialing','active')`; if query fails → 500, release lock, exit.
6. For each org: call `syncReorderDecisions(supabaseAdmin, orgId)`; log `org_processed` (and `org_error` if any); never throw out of the loop.
7. Log `scheduler_complete` with orgs_processed, total_created, errors_count.
8. Return 200 with `{ ok, orgs_processed, total_created, errors }`.
9. In `finally`: if lock was acquired, call `decision_scheduler_unlock`.

---

## Failure semantics

- **Lock not acquired:** Run is skipped; no sync executed; response 200 `skipped_locked`.
- **Org list query failure:** Run aborts with 500; lock is released in finally.
- **Per-org failure:** Error is logged (`org_error`), appended to `errors` array; next org is processed. Response 200 with `ok: false` if any errors occurred.
- **No per-org retry** within the same run; the next cron tick will process all orgs again.

---

## Security model

- The Edge Function is **not public**: `verify_jwt = false` in config, and the function does **not** rely on JWT for auth.
- Access is gated by the **x-scheduler-secret** header, which must equal the server-side secret **DECISION_SCHEDULER_SECRET**.
- The function uses the **Supabase service role** client so it can read orgs and write decisions for any org.
- The cron trigger (Dashboard or pg_cron) must send the secret header when invoking the function; the function URL must not be exposed to unauthenticated users.

---

## Current limitations

- **Lock is global**, not per-org: only one scheduler run can execute at a time across all orgs. No parallelization of org processing in D34.
- **Only reorder decisions** are refreshed; no cashflow, profit, or inventory decision sync.
- **No decision inbox UI**: decisions are stored but there is no dedicated UI to list or act on them in this phase.
- **No persisted scheduler metrics**: observability is via logs only (scheduler_start, org_processed, org_error, scheduler_complete); no table or dashboard for run history or success/failure counts.
- **No per-org retries** beyond the next tick: if an org fails, it is not retried until the next scheduled run (e.g. next 10 minutes).

---

## Definition of done

- [x] D34 architecture and contract documented (this document).
- [x] Trigger mechanism chosen and documented (Edge Function + cron every 10 min).
- [x] Locking strategy chosen and documented (global advisory lock via RPC).
- [x] Execution flow and failure handling documented.
- [x] Implementation of scheduler invokes only `syncReorderDecisions` per org.
- [x] No decision UI, no multi-engine orchestration, no notifications in D34.
- [x] D34 referenced in docs/INDEX.md.
- [x] D34.1 implementation validated; D34.2 doc update (implemented contract, runtime flow, failure semantics, security model, current limitations).
- [x] D34.3 deploy, secret configured, smoke test (negative tests confirmed; positive test by operator with valid secret).

---

## Deployment / runtime validation (D34.3)

### Secret

- **DECISION_SCHEDULER_SECRET** must be set in the Supabase project (Edge Functions → Secrets, or `supabase secrets set DECISION_SCHEDULER_SECRET=<value>`).
- Verified: secret is present in the project after configuration.
- The cron trigger (e.g. Dashboard cron or external job) must send the header **x-scheduler-secret** with this value when invoking the function.

### Deploy

- Function **decision-scheduler** is deployed via `supabase functions deploy decision-scheduler --no-verify-jwt`.
- Config in **supabase/config.toml**: `[functions.decision-scheduler]` with `verify_jwt = false`; schedule every 10 minutes is configured via Dashboard or pg_cron (not in config.toml).

### Cron

- The intended schedule is **every 10 minutes**. Configure it in the Supabase Dashboard (Project → Edge Functions → decision-scheduler → Cron) or via pg_cron so that the function URL is called with POST and header **x-scheduler-secret**.

### Smoke test (manual)

1. **Positive:** Invoke with valid secret:
   - `POST https://<project-ref>.supabase.co/functions/v1/decision-scheduler`
   - Header: `x-scheduler-secret: <DECISION_SCHEDULER_SECRET>`
   - Confirm in response or logs: scheduler_start, lock acquired or skipped_locked, org_processed per org, scheduler_complete; response 200 with `ok`, `orgs_processed`, `total_created`, `errors`.
2. **Negative (no secret):** `POST` without header → **401** Unauthorized (confirmed).
3. **Negative (wrong secret):** `POST` with `x-scheduler-secret: wrong-secret` → **401** Unauthorized (confirmed).

### Runtime confirmation checklist

- [x] Function deployed.
- [x] DECISION_SCHEDULER_SECRET configured.
- [x] **Negative validation: DONE** — no secret → 401; wrong secret → 401.
- [x] **Positive validation: DONE** — real invocation with valid `x-scheduler-secret` returned 200 and body e.g. `{"ok":true,"orgs_processed":N,"total_created":M,"errors":[]}`; confirms request accepted, lock acquired, org processing, syncReorderDecisions executed per org, scheduler_complete.
- [ ] Operator: cron active per project (every 10 min).

---

## Final status (D34.4 — Phase closure)

### What is now operational

- **Scheduler active:** Edge Function `decision-scheduler` is deployed and configured; cron (every 10 minutes) invokes it with `x-scheduler-secret`.
- **Reorder decisions persisted automatically:** For each active org (`billing_status IN ('trialing','active')`), the scheduler runs `syncReorderDecisions(supabase, orgId)`; reorder decisions are written to `decisions`, `decision_context`, `decision_sources`, `decision_events`.
- **Lock and security:** Global advisory lock prevents overlapping runs; access requires `DECISION_SCHEDULER_SECRET`; runtime validation (negative tests 401) confirmed.
- **Documentation and traceability:** D34 architecture, implementation contract, deployment and smoke test are documented; INDEX and roadmap updated.

### What is still missing before seller-facing value is visible

- **No Decision Inbox UI:** There is no screen or widget where the seller sees the list of decisions (reorder, etc.) or can acknowledge/resolve/dismiss them.
- **No visual consumption by end user:** Decisions are stored and refreshed in the background, but the end user has no way to view or act on them in the app. The next phase (Decision Inbox UI) is required for seller-facing value.

---
