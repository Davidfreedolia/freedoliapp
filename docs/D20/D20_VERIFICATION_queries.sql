-- D20.6 — Verificació SQL de conversions (trial_registrations)
-- Executar al Supabase SQL Editor o amb psql.

-- Query 1 — Distribució d'estats
SELECT
  status,
  COUNT(*) AS total
FROM trial_registrations
GROUP BY status
ORDER BY status;

-- Query 2 — Trials convertits
SELECT
  id,
  email,
  workspace_id,
  status,
  created_at,
  converted_at
FROM trial_registrations
WHERE status = 'converted'
ORDER BY converted_at DESC
LIMIT 20;

-- Query 3 — Anomalies (ha de retornar 0 files)
SELECT *
FROM trial_registrations
WHERE status = 'converted'
AND converted_at IS NULL;

-- Query 4 — Trials antics no convertits
SELECT
  id,
  email,
  workspace_id,
  status,
  created_at
FROM trial_registrations
WHERE status IN ('started','workspace_created')
ORDER BY created_at ASC
LIMIT 20;
