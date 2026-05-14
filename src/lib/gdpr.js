/**
 * GDPR helpers — Article 20 (data portability) + Article 17 (erasure).
 *
 * exportMyData(orgId)
 *   Reads every table the authenticated user can SELECT (RLS does the
 *   filtering automatically) for the given workspace and returns a single
 *   JSON document. The caller decides what to do with it (download as
 *   .json, push to a Drive folder, etc.).
 *
 * requestAccountDeletion({ reason })
 *   Inserts a row in public.account_deletion_requests, signs the user out,
 *   and returns the request id. The super-admin processes it manually
 *   from the Admin Console (see MANUAL_ACTIONS.md).
 *
 * Both calls run with the user's JWT, so RLS protects against another
 * tenant's data leaking into the export.
 */
import { supabase } from './supabase'

/**
 * Tables that are user/org-scoped and should appear in an export. This
 * is a conservative whitelist — only tables the app actually writes to
 * via the user session. Reference / catalog tables (billing_plans,
 * marketplaces, alert_definitions) are intentionally excluded — they are
 * not "personal data" of the subject.
 *
 * Each entry can be:
 *   string — column "org_id" is the tenant filter
 *   { table, filter: 'user_id' | 'org_id' | 'none' } — explicit
 */
const EXPORTABLE = [
  // Workspace + identity
  { table: 'orgs', filter: 'id_in_memberships' },
  { table: 'org_memberships', filter: 'user_id' },
  { table: 'company_settings', filter: 'org_id' },

  // Projects + product pipeline
  'projects',
  'project_tasks',
  'project_phases',
  'project_marketplaces',
  'project_viability',
  'project_profitability_basic',
  'product_identifiers',
  'briefs',
  'listings',
  'research_reports',

  // Suppliers + sourcing
  'suppliers',
  'supplier_quotes',
  'supplier_sample_requests',

  // Logistics
  'purchase_orders',
  'orders',
  'order_items',
  'shipments',
  'forwarders',
  'warehouses',
  'po_amazon_readiness',

  // Inventory + finance
  'inventory_receipts',
  'inventory_receipt_items',
  'financial_ledger',
  'expenses',
  'incomes',
  'recurring_expenses',
  'recurring_expense_occurrences',

  // User content
  'notes',
  'tasks',
  'documents',
  'events',
  'sticky_notes',
  { table: 'audit_log', filter: 'user_id' },
  { table: 'decision_log', filter: 'org_id' },
]

/**
 * Export every row the user is entitled to see for `orgId`.
 *
 * RLS does the filtering — we don't trust the client to scope correctly.
 * Returns:
 *   {
 *     exportedAt: ISO,
 *     userId, userEmail, orgId,
 *     tables: { <name>: rows[] | { error } }
 *   }
 */
export async function exportMyData(orgId) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const tables = {}
  for (const entry of EXPORTABLE) {
    const cfg = typeof entry === 'string' ? { table: entry, filter: 'org_id' } : entry
    try {
      let query = supabase.from(cfg.table).select('*')
      if (cfg.filter === 'org_id' && orgId) {
        query = query.eq('org_id', orgId)
      } else if (cfg.filter === 'user_id') {
        query = query.eq('user_id', user.id)
      }
      // 'id_in_memberships' relies purely on RLS — `orgs` is visible only
      // for orgs the user is a member of, so no extra filter needed.
      const { data, error } = await query
      if (error) {
        tables[cfg.table] = { error: error.message, code: error.code || null }
      } else {
        tables[cfg.table] = data || []
      }
    } catch (err) {
      tables[cfg.table] = { error: err?.message || String(err) }
    }
  }

  return {
    exportedAt: new Date().toISOString(),
    userId: user.id,
    userEmail: user.email,
    orgId: orgId ?? null,
    schemaVersion: 1,
    tables,
  }
}

/**
 * Trigger a browser download of the export JSON. Convenience wrapper.
 */
export async function downloadMyData(orgId) {
  const payload = await exportMyData(orgId)
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `freedoliapp-export-${payload.exportedAt.slice(0, 10)}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
  return payload
}

/**
 * File a GDPR Art. 17 deletion request and sign the user out. Returns the
 * request id so the caller can show a confirmation message.
 */
export async function requestAccountDeletion({ reason, activeOrgId } = {}) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('account_deletion_requests')
    .insert({
      user_id: user.id,
      user_email: user.email,
      active_org_id: activeOrgId || null,
      reason: reason || null,
    })
    .select('id, requested_at')
    .single()

  if (error) {
    throw new Error(`Could not file deletion request: ${error.message}`)
  }

  // Sign the user out so they don't keep generating data while waiting for
  // the manual erasure to run.
  try {
    await supabase.auth.signOut()
  } catch (_) {
    /* don't block on signout failure */
  }

  return data
}
