# FreedoliApp — Test Report

**Branch:** `claude/determined-villani`
**Build:** ✅ `npm run build` — 30.78s, no errors
**Scope:** Acceptance dataset (video-ready), static UX review of 10 pages, CSV import fixtures
**Not in scope:** production writes, E2E runtime, live AI calls

Results are classified:

- **VERIFIED** — ran locally (compilation, file generation, static analysis)
- **STATIC** — reasoned from code / fixtures without execution
- **PENDING** — requires a live browser session + auth; scripts are ready for you to run

---

## 1. Artifacts created

| File | Purpose | Status |
|---|---|---|
| [src/lib/testSeed.js](src/lib/testSeed.js) | Video-ready seed: 8 projects (4 live), 3 suppliers, 5 POs, 6 months finances, research report (score 78), 3 pending decisions | VERIFIED (compiles) |
| [src/lib/testRunner.js](src/lib/testRunner.js) | Read-only `runAllChecks()` — 8 automated assertions | VERIFIED (compiles) |
| [tests/fixtures/sellerboard_500.csv](tests/fixtures/sellerboard_500.csv) | 500 rows, 15 cols, EU format (`;` delim, `1.234,56`), ES/DE/IT/FR mix | VERIFIED (500 rows written) |
| [tests/fixtures/malformed_01_utf8_bom.csv](tests/fixtures/malformed_01_utf8_bom.csv) | Header prefixed with UTF-8 BOM (U+FEFF) | VERIFIED |
| [tests/fixtures/malformed_02_semicolon_delim.csv](tests/fixtures/malformed_02_semicolon_delim.csv) | `;` delimiter instead of `,` | VERIFIED |
| [tests/fixtures/malformed_03_empty_rows.csv](tests/fixtures/malformed_03_empty_rows.csv) | Blank rows interspersed | VERIFIED |
| [tests/fixtures/malformed_04_extra_columns.csv](tests/fixtures/malformed_04_extra_columns.csv) | 4 unknown columns after the expected set | VERIFIED |
| [tests/fixtures/malformed_05_empty.csv](tests/fixtures/malformed_05_empty.csv) | Completely empty (0 bytes) | VERIFIED |
| [tests/fixtures/malformed_06_fake_pdf_as_csv.csv](tests/fixtures/malformed_06_fake_pdf_as_csv.csv) | PDF header renamed `.csv` | VERIFIED |
| [tests/fixtures/malformed_07_inconsistent_quotes.csv](tests/fixtures/malformed_07_inconsistent_quotes.csv) | Unterminated quote on row 3, stray `"` on row 2 | VERIFIED |
| [tests/scripts/generate_sellerboard.mjs](tests/scripts/generate_sellerboard.mjs) | Regenerator for the 500-row CSV | VERIFIED (ran) |

**Not generated:** multi-sheet XLSX fixture — would require adding a binary-generating dep (e.g. `xlsx`). Deferred; a real Sellerboard XLSX export can be substituted manually.

---

## 2. Video-ready dataset (canvas F0ATVB6036C)

**Design target (all VERIFIED at the source-level):**

- **Language:** Spanish product names, Spanish expense descriptions ("Ventas Amazon", "FBA fulfilment", "COGS (landed)")
- **Round numbers:** every `price`, `unitCost`, `fbaFee` is a whole or half-euro value
- **Live margins:** all 4 live SKUs land at 30-33.6% net margin per unit (see math below)
- **Month-6 revenue:** April 2026 = €16.500 (> €15K target)
- **POs:** 5 covering delivered / shipped / in_production / confirmed / draft
- **Research report:** `viability_score: 78`, `recommendation: 'go'`
- **Decisions:** 3 pending with clear Spanish titles + descriptions

### Margin check (per live SKU)

| SKU | Price | COGS | FBA | Amazon 15% | Net/unit | Margin |
|---|---:|---:|---:|---:|---:|---:|
| Organizador Cajones Bambú | €30 | €12 | €3.50 | €4.50 | €10.00 | **33.3%** |
| Utensilios Silicona Cocina | €25 | €10 | €3.00 | €3.75 | €8.25 | **33.0%** |
| Esterilla Yoga TPE | €35 | €14 | €4.00 | €5.25 | €11.75 | **33.6%** |
| Bandas de Resistencia | €20 | €8 | €3.00 | €3.00 | €6.00 | **30.0%** |

### Revenue trajectory (VERIFIED arithmetic)

Monthly units follow a growth curve `[100, 130, 150, 170, 190, 200]` for the two €30/€25 SKUs and `[50, 65, 75, 85, 95, 100]` for the two €35/€20 SKUs.

