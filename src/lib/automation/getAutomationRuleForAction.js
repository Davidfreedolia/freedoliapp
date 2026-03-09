/**
 * D57.2 — Load active automation rule for org + action_type.
 */

/**
 * Fetch the active automation rule for an org and action type.
 * Active = is_enabled, valid_from <= now, (valid_to is null or valid_to >= now).
 * Returns first matching row if multiple exist.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {{ orgId: string, actionType: string }} params
 * @returns {Promise<import('@supabase/supabase-js').PostgrestSingleResponse<object>['data']>}
 */
export async function getAutomationRuleForAction(supabase, params) {
  const { orgId, actionType } = params || {}
  if (!orgId || !actionType) return null

  const now = new Date().toISOString()

  const { data: rows, error } = await supabase
    .from('automation_rules')
    .select('*')
    .eq('org_id', orgId)
    .eq('action_type', actionType)
    .eq('is_enabled', true)
    .lte('valid_from', now)
    .limit(10)

  if (error) {
    console.error('getAutomationRuleForAction:', error)
    return null
  }
  if (!rows?.length) return null

  const data = rows.find(
    (r) => r.valid_to == null || (r.valid_to && String(r.valid_to) >= now)
  )
  return data ?? rows[0] ?? null
}
