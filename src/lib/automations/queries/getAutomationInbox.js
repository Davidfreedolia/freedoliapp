import { supabase } from '../../supabase'
import { deriveProductIdentity } from '../mappers/deriveProductIdentity'
import { mapAutomationProgressStage } from '../mappers/mapAutomationProgressStage'

const DEFAULT_PAGE_SIZE = 25

function normalizeProposalRow(row) {
  const decision = row?.decisions ?? row?.decision ?? null
  const executions = Array.isArray(row?.automation_executions) ? row.automation_executions : []
  const latestExecution = executions.length > 0 ? executions[0] : null

  const proposalStatus = row?.proposal_status ?? null
  const latestExecutionStatus = latestExecution?.execution_status ?? null

  return {
    id: row.id,
    orgId: row.org_id,
    decisionId: row.decision_id,
    actionType: row.action_type,
    proposalStatus,
    riskBand: row.risk_band ?? null,
    riskScore: row.risk_score ?? null,
    createdAt: row.created_at,
    decision: decision
      ? {
          id: decision.id,
          decisionType: decision.decision_type ?? null,
          title: decision.title ?? null,
          status: decision.status ?? null,
        }
      : null,
    productIdentity: deriveProductIdentity(row),
    latestExecution: latestExecution
      ? {
          id: latestExecution.id,
          executionStatus: latestExecution.execution_status ?? null,
          createdAt: latestExecution.created_at ?? null,
        }
      : null,
    progressStage: mapAutomationProgressStage({ proposalStatus, latestExecutionStatus }),
  }
}

/**
 * Operator UI inbox query for automation proposals.
 *
 * @param {{ orgId: string, page?: number, pageSize?: number, filters?: { status?: string, actionType?: string } }} params
 * @returns {Promise<{ items: any[], total: number, page: number, pageSize: number }>}
 */
export async function getAutomationInbox(params) {
  const { orgId, page = 1, pageSize = DEFAULT_PAGE_SIZE, filters = {} } = params || {}
  if (!orgId) return { items: [], total: 0, page, pageSize }

  const from = Math.max(0, (page - 1) * pageSize)
  const to = from + pageSize - 1

  let query = supabase
    .from('automation_proposals')
    .select(
      `
        id,
        org_id,
        decision_id,
        action_type,
        proposal_status,
        risk_score,
        risk_band,
        payload_json,
        context_snapshot_json,
        source_entity_type,
        source_entity_id,
        created_at,
        decisions:decisions ( id, decision_type, title, status ),
        automation_executions ( id, execution_status, created_at )
      `,
      { count: 'exact' }
    )
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .range(from, to)

  if (filters.status) query = query.eq('proposal_status', filters.status)
  if (filters.actionType) query = query.eq('action_type', filters.actionType)

  const { data, error, count } = await query
  if (error) {
    console.warn('getAutomationInbox: query failed', { orgId, error: error.message })
    return { items: [], total: 0, page, pageSize }
  }

  const rows = Array.isArray(data) ? data : []
  const items = rows.map(normalizeProposalRow)

  return { items, total: count ?? items.length, page, pageSize }
}

