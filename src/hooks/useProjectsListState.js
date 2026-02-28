import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useApp } from '../context/AppContext'

const isDev = typeof import.meta !== 'undefined' && import.meta.env?.DEV === true

/**
 * Carrega projectes per a la llista (multi-tenant: org_id scope).
 * Font única: activeOrgId del context. Sense org no es fa query.
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
      if (!activeOrgId) {
        setData([])
        setNoOrg(true)
        setLoading(false)
        if (isDev) console.log('[Projects] skip query: no activeOrgId')
        return
      }

      const { data: rows, error: err } = await supabase
        .from('projects')
        .select('*')
        .eq('org_id', activeOrgId)
        .order('created_at', { ascending: false })

      if (err) {
        if (isDev) console.error('[Projects] load failed', err?.code, err?.message)
        setError(err)
        setData([])
        setLoading(false)
        return
      }

      setData(rows ?? [])
    } catch (err) {
      if (isDev) console.error('[Projects] load failed (catch)', err?.message)
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
