-- ============================================================
-- 2026-05-14 · Wave 2 — RLS auth.uid() optimization
-- ============================================================
-- Supabase performance advisor flags 90 policies that call `auth.uid()`
-- (or other `auth.<fn>()` helpers) directly in USING/WITH CHECK. Postgres
-- treats those calls as VOLATILE in that position, so the function is
-- evaluated once per row scanned. At 500 customers with tables in the
-- 100k-row range that's catastrophic: a single SELECT can do hundreds of
-- thousands of auth.uid() calls.
--
-- The standard fix is to wrap each call as `(SELECT auth.uid())`. The
-- planner then materializes the value via an InitPlan — one call per
-- query, not one per row.
--
-- Security semantics are IDENTICAL: same value, same scoping. We are
-- not adding or removing permissions, just letting Postgres cache the
-- function result.
--
-- Strategy:
--   • Snapshot every problematic policy from pg_policies.
--   • For each, regex-rewrite the qual + with_check expressions to wrap
--     bare `auth.uid()` calls (and friends).
--   • DROP and re-CREATE the policy with the new expression.
--   • Everything inside a single migration → atomic. If any single
--     re-CREATE fails, the entire migration rolls back and the original
--     policies survive untouched.
--
-- This migration is safe to run with a live session — DROP/CREATE on a
-- policy is sub-millisecond and never blocks SELECTs.
-- ============================================================

DO $migration$
DECLARE
  pol record;
  new_qual text;
  new_check text;
  using_clause text;
  check_clause text;
  roles_list text;
  drop_sql text;
  create_sql text;
  fixed_count int := 0;
BEGIN
  FOR pol IN
    SELECT
      schemaname, tablename, policyname, cmd, permissive, roles,
      qual, with_check
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (
        (qual ~ '\mauth\.(uid|role|jwt|email)\(\)' AND qual !~ '\(\s*[Ss][Ee][Ll][Ee][Cc][Tt]\s+auth\.(uid|role|jwt|email)\(\)\s*\)')
        OR
        (with_check ~ '\mauth\.(uid|role|jwt|email)\(\)' AND with_check !~ '\(\s*[Ss][Ee][Ll][Ee][Cc][Tt]\s+auth\.(uid|role|jwt|email)\(\)\s*\)')
      )
  LOOP
    -- Rewrite bare auth.<fn>() into (SELECT auth.<fn>()).
    -- The negative lookbehind isn't supported in posix regex, so we use a
    -- two-pass trick: first wrap, then collapse double-wrapping that the
    -- first pass may have produced if the original already had partial
    -- wrapping.
    new_qual := pol.qual;
    new_check := pol.with_check;

    IF new_qual IS NOT NULL THEN
      new_qual := regexp_replace(new_qual, '\mauth\.uid\(\)', '(SELECT auth.uid())', 'g');
      new_qual := regexp_replace(new_qual, '\mauth\.role\(\)', '(SELECT auth.role())', 'g');
      new_qual := regexp_replace(new_qual, '\mauth\.jwt\(\)', '(SELECT auth.jwt())', 'g');
      new_qual := regexp_replace(new_qual, '\mauth\.email\(\)', '(SELECT auth.email())', 'g');
      -- Collapse `(SELECT (SELECT auth.uid()))` if any pre-existing wrap was partially present.
      new_qual := regexp_replace(new_qual, '\(SELECT \(SELECT (auth\.(uid|role|jwt|email)\(\))\)\)', '(SELECT \1)', 'g');
    END IF;

    IF new_check IS NOT NULL THEN
      new_check := regexp_replace(new_check, '\mauth\.uid\(\)', '(SELECT auth.uid())', 'g');
      new_check := regexp_replace(new_check, '\mauth\.role\(\)', '(SELECT auth.role())', 'g');
      new_check := regexp_replace(new_check, '\mauth\.jwt\(\)', '(SELECT auth.jwt())', 'g');
      new_check := regexp_replace(new_check, '\mauth\.email\(\)', '(SELECT auth.email())', 'g');
      new_check := regexp_replace(new_check, '\(SELECT \(SELECT (auth\.(uid|role|jwt|email)\(\))\)\)', '(SELECT \1)', 'g');
    END IF;

    -- Build the role list (pg_policies returns it as a Postgres text[]).
    -- We coerce to a comma-separated list of identifiers.
    SELECT string_agg(quote_ident(r), ', ')
      INTO roles_list
      FROM unnest(pol.roles::text[]) r;
    IF roles_list IS NULL OR roles_list = '' THEN
      roles_list := 'public';
    END IF;

    using_clause := CASE WHEN new_qual IS NOT NULL
                         THEN ' USING (' || new_qual || ')'
                         ELSE '' END;
    check_clause := CASE WHEN new_check IS NOT NULL
                         THEN ' WITH CHECK (' || new_check || ')'
                         ELSE '' END;

    drop_sql := format('DROP POLICY %I ON %I.%I',
                       pol.policyname, pol.schemaname, pol.tablename);

    create_sql := format('CREATE POLICY %I ON %I.%I AS %s FOR %s TO %s%s%s',
                         pol.policyname,
                         pol.schemaname,
                         pol.tablename,
                         pol.permissive,
                         pol.cmd,
                         roles_list,
                         using_clause,
                         check_clause);

    RAISE NOTICE 'rls.optim: %.% / %', pol.tablename, pol.policyname, pol.cmd;
    EXECUTE drop_sql;
    EXECUTE create_sql;
    fixed_count := fixed_count + 1;
  END LOOP;

  RAISE NOTICE 'rls.optim done: % policies updated', fixed_count;
END
$migration$;
