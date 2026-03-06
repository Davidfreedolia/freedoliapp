begin;

-- =========================================================
-- D11.3 — BILLING PLAN SEED
-- Freedoliapp billing catalog (no free plan, 14-day trial)
-- =========================================================

-- ---------------------------------------------------------
-- 1) PLANS
-- ---------------------------------------------------------

insert into public.billing_plans (
  code,
  name,
  description,
  is_active,
  monthly_price,
  yearly_price,
  currency,
  stripe_product_id,
  stripe_price_monthly_id,
  stripe_price_yearly_id
)
values
  (
    'starter',
    'Starter',
    'For small Amazon sellers starting to systemize operations.',
    true,
    29.00,
    290.00,
    'EUR',
    null,
    null,
    null
  ),
  (
    'growth',
    'Growth',
    'For growing sellers who need deeper workflow and financial control.',
    true,
    79.00,
    790.00,
    'EUR',
    null,
    null,
    null
  ),
  (
    'scale',
    'Scale',
    'For advanced sellers and teams running the full operating system.',
    true,
    199.00,
    1990.00,
    'EUR',
    null,
    null,
    null
  )
on conflict (code) do update
set
  name = excluded.name,
  description = excluded.description,
  is_active = excluded.is_active,
  monthly_price = excluded.monthly_price,
  yearly_price = excluded.yearly_price,
  currency = excluded.currency,
  updated_at = now();

-- ---------------------------------------------------------
-- 2) FEATURES — STARTER
-- ---------------------------------------------------------

with starter_plan as (
  select id
  from public.billing_plans
  where code = 'starter'
)
insert into public.billing_plan_features (
  plan_id,
  feature_code,
  enabled,
  limit_value
)
select starter_plan.id, x.feature_code, x.enabled, x.limit_value
from starter_plan
cross join (
  values
    ('projects.max', true, 5),
    ('team.seats', true, 1),
    ('quotes.enabled', true, null),
    ('samples.enabled', true, null),
    ('purchase_orders.enabled', true, null),
    ('shipments.enabled', true, null),
    ('amazon_ingest.enabled', false, null),
    ('profit_engine.enabled', false, null),
    ('analytics.enabled', false, null)
) as x(feature_code, enabled, limit_value)
on conflict (plan_id, feature_code) do update
set
  enabled = excluded.enabled,
  limit_value = excluded.limit_value,
  updated_at = now();

-- ---------------------------------------------------------
-- 3) FEATURES — GROWTH
-- ---------------------------------------------------------

with growth_plan as (
  select id
  from public.billing_plans
  where code = 'growth'
)
insert into public.billing_plan_features (
  plan_id,
  feature_code,
  enabled,
  limit_value
)
select growth_plan.id, x.feature_code, x.enabled, x.limit_value
from growth_plan
cross join (
  values
    ('projects.max', true, 20),
    ('team.seats', true, 3),
    ('quotes.enabled', true, null),
    ('samples.enabled', true, null),
    ('purchase_orders.enabled', true, null),
    ('shipments.enabled', true, null),
    ('amazon_ingest.enabled', true, null),
    ('profit_engine.enabled', true, null),
    ('analytics.enabled', true, null)
) as x(feature_code, enabled, limit_value)
on conflict (plan_id, feature_code) do update
set
  enabled = excluded.enabled,
  limit_value = excluded.limit_value,
  updated_at = now();

-- ---------------------------------------------------------
-- 4) FEATURES — SCALE
-- ---------------------------------------------------------

with scale_plan as (
  select id
  from public.billing_plans
  where code = 'scale'
)
insert into public.billing_plan_features (
  plan_id,
  feature_code,
  enabled,
  limit_value
)
select scale_plan.id, x.feature_code, x.enabled, x.limit_value
from scale_plan
cross join (
  values
    ('projects.max', true, null),
    ('team.seats', true, 10),
    ('quotes.enabled', true, null),
    ('samples.enabled', true, null),
    ('purchase_orders.enabled', true, null),
    ('shipments.enabled', true, null),
    ('amazon_ingest.enabled', true, null),
    ('profit_engine.enabled', true, null),
    ('analytics.enabled', true, null)
) as x(feature_code, enabled, limit_value)
on conflict (plan_id, feature_code) do update
set
  enabled = excluded.enabled,
  limit_value = excluded.limit_value,
  updated_at = now();

commit;

