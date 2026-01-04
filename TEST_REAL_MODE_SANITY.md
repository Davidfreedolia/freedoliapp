# REAL MODE Sanity Test Checklist

## Prerequisites
- ✅ SQL Migration executed: `20260102210407_real_mode_safety.sql`
- ✅ Production deployed: https://freedoliapp.vercel.app
- ✅ Chrome Incognito window ready

## Test Steps

### Step 1: Login & Initial Setup
- [ ] Open Chrome Incognito
- [ ] Navigate to https://freedoliapp.vercel.app
- [ ] Login with credentials
- [ ] **PASS/FAIL**: Login successful

### Step 2: Verify Demo Mode OFF
- [ ] Go to Settings page
- [ ] Verify Demo mode toggle is OFF
- [ ] **PASS/FAIL**: Demo mode is OFF

### Step 3: Projects - No DEMO Data
- [ ] Navigate to Projects page
- [ ] Check project list
- [ ] **PASS/FAIL**: No projects with "DEMO-" prefix visible
- [ ] **Screenshot if FAIL**: Capture Projects page showing DEMO-* projects

### Step 4: Create Real Project
- [ ] Click "New Project" button
- [ ] Enter name: `REAL-TEST-<timestamp>` (e.g., `REAL-TEST-20260102`)
- [ ] Submit form
- [ ] **PASS/FAIL**: Project created successfully
- [ ] **Screenshot if FAIL**: Capture error message
- [ ] **Note**: If duplicate SKU error appears, this is a FAIL

### Step 5: Toggle Demo Mode ON
- [ ] Go to Settings → Toggle Demo mode ON
- [ ] (If Navbar has toggle) Also toggle in Navbar
- [ ] Navigate to Projects page
- [ ] **PASS/FAIL**: Only "DEMO-*" projects visible
- [ ] **PASS/FAIL**: "REAL-TEST-*" project is HIDDEN
- [ ] **Screenshot if FAIL**: Capture Projects page showing REAL-TEST when Demo ON

### Step 6: Toggle Demo Mode OFF
- [ ] Go to Settings → Toggle Demo mode OFF
- [ ] Navigate to Projects page
- [ ] **PASS/FAIL**: "REAL-TEST-*" project is VISIBLE again
- [ ] **PASS/FAIL**: "DEMO-*" projects are HIDDEN
- [ ] **Screenshot if FAIL**: Capture Projects page showing wrong data

### Step 7: GTIN Pool Import
- [ ] Go to Settings → GTIN Pool section
- [ ] Click "Import GTINs" button
- [ ] Create small CSV file:
  ```
  gtin_code,gtin_type,notes
  8437012345678,EAN,Test import
  012345678905,UPC,Test import 2
  ```
- [ ] Upload CSV file
- [ ] Confirm import
- [ ] **PASS/FAIL**: Import successful, no RLS violation error
- [ ] **Screenshot if FAIL**: Capture error message (especially RLS violation)

### Step 8: Finances - Recurring Expenses
- [ ] Navigate to Finances page
- [ ] Check for recurring expenses section/banner
- [ ] **PASS/FAIL**: No red error banner about recurring_expenses
- [ ] **Screenshot if FAIL**: Capture error banner

### Step 9: Console Errors
- [ ] Open DevTools Console (F12)
- [ ] Check for red errors
- [ ] **List errors (max 10 lines)**:
  1. 
  2. 
  3. 
  4. 
  5. 
  6. 
  7. 
  8. 
  9. 
  10. 

## Expected Results Summary

| Step | Expected | Actual | Status |
|------|----------|--------|--------|
| 1. Login | Success | | ⬜ |
| 2. Demo OFF | Toggle OFF | | ⬜ |
| 3. No DEMO projects | Zero DEMO-* | | ⬜ |
| 4. Create REAL-TEST | Success | | ⬜ |
| 5. Demo ON → Hide REAL | REAL hidden | | ⬜ |
| 6. Demo OFF → Show REAL | REAL visible | | ⬜ |
| 7. GTIN Import | No RLS error | | ⬜ |
| 8. Finances | No error banner | | ⬜ |
| 9. Console | No red errors | | ⬜ |

## Known Issues to Watch For

1. **Duplicate SKU Error**: If creating project shows "SKU duplicat" error, the retry logic may not be working
2. **RLS Violation**: If GTIN import shows "new row violates row-level security policy", RLS policy fix didn't apply
3. **Data Mixing**: If DEMO projects appear when Demo OFF, `is_demo` filter is not working
4. **Recurring Expenses Error**: If red banner appears, query chain order may still be wrong

## Code Review Notes

### Potential Issues Found:

1. **generateProjectCode()**: Checks for existing SKU but may have race condition if two users create projects simultaneously
2. **createProject()**: Retry logic should work, but if migration didn't run, old constraint may still cause issues
3. **GTIN Import**: Uses `addGtinToPool()` which should set `user_id` and `is_demo` - verify this works
4. **Recurring Expenses**: Query order fixed, but if foreign key relationships don't exist, may still error

## Next Steps After Testing

- If any step FAILs, check:
  1. Was SQL migration executed?
  2. Is production build using latest code?
  3. Are there any console errors that indicate the issue?
  4. Check Supabase logs for RLS violations