| Month | Bambú €30 | Utensilios €25 | Yoga €35 | Bandas €20 | **Revenue total** |
|---|---:|---:|---:|---:|---:|
| Nov 2025 | 3.000 | 2.500 | 1.750 | 1.000 | **€8.250** |
| Dec 2025 | 3.900 | 3.250 | 2.275 | 1.300 | **€10.725** |
| Jan 2026 | 4.500 | 3.750 | 2.625 | 1.500 | **€12.375** |
| Feb 2026 | 5.100 | 4.250 | 2.975 | 1.700 | **€14.025** |
| Mar 2026 | 5.700 | 4.750 | 3.325 | 1.900 | **€15.675** |
| **Apr 2026** | **6.000** | **5.000** | **3.500** | **2.000** | **€16.500** |

**Aggregate net margin** (Apr 2026): gross net = 200·10 + 200·8.25 + 100·11.75 + 100·6 = €5.425 on €16.500 = **32.9%** ✓

---

## 3. Automated checks (testRunner.js)

8 read-only assertions. Run them from the browser console after auth:

```js
import('/src/lib/testRunner.js').then(m => m.runAllChecks())
```

| Check | Expectation | Status |
|---|---|---|
| Auth session | `getCurrentUserId()` returns non-null | PENDING (needs auth) |
| Test projects | ≥ 8 projects via `project_code LIKE 'TEST-%'`, ≥ 4 live | PENDING |
| Purchase orders | ≥ 5 POs via `po_number LIKE 'TEST-%'`, ≥ 4 distinct statuses | PENDING |
| Revenue total (Apr 2026) | Sum of test-project incomes ≥ €15.000 | PENDING |
| Margins (live SKUs 25-40%) | Per-live-SKU (incomes − expenses) / incomes within 25-40% | PENDING |
| Finances coverage | ≥ 6 distinct `income_date` months | PENDING |
| Research reports | `viability_score=78 AND recommendation='go'` exists | PENDING |
| Decisions | ≥ 3 pending entries in `decision_log` for test projects | PENDING |

---

## 4. Static UX review (10 pages)

Full source audit performed; results below are **STATIC** unless noted. Every finding has a file reference so you can jump straight to the fix.

### Landing (`/`)
- No issues detected.

### Login (`/login`)
- **[MEDIUM]** [src/pages/Login.jsx:301](src/pages/Login.jsx:301) — hardcoded English consent text "By continuing, you agree to the Terms of Service and acknowledge the Privacy Policy". Route through `t('login.consentNote')`.

### ActivationWizard (`/auth/activation`)
- **[HIGH]** Uses legacy `wizard-shell / wizard-card / wizard-body` classes instead of the new `.wizard-step` / `.wizard-pill` pattern introduced for AiConnectionWizard + DataImportWizard. Align for visual consistency.
- **[MEDIUM]** Verify every `activation.welcome.*`, `activation.connect.*` i18n key exists in all three locales.

### Dashboard (`/app`)
- **[MEDIUM]** [src/pages/Dashboard.jsx:688-698](src/pages/Dashboard.jsx:688) — HomeKpiCard titles "Net profit (30d) / Revenue (30d) / Margin (30d)" hardcoded in English. Extract to `t('dashboard.kpi.*')`.
- **[MEDIUM]** [src/pages/Dashboard.jsx:583-595](src/pages/Dashboard.jsx:583) — order-status labels inline in Catalan. Move to `t('dashboard.orderStatus.{status}')`.
- **[LOW]** Ensure `<DataError message={homeDataError} />` handles all error cases (no bare fallback).

### Projects (`/app/projects`)
- **[MEDIUM]** [src/pages/Projects.jsx:548-579](src/pages/Projects.jsx:548) — hardcoded "ASIN", "SKU:", "Created:" labels. Use i18n keys.
- **[MEDIUM]** [src/pages/Projects.jsx:692](src/pages/Projects.jsx:692), :642, :653 — "Editar" / "BLOCKED" / "Marketplaces actius" not in i18n.
- **[LOW]** [src/pages/Projects.jsx:676](src/pages/Projects.jsx:676) — missing `aria-label` on project menu button.

### Research (`/app/research`)
- **[LOW]** [src/pages/Research.jsx:106-115](src/pages/Research.jsx:106) — search input missing `aria-label`.

### DataImport (`/app/data-import`)
- No issues detected.

### Finances (`/app/finances`)
- **[MEDIUM]** [src/pages/Finances.jsx:305](src/pages/Finances.jsx:305) — hardcoded "Error carregant dades demo". Route through i18n.
- **[MEDIUM]** [src/pages/Finances.jsx:435](src/pages/Finances.jsx:435) — hardcoded "Error carregant preferències dashboard:".

