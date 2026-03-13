/**
 * V1 low-stock lifecycle event emitter.
 * Uses existing getReorderAlerts (reorder candidates) as source of truth. Emits inventory_low_stock
 * per project with dedupe so the same project does not get repeated events within a time window.
 */

import { getReorderAlerts } from '../inventory/getReorderAlerts.js'
import { recordInventoryLowStock } from './record.js'

const DEDUPE_WINDOW_HOURS = 24
const MAX_ALERTS_TO_PROCESS = 30

/**
 * Fetch project IDs that already have an inventory_low_stock event in the last DEDUPE_WINDOW_HOURS.
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string[]} projectIds
 * @returns {Promise<Set<string>>}
 */
async function getProjectsWithRecentLowStockEvent(supabase, projectIds) {
  if (!projectIds?.length) return new Set()
  const since = new Date()
  since.setHours(since.getHours() - DEDUPE_WINDOW_HOURS)
  const sinceIso = since.toISOString()
  const { data, error } = await supabase
    .from('lifecycle_events')
    .select('project_id')
    .eq('event_type', 'inventory_low_stock')
    .gte('created_at', sinceIso)
    .in('project_id', projectIds)
  if (error) return new Set()
  return new Set((data || []).map((r) => r.project_id).filter(Boolean))
}

/**
 * Emit inventory_low_stock lifecycle events from current reorder alerts. One event per project
 * when the project is in reorder-risk and has not had a low-stock event in the last 24h.
 * Safe to call when dashboard or reorder data is loaded; dedupe prevents spam.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} orgId
 * @returns {Promise<{ emitted: number, skipped: number }>}
 */
export async function emitLowStockLifecycleEventsFromAlerts(supabase, orgId) {
  const result = { emitted: 0, skipped: 0 }
  if (!orgId || typeof orgId !== 'string') return result

  let alerts = []
  try {
    alerts = await getReorderAlerts(supabase, orgId, { limit: MAX_ALERTS_TO_PROCESS })
  } catch {
    return result
  }

  const withProject = alerts.filter((a) => a.project_id)
  if (!withProject.length) return result

  const projectIds = [...new Set(withProject.map((a) => a.project_id))]
  const alreadyRecent = await getProjectsWithRecentLowStockEvent(supabase, projectIds)

  for (const alert of withProject) {
    const projectId = alert.project_id
    if (!projectId || alreadyRecent.has(projectId)) {
      result.skipped += 1
      continue
    }
    const metadata = {
      asin: alert.asin ?? null,
      product_name: alert.productName ?? null,
      reorder_units: alert.reorderUnits ?? 0,
      days_until_stockout: alert.daysUntilStockout ?? null,
      confidence: alert.confidence ?? 'low',
      severity: alert.severity ?? 'low'
    }
    const eventId = await recordInventoryLowStock({
      projectId,
      orgId,
      metadata
    })
    if (eventId) {
      result.emitted += 1
      alreadyRecent.add(projectId)
    } else {
      result.skipped += 1
    }
  }

  return result
}
