/**
 * FASE 3.3 — API / helpers per a alertes de negoci (taula alerts, prefix biz:).
 * Només lectura i accions (ack/resolve) per alertes V1 (F2, O1, S1, O2).
 * Sense contaminació amb OPS / SHIPMENT; no inclou UI Bell ni Drawer.
 */

const BIZ_DEDUPE_PREFIX = 'biz:'
const DEFAULT_STATUSES = ['open', 'acknowledged']
const DEFAULT_LIMIT = 50

/**
 * Llista d’alertes de negoci per org (dedupe_key comença per biz:).
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} orgId
 * @param {{ limit?: number, statuses?: string[] }} [options]
 * @returns {Promise<{ items: Array<{ id: string, title: string, message: string | null, severity: string, status: string, dedupe_key: string, entity_type: string | null, entity_id: string | null, first_seen_at: string, created_at: string }>, total: number }>}
 */
export async function getBusinessAlerts(supabase, orgId, options = {}) {
  const { limit = DEFAULT_LIMIT, statuses = DEFAULT_STATUSES } = options
  if (!orgId) {
    return { items: [], total: 0 }
  }

  const { data, error, count } = await supabase
    .from('alerts')
    .select('id, title, message, severity, status, dedupe_key, entity_type, entity_id, first_seen_at, created_at', {
      count: 'exact',
    })
    .eq('org_id', orgId)
    .in('status', statuses)
    .like('dedupe_key', `${BIZ_DEDUPE_PREFIX}%`)
    .order('first_seen_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('getBusinessAlerts:', error)
    return { items: [], total: 0 }
  }

  return {
    items: Array.isArray(data) ? data : [],
    total: typeof count === 'number' ? count : (data?.length ?? 0),
  }
}

/**
 * Comptatge d’alertes de negoci visibles (open/ack) per org, per a badge / UI.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} orgId
 * @returns {Promise<number>}
 */
export async function getBusinessAlertsCount(supabase, orgId) {
  if (!orgId) return 0
  const { count, error } = await supabase
    .from('alerts')
    .select('id', { count: 'exact', head: true })
    .eq('org_id', orgId)
    .in('status', DEFAULT_STATUSES)
    .like('dedupe_key', `${BIZ_DEDUPE_PREFIX}%`)

  if (error) {
    console.error('getBusinessAlertsCount:', error)
    return 0
  }
  return typeof count === 'number' ? count : 0
}

/**
 * Marca una alerta com a acknowledged (RPC alert_acknowledge).
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} alertId
 * @returns {Promise<{ ok: boolean, error?: string }>}
 */
export async function alertAcknowledge(supabase, alertId) {
  if (!alertId) return { ok: false, error: 'alert_id_required' }
  const { error } = await supabase.rpc('alert_acknowledge', { p_alert_id: alertId })
  if (error) {
    console.error('alertAcknowledge:', error)
    return { ok: false, error: error.message }
  }
  return { ok: true }
}

/**
 * Resol una alerta (RPC alert_resolve).
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} alertId
 * @returns {Promise<{ ok: boolean, error?: string }>}
 */
export async function alertResolve(supabase, alertId) {
  if (!alertId) return { ok: false, error: 'alert_id_required' }
  const { error } = await supabase.rpc('alert_resolve', { p_alert_id: alertId })
  if (error) {
    console.error('alertResolve:', error)
    return { ok: false, error: error.message }
  }
  return { ok: true }
}

/**
 * Invocació manual del motor d’alertes de negoci (run_alert_engine).
 * El caller ha de ser membre actiu de l’org.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} orgId
 * @returns {Promise<{ ok: boolean, processed?: number, error?: string }>}
 */
export async function runBusinessAlertEngine(supabase, orgId) {
  if (!orgId) return { ok: false, error: 'org_id_required' }
  const { data, error } = await supabase.rpc('run_alert_engine', { p_org_id: orgId })
  if (error) {
    console.error('runBusinessAlertEngine:', error)
    return { ok: false, error: error.message }
  }
  const result = data && typeof data === 'object' ? data : {}
  return {
    ok: result.ok === true,
    processed: typeof result.processed === 'number' ? result.processed : 0,
    error: result.error || undefined,
  }
}
