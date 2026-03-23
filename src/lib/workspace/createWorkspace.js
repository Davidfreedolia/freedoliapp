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
  const startedAt = Date.now()
  const log = (phase, payload = {}) => console.info('[createWorkspace]', { ts: new Date().toISOString(), phase, ...payload })
  const warn = (phase, payload = {}) => console.warn('[createWorkspace]', { ts: new Date().toISOString(), phase, ...payload })
  if (!name || !userId) {
    console.error('[createWorkspace] missing required name/userId', { name, userId, userEmail: userEmail || null })
    return null
  }

  // P0.RLS — use backend RPC to create org + owner membership atomically under RLS.
  const slowRpcTimer = window.setTimeout(() => {
    warn('rpc.slow', {
      elapsedMs: Date.now() - startedAt,
      name,
      userId,
      userEmail: userEmail || null,
    })
  }, 5000)
  log('rpc.start', {
    name,
    userId,
    userEmail: userEmail || null
  })
  const { data, error } = await supabase.rpc('create_workspace_for_user', {
    p_name: name,
    p_user_id: userId,
    p_user_email: userEmail || null
  })
  window.clearTimeout(slowRpcTimer)

  if (error) {
    console.error('[createWorkspace]', { ts: new Date().toISOString(), phase: 'rpc.error', elapsedMs: Date.now() - startedAt, error })
  }
  log('rpc.resolved', {
    elapsedMs: Date.now() - startedAt,
    hasArrayData: Array.isArray(data),
    firstOrgId: Array.isArray(data) ? data[0]?.id ?? null : null,
  })

  const org = (Array.isArray(data) && data[0]) || null
  if (error || !org?.id) {
    console.error('[createWorkspace] error || !org?.id', { hasError: Boolean(error), org })
    return null
  }

  linkTrialRegistrationAfterWorkspaceCreated(supabase, { userEmail, orgId: org.id })
  return org
}
