/**
 * D12 — Workspace Usage Engine.
 * Central layer that computes workspace usage from existing entitlements.
 * Does not duplicate entitlements logic; does not touch billing tables or webhook.
 */
import { getOrgEntitlements, getOrgFeatureLimit } from '../billing/entitlements'

/**
 * Compute percent used (0–100) when limit is set; null when no limit.
 * @param {number} used
 * @param {number | null} limit
 * @returns {number | null}
 */
function percentUsed(used, limit) {
  if (limit == null || limit <= 0) return null
  return Math.min(100, Math.round((used / limit) * 100))
}

/**
 * Get workspace usage for an org: projects and seats (used, limit, percent) plus limitsReached and nearLimits.
 * Uses existing entitlements layer; reads counts from projects and org_memberships.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} orgId
 * @returns {Promise<{
 *   projects: { used: number, limit: number | null, percent: number | null },
 *   seats: { used: number, limit: number | null, percent: number | null },
 *   limitsReached: string[],
 *   nearLimits: string[]
 * }>}
 */
export async function getWorkspaceUsage(supabase, orgId) {
  const [projectsRes, membersRes, entitlements] = await Promise.all([
    supabase.from('projects').select('*', { count: 'exact', head: true }).eq('org_id', orgId),
    supabase.from('org_memberships').select('*', { count: 'exact', head: true }).eq('org_id', orgId),
    getOrgEntitlements(supabase, orgId).catch(() => null),
  ])

  const projectsUsed = projectsRes?.count ?? 0
  const seatsUsed = membersRes?.count ?? 0

  let projectsLimit = null
  let seatsLimit = null
  if (entitlements) {
    projectsLimit = getOrgFeatureLimit(entitlements, 'projects.max')
    seatsLimit = getOrgFeatureLimit(entitlements, 'team.seats') ?? entitlements.seat_limit ?? null
  }
  if (projectsLimit != null) projectsLimit = Number(projectsLimit)
  if (seatsLimit != null) seatsLimit = Number(seatsLimit)

  const projectsPercent = percentUsed(projectsUsed, projectsLimit)
  const seatsPercent = percentUsed(seatsUsed, seatsLimit)

  const limitsReached = []
  if (projectsLimit != null && projectsUsed >= projectsLimit) limitsReached.push('projects')
  if (seatsLimit != null && seatsUsed >= seatsLimit) limitsReached.push('seats')

  // nearLimits: used/limit >= 0.8 (D12 Slice 5)
  const nearLimits = []
  if (projectsLimit != null && projectsLimit > 0 && projectsUsed / projectsLimit >= 0.8) {
    nearLimits.push('projects')
  }
  if (seatsLimit != null && seatsLimit > 0 && seatsUsed / seatsLimit >= 0.8) {
    nearLimits.push('seats')
  }

  return {
    projects: { used: projectsUsed, limit: projectsLimit, percent: projectsPercent },
    seats: { used: seatsUsed, limit: seatsLimit, percent: seatsPercent },
    limitsReached,
    nearLimits,
  }
}
