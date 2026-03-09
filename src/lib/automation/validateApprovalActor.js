/**
 * D57.3 — Validate that the current user can approve/reject (org member, optional role).
 * Reuses existing patterns; no new IAM.
 */

/**
 * Get current user id (from supabase auth). Use getCurrentUserId from supabase if available to avoid circular deps.
 *
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
 * Check if user is org member and return their role for that org.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {{ userId: string, orgId: string }} params
 * @returns {Promise<{ allowed: boolean, role?: string }>}
 */
export async function getOrgMemberRole(supabase, params) {
  const { userId, orgId } = params || {}
  if (!userId || !orgId) return { allowed: false }

  const { data, error } = await supabase
    .from('org_memberships')
    .select('role')
    .eq('user_id', userId)
    .eq('org_id', orgId)
    .limit(1)
    .maybeSingle()

  if (error || !data) return { allowed: false }
  return { allowed: true, role: data.role ?? 'member' }
}

/**
 * Validate actor for approval/rejection: must be org member; if requiredRole set, role must match.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {{ orgId: string, requiredRole?: string | null }} params
 * @returns {Promise<{ ok: boolean, userId?: string, reason?: string }>}
 */
export async function validateApprovalActor(supabase, params) {
  const { orgId, requiredRole } = params || {}
  if (!orgId) return { ok: false, reason: 'org_id_required' }

  const userId = await getActorId(supabase)
  if (!userId) return { ok: false, reason: 'not_authenticated' }

  const { allowed, role } = await getOrgMemberRole(supabase, { userId, orgId })
  if (!allowed) return { ok: false, reason: 'not_org_member' }

  if (requiredRole != null && String(requiredRole).trim() !== '') {
    const required = String(requiredRole).trim().toLowerCase()
    const userRole = (role ?? 'member').toLowerCase()
    const roleHierarchy = { owner: 3, admin: 2, member: 1 }
    const userLevel = roleHierarchy[userRole] ?? 0
    const requiredLevel = roleHierarchy[required] ?? 0
    if (userLevel < requiredLevel) return { ok: false, reason: 'insufficient_role' }
  }

  return { ok: true, userId }
}
