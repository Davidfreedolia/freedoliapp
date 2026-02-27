import { useState, useEffect, useCallback } from 'react'
import { supabase, getCurrentUserId } from '../lib/supabase'
import { getDemoMode } from '../lib/demoModeFilter'
import { useApp } from '../context/AppContext'

const isDev = typeof import.meta !== 'undefined' && import.meta.env?.DEV === true

/**
 * Carrega projectes per a la llista (multi-tenant: org_id + is_demo).
 * L’org activa ve del context (billingState.org a AppContent); sense org no es fa query.
 *
 * @returns {{ data: Array, loading: boolean, error: Error | null, noOrg: boolean, refetch: function }}
 */
export function useProjectsListState() {
  const { activeOrgId } = useApp()
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [noOrg, setNoOrg] = useState(false)

  const fetchList = useCallback(async () => {
    setLoading(true)
    setError(null)
    setNoOrg(false)
    try {
      const userId = await getCurrentUserId()
      if (!userId) {
        setData([])
        setLoading(false)
        return
      }

      let demoMode = false
      try {
        demoMode = await getDemoMode()
      } catch (_) {}

      // Org activa només des del context (font canònica: billingState.org a AppContent)
      const orgId = activeOrgId ?? null
      if (orgId == null) {
        setData([])
        setNoOrg(true)
        setLoading(false)
        if (isDev) {
          console.log('[Projects] skip query: no activeOrgId', { userId, activeOrgId: orgId, demoMode })
        }
        return
      }

      // Query RLS-safe: org_id + is_demo (model org-based, no user_id)
      const filters = { org_id: orgId, is_demo: demoMode }
      const query = supabase
        .from('projects')
        .select('*')
        .eq('org_id', orgId)
        .eq('is_demo', demoMode)
        .order('created_at', { ascending: false })

      const requestSignature = { table: 'projects', filters }
      if (isDev) {
        console.log('[Projects] query', { userId, activeOrgId: orgId, demoMode, requestSignature })
      }

      const { data: rows, error: err } = await query

      if (err) {
        if (isDev) {
          console.error('[Projects] load failed', {
            code: err?.code,
            message: err?.message,
            details: err?.details,
            hint: err?.hint,
            status: err?.status,
            requestSignature
          })
        }
        setError(err)
        setData([])
        setLoading(false)
        return
      }

      setData(rows ?? [])
    } catch (err) {
      if (isDev) {
        console.error('[Projects] load failed (catch)', {
          code: err?.code,
          message: err?.message,
          details: err?.details,
          hint: err?.hint,
          status: err?.status,
          requestSignature: { table: 'projects', filters: { org_id: activeOrgId } }
        })
      }
      setError(err)
      setData([])
    } finally {
      setLoading(false)
    }
  }, [activeOrgId])

  useEffect(() => {
    fetchList()
  }, [fetchList])

  return { data, loading, error, noOrg, refetch: fetchList }
}
