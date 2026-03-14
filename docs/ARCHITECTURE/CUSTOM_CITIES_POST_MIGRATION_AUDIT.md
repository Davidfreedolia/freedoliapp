# Custom Cities Post-Migration Audit

## Scope

Audit of the table `public.custom_cities` after application of the S1.3 migration  
`supabase/migrations/20260314_s1_3_custom_cities_org_fix.sql`, to confirm multi-tenant (org-based) alignment.

**Sources inspected:** the S1.3 migration file, the bootstrap migration that creates `custom_cities`, and all application usage in `src/`. No migrations or application code were modified.

---

## Current schema

| Column     | Type      | Nullable | Source / notes |
|-----------|-----------|----------|----------------|
| id        | uuid      | NOT NULL | PK, default `gen_random_uuid()` (bootstrap). |
| user_id   | uuid      | NOT NULL | FK to `auth.users(id)` ON DELETE CASCADE, default `auth.uid()` (bootstrap). **Retained** by S1.3. |
| country   | text      | NOT NULL | Bootstrap. |
| city      | text      | NOT NULL | Bootstrap. |
| created_at| timestamptz | NOT NULL | Default `now()` (bootstrap). |
| org_id    | uuid      | NOT NULL* | **Added by S1.3.** FK to `public.orgs(id)` ON DELETE CASCADE. *NOT NULL only if backfill leaves no NULLs; otherwise column remains nullable and migration raises a WARNING. |

**Indexes (post S1.3):**

- `idx_custom_cities_user_id` on `(user_id)` — from bootstrap.
- `idx_custom_cities_org_id` on `(org_id)` — added by S1.3.

---

## Constraints and uniqueness

- **Primary key:** `id` (unchanged).
- **Foreign keys:**  
  - `user_id` → `auth.users(id)` ON DELETE CASCADE (bootstrap).  
  - `org_id` → `public.orgs(id)` ON DELETE CASCADE (S1.3).
- **Uniqueness:** The S1.3 migration **does not** add or alter any UNIQUE constraint or unique index.

**Exact uniqueness rule (unchanged):**

- **`UNIQUE(user_id, country, city)`** (bootstrap).
- There is **no** `UNIQUE(org_id, country, city)`.

So the same `(country, city)` can appear multiple times per org if different users in that org inserted them (one row per user). Uniqueness is still **per user**, not per org.

---

## RLS review

**Removed by S1.3:**

- `"Users can manage own custom cities"` — `FOR ALL USING (auth.uid() = user_id)`.

**Added by S1.3 (org-based only):**

- `"Org members can select custom_cities"` — SELECT, `USING (public.is_org_member(org_id))`.
- `"Org members can insert custom_cities"` — INSERT, `WITH CHECK (public.is_org_member(org_id))`.
- `"Org members can update custom_cities"` — UPDATE, `USING` and `WITH CHECK (public.is_org_member(org_id))`.
- `"Org members can delete custom_cities"` — DELETE, `USING (public.is_org_member(org_id))`.

**Conclusion:** Old user-based policy is fully removed. Only org-based policies remain. There is **no** mixed user + org policy model on this table.

---

## Application compatibility

**Usage in `src/`:**

- **Suppliers.jsx:** `supabase.from('custom_cities').select('*')` and `.insert({ country, city })`.
- **Forwarders.jsx:** `supabase.from('custom_cities').select('*')` and `.insert({ country, city })`.

**Insert payload:** In both places the frontend sends **only** `{ country, city }`. It does **not** send `org_id` or `user_id`.

**Trigger coverage:** S1.3 adds `tr_custom_cities_set_org_id` (BEFORE INSERT), which:

- If `NEW.org_id` is already set, leaves it.
- Otherwise sets `NEW.org_id` from `(SELECT org_id FROM org_memberships WHERE user_id = auth.uid() ORDER BY created_at ASC LIMIT 1)`.

So inserts that omit `org_id` get it from the current user’s first org. The trigger **fully covers** the current frontend insert path **when** the user has at least one org.

**Remaining risk:**

- If the user has **no** row in `org_memberships`, the trigger leaves `org_id` NULL. Then:
  - RLS INSERT requires `is_org_member(org_id)`; with `org_id` NULL the check fails and the insert is rejected.
- So the only insert/update path that can still fail is when the inserting user is not in any org (edge case for unactivated or misconfigured users).

---

## Compliance verdict

**Classification: SAFE HYBRID**

- **Aligned with org model:**  
  - `org_id` is present, backfilled, and (when backfill is complete) NOT NULL with FK to `orgs`.  
  - RLS is entirely org-based (`is_org_member(org_id)`).  
  - Access control and tenant isolation are correct for the canonical SaaS model.
- **Legacy structure still present:**  
  - `user_id` is still in the table and NOT NULL.  
  - Uniqueness is still `(user_id, country, city)`, not `(org_id, country, city)`.
- **Operational safety:**  
  - Existing app code continues to work without changes; the trigger supplies `org_id` on insert.  
  - No mixed RLS model; no remaining user-based policies.

So the table is **safe and org-correct for access control**, but not yet **canonically** normalized (still has `user_id` and user-scoped uniqueness). Hence **SAFE HYBRID**, not **CANONICAL** or **INCOMPLETE**.

---

## Required follow-up (if any)

1. **Optional cleanup (canonical SaaS):**  
   - When the app is updated to send `org_id` on insert and to scope lists by org:  
     - Add `UNIQUE(org_id, country, city)` (and drop the old `UNIQUE(user_id, country, city)` after resolving duplicates if needed).  
     - Then remove the `user_id` column and the trigger `tr_custom_cities_set_org_id` in a **later** migration.  
   - This is not required for correctness or security; it only removes legacy structure.

2. **Data validation (recommended after running S1.3):**  
   - Run:  
     - `SELECT COUNT(*) FROM public.custom_cities;`  
     - `SELECT COUNT(*) FROM public.custom_cities WHERE org_id IS NULL;`  
   - If the second count is > 0, either fix backfill (e.g. assign users to orgs) and re-run the NOT NULL step, or accept nullable `org_id` for those rows and document the exception.

3. **No application code change** is required for current behavior; follow-up is optional and for full canonical cleanup only.
