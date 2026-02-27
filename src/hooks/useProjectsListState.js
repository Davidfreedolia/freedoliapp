import { useState, useEffect, useCallback } from 'react'
import { supabase, getCurrentUserId } from '../lib/supabase'
import { getDemoMode } from '../lib/demoModeFilter'

/**
 * Carrega projectes per a la llista (multi-tenant: user_id + org_id + is_demo).
 * Usa la taula projects directament per compatibilitat amb RLS.
 *
 * @returns {{ data: Array, loading: boolean, error: Error | null, refetch: function }}
 */
export function useProjectsListState() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchList = useCallback(async () => {
    setLoading(true)
    setError(null)
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

      // Obtenir org activa (primera membership) per scope multi-tenant
      let activeOrgId = null
      try {
        const { data: membershipRow, error: memErr } = await supabase
          .from('org_memberships')
          .select('*, orgs(*)')
          .eq('user_id', userId)
          .limit(1)
          .maybeSingle()
        if (!memErr && membershipRow) {
          const org = membershipRow.orgs ?? membershipRow.org ?? null
          activeOrgId = org?.id ?? null
        }
      } catch (_) {}

      // Query directa a projects (contracte RLS + org boundary)
      let query = supabase
        .from('projects')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (activeOrgId != null) {
        query = query.eq('org_id', activeOrgId)
      }

      // Filtrar per is_demo només si la taula té la columna (projects la té)
      query = query.eq('is_demo', demoMode)

      const queryInfo = { table: 'projects', userId, demoMode, orgId: activeOrgId ?? null }
      if (typeof console?.log === 'function') {
        console.log('[Projects] query', queryInfo)
      }

      const { data: rows, error: err } = await query

      if (err) {
        console.error('[Projects] load failed', {
          error: err,
          status: err?.status,
          message: err?.message,
          details: err?.details,
          query: queryInfo
        })
        setError(err)
        setData([])
        setLoading(false)
        return
      }

      setData(rows ?? [])
    } catch (err) {
      console.error('[Projects] load failed', {
        error: err,
        status: err?.status,
        message: err?.message,
        details: err?.details
      })
      setError(err)
      setData([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchList()
  }, [fetchList])

  return { data, loading, error, refetch: fetchList }
}
