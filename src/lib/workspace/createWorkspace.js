/**
 * Update trial_registrations for a lead that just got a workspace.
 * Only updates rows with matching email and workspace_id IS NULL.
 * Fire-and-forget; never blocks or throws.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {{ userEmail: string, orgId: string }} options
 */
export function linkTrialRegistrationAfterWorkspaceCreated(supabase, { userEmail, orgId }) {
  if (!userEmail || !orgId) return
  const email = typeof userEmail === 'string' ? userEmail.trim() : ''
  if (!email) return
  supabase
    .from('trial_registrations')
    .update({ status: 'workspace_created', workspace_id: orgId })
    .eq('email', email)
    .is('workspace_id', null)
    .then(() => {})
    .catch(() => {})
}

/**
 * Create workspace (org + owner membership).
 * After success, links matching trial_registration if email exists and workspace_id is null.
 * Trial update is fire-and-forget; never blocks or throws.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {{ name: string, userEmail: string, userId: string }} options
 * @returns {Promise<{ id: string, name: string } | null>} Created org or null on failure.
 */
export async function createWorkspace(supabase, { name, userEmail, userId }) {
  if (!name || !userId) return null

  const { data: org, error: orgError } = await supabase
    .from('orgs')
    .insert([{ name, created_by: userId }])
    .select('id, name')
    .single()

  if (orgError || !org) return null

  const { error: memError } = await supabase
    .from('org_memberships')
    .insert([{ org_id: org.id, user_id: userId, role: 'owner' }])

  if (memError) {
    return null
  }

  linkTrialRegistrationAfterWorkspaceCreated(supabase, { userEmail, orgId: org.id })
  return org
}
