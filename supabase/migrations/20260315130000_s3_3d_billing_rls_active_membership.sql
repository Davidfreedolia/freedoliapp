-- ============================================
-- S3.3.D — Billing RLS: active membership only
-- ============================================
-- All billing-related RLS policies that validate org membership via org_memberships
-- must require status = 'active'. Invited/suspended/removed do not get billing read.
-- ============================================

-- 1) org_billing
drop policy if exists "org_billing_select_own" on public.org_billing;
create policy "org_billing_select_own"
on public.org_billing
for select
using (
  org_id in (
    select org_id
    from public.org_memberships
    where user_id = auth.uid()
      and status = 'active'
  )
);

-- 2) billing_org_entitlements
drop policy if exists "billing_org_entitlements_select" on public.billing_org_entitlements;
create policy "billing_org_entitlements_select" on public.billing_org_entitlements for select
  using (org_id in (select org_id from public.org_memberships where user_id = auth.uid() and status = 'active'));

-- 3) billing_customers
drop policy if exists "billing_customers_select" on public.billing_customers;
create policy "billing_customers_select" on public.billing_customers for select
  using (org_id in (select org_id from public.org_memberships where user_id = auth.uid() and status = 'active'));

-- 4) billing_subscriptions
drop policy if exists "billing_subscriptions_select" on public.billing_subscriptions;
create policy "billing_subscriptions_select" on public.billing_subscriptions for select
  using (org_id in (select org_id from public.org_memberships where user_id = auth.uid() and status = 'active'));

-- 5) billing_invoices
drop policy if exists "billing_invoices_select" on public.billing_invoices;
create policy "billing_invoices_select" on public.billing_invoices for select
  using (org_id in (select org_id from public.org_memberships where user_id = auth.uid() and status = 'active'));

-- 6) billing_org_overrides
drop policy if exists "billing_overrides_select_same_org" on public.billing_org_overrides;
create policy "billing_overrides_select_same_org"
on public.billing_org_overrides
for select
to authenticated
using (
  exists (
    select 1
    from public.org_memberships om
    where om.org_id = billing_org_overrides.org_id
      and om.user_id = auth.uid()
      and om.status = 'active'
  )
);
