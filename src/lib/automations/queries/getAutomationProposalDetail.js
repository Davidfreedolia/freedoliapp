import { supabase } from '../../supabase'
import { deriveProductIdentity } from '../mappers/deriveProductIdentity'
import { mapAutomationProgressStage } from '../mappers/mapAutomationProgressStage'

function normalizeProposal(row) {
  if (!row) return null
  const proposalStatus = row.proposal_status ?? null
  const latestExecutionStatus =
    Array.isArray(row?.automation_executions) && row.automation_executions[0]
      ? row.automation_executions[0].execution_status
      : null

  return {
    id: row.id,
    orgId: row.org_id,
    decisionId: row.decision_id,
    actionType: row.action_type,
    proposalStatus,
    approvalMode: row.approval_mode ?? null,
    automationLevel: row.automation_level ?? null,
    riskBand: row.risk_band ?? null,
    riskScore: row.risk_score ?? null,
    payload: row.payload_json ?? null,
    contextSnapshot: row.context_snapshot_json ?? null,
    contextHash: row.context_hash ?? null,
    expiresAt: row.expires_at ?? null,
    invalidatedAt: row.invalidated_at ?? null,
    invalidationReason: row.invalidation_reason ?? null,
    approvedAt: row.approved_at ?? null,
    approvedBy: row.approved_by ?? null,
    rejectedAt: row.rejected_at ?? null,
    rejectedBy: row.rejected_by ?? null,
    createdAt: row.created_at ?? null,
    productIdentity: deriveProductIdentity(row),
    progressStage: mapAutomationProgressStage({ proposalStatus, latestExecutionStatus }),
  }
}

/**
 * Fetch full proposal detail for operator UI.
 *
 * @param {{ orgId: string, proposalId: string }} params
 * @returns {Promise<{ proposal: any|null, decision: any|null, approvals: any[], executions: any[], events: any[], decisionContext: any[], decisionSources: any[] }>}
 */
export async function getAutomationProposalDetail(params) {
  const { orgId, proposalId } = params || {}
  if (!orgId || !proposalId) {
    return { proposal: null, decision: null, approvals: [], executions: [], events: [], decisionContext: [], decisionSources: [] }
  }

  const { data: proposalRow, error: proposalErr } = await supabase
    .from('automation_proposals')
    .select(
      `
      id, org_id, decision_id, action_type, proposal_status, automation_level, approval_mode,
      risk_score, risk_band, payload_json, context_snapshot_json, context_hash,
      expires_at, invalidated_at, invalidation_reason,
      approved_at, approved_by, rejected_at, rejected_by, created_at
    `
    )
    .eq('id', proposalId)
    .eq('org_id', orgId)
    .single()

  if (proposalErr || !proposalRow) {
    return { proposal: null, decision: null, approvals: [], executions: [], events: [], decisionContext: [], decisionSources: [] }
  }

  const decisionId = proposalRow.decision_id

  const [
    decisionRes,
    approvalsRes,
    executionsRes,
    eventsRes,
    decisionContextRes,
    decisionSourcesRes,
  ] = await Promise.all([
    supabase.from('decisions').select('id, org_id, decision_type, title, description, status, created_at, resolved_at').eq('id', decisionId).eq('org_id', orgId).maybeSingle(),
    supabase.from('automation_approvals').select('id, org_id, proposal_id, approval_step, required_role, approval_status, acted_at, acted_by, comment, created_at').eq('proposal_id', proposalId).eq('org_id', orgId).order('approval_step', { ascending: true }),
    supabase.from('automation_executions').select('id, org_id, proposal_id, decision_id, action_type, execution_status, execution_mode, payload_json, result_json, error_code, error_message, started_at, finished_at, executed_by, executed_by_system, created_at').eq('proposal_id', proposalId).eq('org_id', orgId).order('created_at', { ascending: false }),
    supabase.from('automation_events').select('id, org_id, proposal_id, execution_id, decision_id, event_type, event_payload_json, created_at, actor_type, actor_id').eq('proposal_id', proposalId).eq('org_id', orgId).order('created_at', { ascending: false }),
    supabase.from('decision_context').select('id, decision_id, key, value, created_at').eq('decision_id', decisionId).order('created_at', { ascending: true }),
    supabase.from('decision_sources').select('id, decision_id, source_engine, source_reference, created_at').eq('decision_id', decisionId).order('created_at', { ascending: true }),
  ])

  const decision = decisionRes?.data ?? null
  const approvals = Array.isArray(approvalsRes?.data) ? approvalsRes.data : []
  const executions = Array.isArray(executionsRes?.data) ? executionsRes.data : []
  const events = Array.isArray(eventsRes?.data) ? eventsRes.data : []
  const decisionContext = Array.isArray(decisionContextRes?.data) ? decisionContextRes.data : []
  const decisionSources = Array.isArray(decisionSourcesRes?.data) ? decisionSourcesRes.data : []

  // Attach latest execution status for progress stage mapping
  const proposal = normalizeProposal({
    ...proposalRow,
    automation_executions: executions.map((e) => ({ execution_status: e.execution_status })),
  })

  return { proposal, decision, approvals, executions, events, decisionContext, decisionSources }
}

