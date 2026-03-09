/**
 * D57.3 — List proposals pending approval for an org (optionally filter by current user's ability to act).
 */

import { getOrgMemberRole } from './validateApprovalActor.js'

/**
 * Get current user id from supabase auth.
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @returns {Promise<string|null>}
 */
async function getActorId(supabase) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    return user?.id ?? null
  } catch {
    return null
  }
}

/**
 * List proposals in pending_approval with their approval steps for an org.
 * If userId is provided, only returns proposals where the user can act (org member; for role_constrained, user has required role).
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {{ orgId: string, userId?: string | null, limit?: number }} params
 * @returns {Promise<{ proposals: Array<{ proposal: object, steps: object[] }>, error?: string }>}
 */
export async function getPendingAutomationApprovals(supabase, params) {
  const { orgId, userId: providedUserId, limit = 50 } = params || {}
  if (!orgId) {
    return { proposals: [], error: 'orgId required' }
  }

  const { data: proposals, error: propError } = await supabase
    .from('automation_proposals')
    .select('*')
    .eq('org_id', orgId)
    .eq('proposal_status', 'pending_approval')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (propError) {
    console.error('getPendingAutomationApprovals:', propError)
    return { proposals: [], error: propError.message }
  }

  if (!proposals?.length) {
    return { proposals: [] }
  }

  const proposalIds = proposals.map((p) => p.id)

  const { data: stepsRows, error: stepsError } = await supabase
    .from('automation_approvals')
    .select('*')
    .in('proposal_id', proposalIds)
    .order('approval_step', { ascending: true })

  if (stepsError) {
    return { proposals: [], error: stepsError.message }
  }

  const stepsByProposal = {}
  for (const s of stepsRows || []) {
    if (!stepsByProposal[s.proposal_id]) stepsByProposal[s.proposal_id] = []
    stepsByProposal[s.proposal_id].push(s)
  }

  let actorId = providedUserId
  let actorRole = null
  if (actorId == null) {
    actorId = await getActorId(supabase)
  }
  if (actorId) {
    const { role } = await getOrgMemberRole(supabase, { userId: actorId, orgId })
    actorRole = role ?? 'member'
  }

  const result = []
  for (const proposal of proposals) {
    const steps = stepsByProposal[proposal.id] || []
    if (actorId != null && actorRole != null) {
      const hasPending = steps.some((s) => s.approval_status === 'pending')
      if (hasPending) {
        const firstPending = steps.find((s) => s.approval_status === 'pending')
        const requiredRole = firstPending?.required_role
        if (requiredRole) {
          const hierarchy = { owner: 3, admin: 2, member: 1 }
          if ((hierarchy[actorRole?.toLowerCase()] ?? 0) < (hierarchy[requiredRole?.toLowerCase()] ?? 0)) {
            continue
          }
        }
      }
    }
    result.push({ proposal, steps })
  }

  return { proposals: result }
}
