#!/usr/bin/env node
/**
 * D20.6 — Verificació SQL de conversions (trial_registrations).
 * Executa lògica equivalent a les 4 queries de validació.
 * Requereix: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY (o SUPABASE_SERVICE_ROLE_KEY)
 */
import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error('Missing VITE_SUPABASE_URL and (VITE_SUPABASE_ANON_KEY or SUPABASE_SERVICE_ROLE_KEY)');
  process.exit(1);
}

const supabase = createClient(url, key);

async function main() {
  console.log('--- Query 1: Distribució d\'estats ---');
  const { data: all, error: e1 } = await supabase
    .from('trial_registrations')
    .select('status');
  if (e1) {
    console.error('Query 1 error:', e1.message);
    return;
  }
  const byStatus = (all || []).reduce((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, {});
  Object.entries(byStatus).sort((a, b) => a[0].localeCompare(b[0])).forEach(([status, total]) => {
    console.log(status, total);
  });

  console.log('\n--- Query 2: Trials convertits (limit 20) ---');
  const { data: converted, error: e2 } = await supabase
    .from('trial_registrations')
    .select('id, email, workspace_id, status, created_at, converted_at')
    .eq('status', 'converted')
    .order('converted_at', { ascending: false })
    .limit(20);
  if (e2) {
    console.error('Query 2 error:', e2.message);
    return;
  }
  console.table(converted || []);

  console.log('--- Query 3: Anomalies (converted sense converted_at) — ha de ser 0 ---');
  const { data: anomalies, error: e3 } = await supabase
    .from('trial_registrations')
    .select('id, status, converted_at')
    .eq('status', 'converted')
    .is('converted_at', null);
  if (e3) {
    console.error('Query 3 error:', e3.message);
    return;
  }
  const count = (anomalies || []).length;
  console.log('Files:', count, count === 0 ? 'OK' : 'ANOMALY');

  console.log('\n--- Query 4: Trials antics no convertits (limit 20) ---');
  const { data: pending, error: e4 } = await supabase
    .from('trial_registrations')
    .select('id, email, workspace_id, status, created_at')
    .in('status', ['started', 'workspace_created'])
    .order('created_at', { ascending: true })
    .limit(20);
  if (e4) {
    console.error('Query 4 error:', e4.message);
    return;
  }
  console.table(pending || []);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
