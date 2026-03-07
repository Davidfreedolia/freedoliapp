/**
 * D11.8 Slice 3 — Billing usage (seats, projects) from canonical model.
 * Usage: counts from org_memberships and projects.
 * Limits: from billing_org_entitlements via getOrgEntitlements + getOrgFeatureLimit (projects.max, team.seats).
 * No hardcoded limits; no mocks.
 *
 * @param {string | null} orgId
 * @returns {{
 *   projectsUsed: number,
 *   projectsLimit: number | null,
 *   seatsUsed: number,
 *   seatsLimit: number | null,
 *   isLoading: boolean,
 *   error: string | null
 * }}
 */
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { getOrgEntitlements, getOrgFeatureLimit } from '../lib/billing/entitlements'

export function useBillingUsage(orgId) {
  const [projectsUsed, setProjectsUsed] = useState(0)
  const [projectsLimit, setProjectsLimit] = useState(null)
  const [seatsUsed, setSeatsUsed] = useState(0)
  const [seatsLimit, setSeatsLimit] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!orgId) {
      setProjectsUsed(0)
      setProjectsLimit(null)
      setSeatsUsed(0)
      setSeatsLimit(null)
      setError(null)
      setIsLoading(false)
      return
    }

    let cancelled = false
    setIsLoading(true)
    setError(null)

    const fetchUsage = async () => {
      try {
        const [membersRes, projectsRes] = await Promise.all([
          supabase
            .from('org_memberships')
            .select('*', { count: 'exact', head: true })
            .eq('org_id', orgId),
          supabase
            .from('projects')
            .select('*', { count: 'exact', head: true })
            .eq('org_id', orgId),
        ])

        if (cancelled) return

        setSeatsUsed(membersRes?.count ?? 0)
        setProjectsUsed(projectsRes?.count ?? 0)

        let pl = null
        let sl = null
        try {
          const ent = await getOrgEntitlements(supabase, orgId)
          pl = getOrgFeatureLimit(ent, 'projects.max')
          sl = getOrgFeatureLimit(ent, 'team.seats') ?? ent.seat_limit ?? null
        } catch {
          // missing or lookup failed: show usage with limits as —
        }
        setProjectsLimit(pl != null ? Number(pl) : null)
        setSeatsLimit(sl != null ? Number(sl) : null)
        setError(null)
      } catch (err) {
        if (!cancelled) setError(err?.message ?? 'Failed to load usage')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    fetchUsage()
    return () => { cancelled = true }
  }, [orgId])

  return {
    projectsUsed,
    projectsLimit,
    seatsUsed,
    seatsLimit,
    isLoading,
    error,
  }
}