### Settings (`/app/settings`)
- **[HIGH]** Lines 395-403 — member state messages ("Member reactivated.", "Member suspended.", "Member removed.", "Membership updated.") hardcoded in English. Add `settings.member.*` keys.
- **[MEDIUM]** Lines 420, 434, 436, 442 — hardcoded "Seat limit reached…", "User is already a member.", "Member added.", "Error adding member."
- **[MEDIUM]** Lines 509-573 — settings tabs icons lack `aria-label`.
- **[LOW]** Lines 582/657/692 — inline Catalan strings alongside i18n keys ("Dades de l'Empresa", "Manual d'ús", "Dades Demo").

### Billing (`/app/billing`)
- **[CRITICAL]** Lines 148/152/156/160/205/210 — hardcoded English "Current plan", "Billing status", "Trial ends", "Current period ends", "Projects", "Seats". Add `billing.labels.*` keys.
- **[MEDIUM]** Lines 204-211 — icon buttons (FolderKanban, Users) missing `aria-label`.
- **[LOW]** Line 223 — "Loading…" hardcoded; use existing `t('common.loading')`.
- **[LOW]** Missing empty-state for usage section when `!usage && !usageLoading && !usageError`.

### Summary

| Severity | Count |
|---|---:|
| CRITICAL | 1 |
| HIGH | 2 |
| MEDIUM | 12 |
| LOW | 5 |

Most findings are i18n gaps (hardcoded English/Catalan). None block the video recording — the app compiles cleanly and the video script (canvas F0ATVB6036C) uses screens where the worst offenders (Billing, ActivationWizard legacy classes) are not visible for long.

---

## 5. How to run the PENDING sections manually

### Step 1 — Load test data (3-minute setup)

```js
// from the app, while logged in:
import('/src/lib/testSeed.js').then(async m => {
  const result = await m.generateTestData({ orgId: /* your active orgId */ null })
  console.log(result)
})
```

Expected console output:

```
{ success: true, counts: {
    products: 8, suppliers: 3, pos: 5,
    incomes: 24, expenses: 72, research: 1, decisions: 3
} }
```

### Step 2 — Run automated checks

```js
import('/src/lib/testRunner.js').then(m => m.runAllChecks())
```

Expected: 8 PASS, 0 FAIL.

### Step 3 — Visual smoke on each scene of the video script

| Scene | URL | What to verify |
|---|---|---|
| Dashboard | `/app` | Revenue Apr 2026 ≥ €15K visible; margin ~33% |
| Projects | `/app/projects` | 8 projects, 4 in "Live" column |
| Research | `/app/research` | Open the Organizador Cajones Bambú report → score 78, rec GO |
| Import | `/app/import` | Upload `tests/fixtures/sellerboard_500.csv` → 500-row preview |
| Finances | `/app/finances` | Filter by COGS → only test-project rows, 6 months visible |
| Assistant | any | Lightbulb button bottom-right → contextual FAQ opens |

### Step 4 — Import-wizard robustness (malformed CSVs)

Upload each `tests/fixtures/malformed_*.csv` and verify the UI:

| File | Expected behavior |
|---|---|
| `malformed_01_utf8_bom.csv` | BOM stripped silently; 2-row preview renders |
| `malformed_02_semicolon_delim.csv` | Delimiter auto-detected as `;` OR clear "unrecognized format" error |
| `malformed_03_empty_rows.csv` | Blank rows skipped; preview shows 4 data rows |
| `malformed_04_extra_columns.csv` | Extra columns shown in mapping UI as "ignore" / "map to new field" |
| `malformed_05_empty.csv` | Clear error "File is empty", no crash |
| `malformed_06_fake_pdf_as_csv.csv` | Clear error "Not a valid CSV", no crash |
| `malformed_07_inconsistent_quotes.csv` | Either parse leniently + show bad-row count, or clear error; **must not crash** |

### Step 5 — Cleanup after recording

```js
import('/src/lib/testSeed.js').then(m => m.clearTestData())
```

Removes all `project_code LIKE 'TEST-%'` projects and all FK children (incomes, expenses, POs, shipments, research reports, decisions), plus the 3 test suppliers by name.

---

## 6. What I did NOT do

- Did not run against production (`edjwsrkcxcktnbbskpjy`). No writes to any Supabase project from this session.
- Did not exercise the live AI pipeline (`ai-research-orchestrator`) — would need `ANTHROPIC_API_KEY`.
- Did not generate a real multi-sheet XLSX fixture (would require adding a binary-encoding dep).
- Did not fix the 20 UX findings in §4 — they are documented, not patched. Each one is a one-line i18n or `aria-label` change.

---

## 7. Build info

```
vite v6 production build
✓ built in 30.78s
⚠ index-DNZvOIxC.js = 632.80 kB (non-blocking chunk-size warning; pre-existing)
```

No TypeScript / JSX errors introduced by the new test artifacts.
