/**
 * D57.3 — Create approval steps for an automation proposal when approval_mode !== 'none'.
 * Writes only to automation_approvals and automation_events (approval_requested).
 */

/**
 * Create approval step rows for a proposal.
 * single → 1 step; dual → 2 steps; role_constrained → 1 step with required_role (default 'admin').
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {{ proposalId: string, orgId: string, approvalMode: string, requiredRole?: string, decisionId?: string | null }} params
 * @returns {Promise<{ ok: boolean, stepsCreated?: number, reason?: string }>}
 */
export async function createAutomationApprovalSteps(supabase, params) {
  const { proposalId, orgId, approvalMode, requiredRole, decisionId } = params || {}
  if (!proposalId || !orgId) {
    return { ok: false, reason: 'proposalId and orgId required' }
  }

  if (approvalMode === 'none') {
    return { ok: true, stepsCreated: 0 }
  }

  const steps = []
  const roleForStep = (approvalMode === 'role_constrained') ? (requiredRole || 'admin') : null

  if (approvalMode === 'single' || approvalMode === 'role_constrained') {
    steps.push({
      org_id: orgId,
      proposal_id: proposalId,
      approval_step: 1,
      required_role: roleForStep,
      approval_status: 'pending',
    })
  } else if (approvalMode === 'dual') {
    steps.push(
      { org_id: orgId, proposal_id: proposalId, approval_step: 1, required_role: null, approval_status: 'pending' },
      { org_id: orgId, proposal_id: proposalId, approval_step: 2, required_role: null, approval_status: 'pending' }
    )
  } else {
    return { ok: false, reason: 'unsupported_approval_mode' }
  }

  const { data: inserted, error: insError } = await supabase
    .from('automation_approvals')
    .insert(steps)
    .select('id')

  if (insError) {
    console.error('createAutomationApprovalSteps:', insError)
    return { ok: false, reason: insError.message }
  }

  const stepsCreated = inserted?.length ?? 0

  try {
    const { error: eventError } = await supabase.from('automation_events').insert({
      org_id: orgId,
      proposal_id: proposalId,
      decision_id: decisionId ?? null,
      event_type: 'approval_requested',
      event_payload_json: { approval_mode: approvalMode, steps_count: stepsCreated },
      actor_type: 'system',
      actor_id: null,
    })
    if (eventError) {
      console.warn('createAutomationApprovalSteps: approval_requested event failed', { proposalId, error: eventError })
    }
  } catch (err) {
    console.warn('createAutomationApprovalSteps: approval_requested event failed', { proposalId, error: err })
  }

  return { ok: true, stepsCreated }
}
