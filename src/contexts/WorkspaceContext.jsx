import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { isDemoMode } from '../demo/demoMode'

const STORAGE_KEY = 'freedoli_active_org_id'

const WorkspaceContext = createContext(null)

export function WorkspaceProvider({ children }) {
  const navigate = useNavigate()
  const [activeOrgId, setActiveOrgIdState] = useState(() => {
    if (typeof window === 'undefined') return null
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored && /^[0-9a-f-]{36}$/i.test(stored)) return stored
    } catch (_) {}
    return null
  })
  const [memberships, setMemberships] = useState([])
  const [isWorkspaceReady, setIsWorkspaceReady] = useState(false)

  const persistActiveOrg = useCallback((orgId) => {
    try {
      if (orgId) localStorage.setItem(STORAGE_KEY, orgId)
      else localStorage.removeItem(STORAGE_KEY)
    } catch (_) {}
  }, [])

  const setActiveOrgId = useCallback((orgId) => {
    setActiveOrgIdState(orgId)
    persistActiveOrg(orgId)
    navigate('/app', { replace: true })
  }, [navigate, persistActiveOrg])

  useEffect(() => {
    let cancelled = false
    async function bootstrap() {
      if (isDemoMode()) {
        if (!cancelled) {
          setMemberships([])
          setActiveOrgIdState(null)
          persistActiveOrg(null)
          setIsWorkspaceReady(true)
        }
        return
      }
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        if (!cancelled) {
          setMemberships([])
          setActiveOrgIdState(null)
          setIsWorkspaceReady(true)
        }
        return
      }
      const { data: rows, error } = await supabase
        .from('org_memberships')
        .select('org_id, role, created_at, orgs(id, name)')
        .eq('user_id', session.user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: true })
      if (error) {
        if (!cancelled) {
          setMemberships([])
          setActiveOrgIdState(null)
          setIsWorkspaceReady(true)
        }
        return
      }
      const list = rows || []
      if (!cancelled) setMemberships(list)

      if (list.length === 0) {
        if (!cancelled) {
          setActiveOrgIdState(null)
          persistActiveOrg(null)
          setIsWorkspaceReady(true)
        }
        return
      }

      let currentStored = null
      try {
        const s = localStorage.getItem(STORAGE_KEY)
        if (s && /^[0-9a-f-]{36}$/i.test(s)) currentStored = s
      } catch (_) {}
      const isMemberOfStored = list.some(m => m.org_id === currentStored)
      let chosen = currentStored && isMemberOfStored ? currentStored : null
      if (!chosen) {
        const ownerOrg = list.find(m => m.role === 'owner')
        chosen = ownerOrg ? ownerOrg.org_id : list[0].org_id
      }
      if (!cancelled) {
        setActiveOrgIdState(chosen)
        persistActiveOrg(chosen)
        setIsWorkspaceReady(true)
      }
    }
    bootstrap()
    return () => { cancelled = true }
  }, [])

  const revalidateActiveOrg = useCallback(async () => {
    if (isDemoMode()) return
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) return
    const { data: rows } = await supabase
      .from('org_memberships')
      .select('org_id, role, created_at')
      .eq('user_id', session.user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: true })
    const list = rows || []
    if (list.length === 0) return
    let currentStored = null
    try {
      const s = localStorage.getItem(STORAGE_KEY)
      if (s && /^[0-9a-f-]{36}$/i.test(s)) currentStored = s
    } catch (_) {}
    const isMemberOfStored = list.some(m => m.org_id === currentStored)
    const chosen = currentStored && isMemberOfStored ? currentStored : (list.find(m => m.role === 'owner')?.org_id ?? list[0].org_id)
    setActiveOrgIdState(chosen)
    persistActiveOrg(chosen)
  }, [persistActiveOrg])

  const value = {
    activeOrgId,
    memberships,
    setActiveOrgId,
    isWorkspaceReady,
    revalidateActiveOrg,
    storageKey: STORAGE_KEY
  }

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  )
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext)
  if (!ctx) {
    throw new Error('useWorkspace must be used within WorkspaceProvider')
  }
  return ctx
}

export default WorkspaceContext
