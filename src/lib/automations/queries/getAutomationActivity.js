import { supabase } from '../../supabase'
import { AUTOMATION_ACTIVITY_EVENT_TYPES } from '../constants/eventTypes'

const DEFAULT_PAGE_SIZE = 50

function normalizeEventRow(row) {
  return {
    id: row.id,
    orgId: row.org_id,
    proposalId: row.proposal_id,
    executionId: row.execution_id ?? null,
    decisionId: row.decision_id ?? null,
    eventType: row.event_type,
    payload: row.event_payload_json ?? {},
    createdAt: row.created_at,
    actorType: row.actor_type ?? null,
    actorId: row.actor_id ?? null,
  }
}

/**
 * Operator UI activity feed from automation_events.
 *
 * @param {{ orgId: string, page?: number, pageSize?: number, filters?: { eventType?: string } }} params
 * @returns {Promise<{ items: any[], total: number, page: number, pageSize: number }>}
 */
export async function getAutomationActivity(params) {
  const { orgId, page = 1, pageSize = DEFAULT_PAGE_SIZE, filters = {} } = params || {}
  if (!orgId) return { items: [], total: 0, page, pageSize }

  const from = Math.max(0, (page - 1) * pageSize)
  const to = from + pageSize - 1

  const allowed = filters.eventType ? [filters.eventType] : AUTOMATION_ACTIVITY_EVENT_TYPES

  const { data, error, count } = await supabase
    .from('automation_events')
    .select(
      'id, org_id, proposal_id, execution_id, decision_id, event_type, event_payload_json, created_at, actor_type, actor_id',
      { count: 'exact' }
    )
    .eq('org_id', orgId)
    .in('event_type', allowed)
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) {
    console.warn('getAutomationActivity: query failed', { orgId, error: error.message })
    return { items: [], total: 0, page, pageSize }
  }

  const rows = Array.isArray(data) ? data : []
  return { items: rows.map(normalizeEventRow), total: count ?? rows.length, page, pageSize }
}

