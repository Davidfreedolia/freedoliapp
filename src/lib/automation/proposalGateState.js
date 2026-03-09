/**
 * D57.3 — Internal helper: determine if a proposal's approval gate is satisfied from its steps.
 */

/**
 * Check if the proposal gate is satisfied given approval mode and list of steps.
 *
 * @param {{ approval_mode: string }} proposal
 * @param {{ approval_step: number, approval_status: string, required_role?: string | null }[]} steps
 * @returns {boolean}
 */
export function isProposalGateSatisfied(proposal, steps) {
  const mode = (proposal.approval_mode || 'single').toLowerCase()
  const approved = (steps || []).filter((s) => s.approval_status === 'approved')

  if (mode === 'single' || mode === 'role_constrained') {
    return approved.length >= 1
  }
  if (mode === 'dual') {
    return approved.length >= 2
  }
  return false
}

/**
 * Find the next pending step that the actor can act on (for role_constrained, step.required_role must be satisfied by actor).
 * Returns first pending step for single/dual; for role_constrained returns first pending step (role check is done at approve time).
 *
 * @param {{ approval_mode: string }} proposal
 * @param {{ id: string, approval_step: number, approval_status: string, required_role?: string | null }[]} steps
 * @returns {{ id: string, approval_step: number } | null}
 */
export function getNextPendingStep(proposal, steps) {
  const pending = (steps || []).filter((s) => s.approval_status === 'pending')
  return pending.length > 0 ? { id: pending[0].id, approval_step: pending[0].approval_step } : null
}
