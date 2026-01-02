# FREEDOLIAPP — DEEP TEST CHECKLIST (COMET STYLE)

**Test Date:** _______________  
**Tester:** _______________  
**Environment:** Production (https://freedoliapp.vercel.app)  
**Browser:** _______________

---

## EXECUTIVE SUMMARY

**Overall Status:** ⬜ PASS ⬜ FAIL ⬜ PARTIAL

**Critical Blockers Found:** _______________

---

## PHASE 0 — BASELINE

### 0.1 Application Load
- [ ] Application loads without blank screen
- [ ] User can log in successfully
- [ ] Dashboard displays correctly
- [ ] No immediate console errors visible

**Status:** ⬜ PASS ⬜ FAIL  
**Notes:** _______________

---

## PHASE 1 — DEMO MODE ISOLATION (CRITICAL)

### 1.1 Initial State (Demo OFF)
- [ ] Demo mode checkbox unchecked in topbar
- [ ] Projects page shows: "No hi ha projectes" (or real projects only)
- [ ] **NO DEMO-* projects visible**
- [ ] Orders page shows 0 POs (or real POs only)
- [ ] **NO DEMO-* orders visible**
- [ ] Finances page loads without error
- [ ] **NO DEMO-* expenses visible**

**Status:** ⬜ PASS ⬜ FAIL  
**Screenshot:** _______________

### 1.2 Calendar with Demo OFF (CRITICAL TEST)
- [ ] Navigate to Calendar page
- [ ] **ZERO events with "DEMO" prefix visible**
- [ ] **ZERO "Pickup DEMO-PO-*" events**
- [ ] **ZERO "ETA DEMO-PO-*" events**
- [ ] If real events exist, they display correctly

**Status:** ⬜ PASS ⬜ FAIL  
**Screenshot:** _______________  
**Console Errors:** _______________

### 1.3 Create REAL Project
- [ ] Create project named "REAL-TEST-YYYYMMDD-HHMM"
- [ ] Project appears in Projects list immediately
- [ ] Project code does NOT start with "DEMO-"
- [ ] SKU does NOT start with "DEMO-"

**Status:** ⬜ PASS ⬜ FAIL  
**Project Created:** _______________

### 1.4 Toggle Demo Mode ON
- [ ] Click Demo checkbox in topbar (or Settings)
- [ ] Page reloads automatically
- [ ] Projects page now shows: "No hi ha projectes" (or demo projects only)
- [ ] **REAL-TEST project DISAPPEARS (correct behavior)**
- [ ] **ONLY DEMO-* projects visible (if any)**

**Status:** ⬜ PASS ⬜ FAIL  
**Screenshot:** _______________

### 1.5 Calendar with Demo ON
- [ ] Navigate to Calendar page
- [ ] **ONLY DEMO-* events visible**
- [ ] **REAL events hidden (correct behavior)**

**Status:** ⬜ PASS ⬜ FAIL  
**Screenshot:** _______________

### 1.6 Toggle Demo Mode OFF Again
- [ ] Click Demo checkbox to disable
- [ ] Page reloads automatically
- [ ] Projects page shows: "No hi ha projectes" (or real projects only)
- [ ] **REAL-TEST project REAPPEARS (critical test)**
- [ ] **DEMO-* projects disappear**

**Status:** ⬜ PASS ⬜ FAIL  
**Screenshot:** _______________

### 1.7 Verify REAL Project Persists
- [ ] Navigate to Projects page
- [ ] **REAL-TEST project is visible**
- [ ] Click on REAL-TEST project
- [ ] Project detail page loads correctly
- [ ] All project data intact (name, code, SKU, etc.)

**Status:** ⬜ PASS ⬜ FAIL  
**Notes:** _______________

---

## PHASE 2 — NOTES CREATION

### 2.1 Create Note (Demo OFF)
- [ ] Click "+ Notas" button in topbar
- [ ] Enter note title: "REAL-TEST-NOTE"
- [ ] Enter note content: "This is a real test note"
- [ ] Click "Guardar" or "Save"
- [ ] Note appears in notes list
- [ ] Note persists after page refresh

**Status:** ⬜ PASS ⬜ FAIL  
**Error Message (if any):** _______________

### 2.2 Verify Note in Demo OFF
- [ ] Toggle Demo OFF (if not already)
- [ ] Note "REAL-TEST-NOTE" is visible
- [ ] Note can be edited
- [ ] Note can be deleted

**Status:** ⬜ PASS ⬜ FAIL

### 2.3 Verify Note Hidden in Demo ON
- [ ] Toggle Demo ON
- [ ] Note "REAL-TEST-NOTE" is NOT visible (correct)
- [ ] Toggle Demo OFF again
- [ ] Note "REAL-TEST-NOTE" REAPPEARS (critical test)

**Status:** ⬜ PASS ⬜ FAIL

---

## PHASE 3 — FINANCES RECURRING EXPENSES

### 3.1 Load Finances Page (Demo OFF)
- [ ] Navigate to Finances page
- [ ] Page loads without error
- [ ] **NO red error banner: "Error carregant despeses recurrents"**
- [ ] Recurring expenses section displays (even if empty)
- [ ] No console errors related to recurring_expenses

**Status:** ⬜ PASS ⬜ FAIL  
**Error Message (if any):** _______________  
**Console Errors:** _______________

### 3.2 Create Recurring Expense (Demo OFF)
- [ ] Click "Add Recurring Expense" (if button exists)
- [ ] Fill in form:
  - Description: "REAL-TEST-RECURRING"
  - Amount: 50.00
  - Frequency: Monthly
  - Day of month: 1
- [ ] Click "Save"
- [ ] Recurring expense appears in list
- [ ] Recurring expense persists after refresh

**Status:** ⬜ PASS ⬜ FAIL  
**Error Message (if any):** _______________

### 3.3 Verify Recurring Expense Isolation
- [ ] Toggle Demo ON
- [ ] Recurring expense "REAL-TEST-RECURRING" is NOT visible
- [ ] Toggle Demo OFF
- [ ] Recurring expense "REAL-TEST-RECURRING" REAPPEARS

**Status:** ⬜ PASS ⬜ FAIL

---

## PHASE 4 — DEMO DATA GENERATION

### 4.1 Generate Demo Data (Demo ON)
- [ ] Ensure Demo mode is ON
- [ ] Navigate to Settings → Dev Seed (or equivalent)
- [ ] Click "Generate Demo Data" button
- [ ] Progress indicator shows (if available)
- [ ] Success message appears
- [ ] **NO errors in console**

**Status:** ⬜ PASS ⬜ FAIL  
**Error Message (if any):** _______________  
**Console Errors:** _______________

### 4.2 Verify Demo Data Appears (Demo ON)
- [ ] Navigate to Projects page
- [ ] **DEMO-* projects are visible**
- [ ] Navigate to Orders page
- [ ] **DEMO-* orders are visible**
- [ ] Navigate to Calendar page
- [ ] **DEMO-* events are visible**

**Status:** ⬜ PASS ⬜ FAIL

### 4.3 Verify Demo Data Hidden (Demo OFF)
- [ ] Toggle Demo OFF
- [ ] Navigate to Projects page
- [ ] **ZERO DEMO-* projects visible**
- [ ] Navigate to Orders page
- [ ] **ZERO DEMO-* orders visible**
- [ ] Navigate to Calendar page
- [ ] **ZERO DEMO-* events visible**

**Status:** ⬜ PASS ⬜ FAIL

---

## PHASE 5 — DATA INTEGRITY

### 5.1 Verify No Data Loss
- [ ] After all toggles (OFF→ON→OFF), verify:
  - [ ] REAL-TEST project still exists
  - [ ] REAL-TEST-NOTE still exists
  - [ ] REAL-TEST-RECURRING still exists
  - [ ] No data corruption visible

**Status:** ⬜ PASS ⬜ FAIL  
**Data Lost (if any):** _______________

### 5.2 Verify No Data Mixing
- [ ] In Demo OFF mode:
  - [ ] Create REAL project "REAL-MIX-TEST"
  - [ ] Verify it has is_demo=false (check via SQL if possible)
- [ ] In Demo ON mode:
  - [ ] Create demo project "DEMO-MIX-TEST"
  - [ ] Verify it has is_demo=true (check via SQL if possible)
- [ ] Toggle between modes:
  - [ ] REAL-MIX-TEST only visible in OFF
  - [ ] DEMO-MIX-TEST only visible in ON

**Status:** ⬜ PASS ⬜ FAIL

---

## PHASE 6 — CONSOLE ERRORS

### 6.1 Check Console (Demo OFF)
- [ ] Open DevTools Console
- [ ] Navigate through: Dashboard, Projects, Orders, Finances, Calendar
- [ ] **NO red errors related to:**
  - [ ] `is_demo` column missing
  - [ ] `r.from(...).eq is not a function`
  - [ ] RLS violations
  - [ ] Unique constraint violations

**Status:** ⬜ PASS ⬜ FAIL  
**Errors Found:** _______________

### 6.2 Check Console (Demo ON)
- [ ] Toggle Demo ON
- [ ] Navigate through: Dashboard, Projects, Orders, Finances, Calendar
- [ ] **NO red errors**

**Status:** ⬜ PASS ⬜ FAIL  
**Errors Found:** _______________

---

## FINAL VERDICT

### Critical Blockers
- [ ] Calendar shows DEMO data when Demo OFF → **BLOCKER**
- [ ] REAL projects disappear after toggle → **BLOCKER**
- [ ] Notes creation fails → **BLOCKER**
- [ ] Finances recurring expenses error → **BLOCKER**
- [ ] Demo data generation fails → **BLOCKER**

### Overall Assessment
**Status:** ⬜ PASS ⬜ FAIL ⬜ PARTIAL

**Ready for Production:** ⬜ YES ⬜ NO

**Notes:** _______________

---

## SCREENSHOTS

### Screenshot 1: Calendar with Demo OFF (should show ZERO DEMO events)
**Path:** _______________

### Screenshot 2: Projects with Demo OFF (should show REAL-TEST project)
**Path:** _______________

### Screenshot 3: Projects with Demo ON (should show ONLY DEMO projects)
**Path:** _______________

### Screenshot 4: Console Errors (if any)
**Path:** _______________

---

## SQL VERIFICATION (Optional)

If you have access to Supabase SQL Editor, run these queries:

```sql
-- Check REAL project exists and has is_demo=false
SELECT id, name, sku, is_demo, created_at 
FROM projects 
WHERE name LIKE 'REAL-TEST%' 
ORDER BY created_at DESC 
LIMIT 5;

-- Check no DEMO projects have is_demo=false
SELECT id, name, sku, is_demo 
FROM projects 
WHERE name LIKE 'DEMO-%' AND is_demo = false;

-- Check no REAL projects have is_demo=true
SELECT id, name, sku, is_demo 
FROM projects 
WHERE name NOT LIKE 'DEMO-%' AND is_demo = true;
```

**Results:** _______________

