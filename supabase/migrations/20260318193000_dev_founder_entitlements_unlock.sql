BEGIN;

UPDATE public.billing_org_entitlements
SET
  seat_limit = 999999,
  features_jsonb = jsonb_set(
    jsonb_set(
      COALESCE(features_jsonb, '{}'::jsonb),
      '{team,seats,limit}',
      to_jsonb(999999),
      true
    ),
    '{projects,max,limit}',
    to_jsonb(999999),
    true
  )
WHERE org_id = '334b5e92-d6a1-4ace-8fff-6bdc6d22feb2';

COMMIT;

