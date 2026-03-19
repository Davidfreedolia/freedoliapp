import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { isDemoMode } from '../demo/demoMode'
import { createWorkspace } from '../lib/workspace/createWorkspace'

const STORAGE_KEY = 'freedoli_active_org_id'
const STORAGE_USER_KEY = 'freedoli_active_org_user_id'

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
    let bootstrapInFlight = false
    async function bootstrap() {
      if (bootstrapInFlight) return
      bootstrapInFlight = true
      try {
      console.log('[WorkspaceBootstrap] bootstrap() entry')
      if (isDemoMode()) {
        console.log('[WorkspaceBootstrap] demo mode branch')
        if (!cancelled) {
          setMemberships([])
          setActiveOrgIdState(null)
          persistActiveOrg(null)
          setIsWorkspaceReady(true)
        }
        return
      }
      let session = (await supabase.auth.getSession()).data.session
      console.log('[WorkspaceBootstrap] after getSession()', {
        hasSessionUser: Boolean(session?.user),
        userId: session?.user?.id
      })
      if (!session?.user) {
        console.log('[WorkspaceBootstrap] no session user branch')
        // Minimal race fix: right after login Supabase may still be hydrating.
        // Give it a short window before finalizing an "empty ready" state.
        await new Promise((r) => setTimeout(r, 750))
        if (cancelled) return

        session = (await supabase.auth.getSession()).data.session
        if (!session?.user) {
          if (!cancelled) {
            setMemberships([])
            setActiveOrgIdState(null)
            // Unauthenticated: mark ready so landing/login render (no infinite loader).
            // Post-login: onAuthStateChange will re-run bootstrap and set activeOrgId.
            setIsWorkspaceReady(true)
          }
          return
        }
      }
      const { data: rows, error } = await supabase
        .from('org_memberships')
        .select('org_id, role, created_at, orgs(id, name)')
        .eq('user_id', session.user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: true })
      if (error) {
        console.error('[WorkspaceBootstrap] org_memberships query error', error)
        if (!cancelled) {
          setMemberships([])
          setActiveOrgIdState(null)
          setIsWorkspaceReady(true)
        }
        return
      }
      const list = rows || []
      if (!cancelled) setMemberships(list)
      console.log('[WorkspaceBootstrap] memberships loaded', { count: list.length })

      // P0.CRITICAL — first-user workspace onboarding unblock:
      // If the authenticated user has no active memberships, auto-create a workspace (org + owner membership)
      // so that activeOrgId is never null for a real user session.
      if (list.length === 0) {
        try {
          const user = session.user
          const userEmail = user?.email || ''
          const userId = user?.id
          const derivedName =
            user?.user_metadata?.full_name ||
            (userEmail ? userEmail.split('@')[0] : 'Workspace')

          console.log('[WorkspaceBootstrap] about to call createWorkspace()', {
            userId,
            userEmail: userEmail || null,
            derivedName
          })
          const org = await createWorkspace(supabase, {
            name: derivedName || 'Workspace',
            userEmail,
            userId,
          })

          if (!cancelled) {
            if (org?.id) {
              console.log('[WorkspaceBootstrap] createWorkspace() returned org', {
                orgId: org.id,
                orgName: org.name
              })
              const createdMembership = {
                org_id: org.id,
                role: 'owner',
                created_at: new Date().toISOString(),
                orgs: { id: org.id, name: org.name },
              }
              setMemberships([createdMembership])
              setActiveOrgIdState(org.id)
              persistActiveOrg(org.id)
              try {
                localStorage.setItem(STORAGE_USER_KEY, userId)
              } catch (_) {}
            } else {
              console.error('[WorkspaceBootstrap] createWorkspace() returned null', { userId, userEmail })
              setMemberships([])
              setActiveOrgIdState(null)
              persistActiveOrg(null)
              try {
                localStorage.removeItem(STORAGE_USER_KEY)
              } catch (_) {}
            }
            setIsWorkspaceReady(true)
          }
        } catch (_) {
          console.error('[WorkspaceBootstrap] createWorkspace() threw', _)
          if (!cancelled) {
            setMemberships([])
            setActiveOrgIdState(null)
            persistActiveOrg(null)
            try {
              localStorage.removeItem(STORAGE_USER_KEY)
            } catch (_) {}
            setIsWorkspaceReady(true)
          }
        }
        return
      }

      let currentStored = null
      try {
        const s = localStorage.getItem(STORAGE_KEY)
        const storedUserId = localStorage.getItem(STORAGE_USER_KEY)
        if (
          storedUserId === session.user.id &&
          s &&
          /^[0-9a-f-]{36}$/i.test(s)
        ) currentStored = s
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
        try {
          localStorage.setItem(STORAGE_USER_KEY, session.user.id)
        } catch (_) {}
        setIsWorkspaceReady(true)
      }
      } finally {
        bootstrapInFlight = false
      }
    }
    bootstrap()
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return
      const hasSessionUser = Boolean(session?.user)
      // Re-run only when we receive an authenticated session state.
      if (
        hasSessionUser &&
        ['SIGNED_IN', 'INITIAL_SESSION', 'TOKEN_REFRESHED'].includes(event)
      ) {
        console.log('[WorkspaceBootstrap] auth state change -> re-run bootstrap', {
          event,
          userId: session?.user?.id,
        })
        bootstrap()
      }
    })
    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
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
      const storedUserId = localStorage.getItem(STORAGE_USER_KEY)
      if (
        storedUserId === session.user.id &&
        s &&
        /^[0-9a-f-]{36}$/i.test(s)
      ) currentStored = s
    } catch (_) {}
    const isMemberOfStored = list.some(m => m.org_id === currentStored)
    const chosen = currentStored && isMemberOfStored ? currentStored : (list.find(m => m.role === 'owner')?.org_id ?? list[0].org_id)
    setActiveOrgIdState(chosen)
    persistActiveOrg(chosen)
    try {
      localStorage.setItem(STORAGE_USER_KEY, session.user.id)
    } catch (_) {}
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
