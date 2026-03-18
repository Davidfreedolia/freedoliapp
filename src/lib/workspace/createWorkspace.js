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

  // P0.RLS — use backend RPC to create org + owner membership atomically under RLS.
  const { data, error } = await supabase.rpc('create_workspace_for_user', {
    p_name: name,
    p_user_id: userId,
    p_user_email: userEmail || null
  })

  const org = (Array.isArray(data) && data[0]) || null
  if (error || !org?.id) {
    return null
  }

  linkTrialRegistrationAfterWorkspaceCreated(supabase, { userEmail, orgId: org.id })
  return org
}
