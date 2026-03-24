import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { isDemoMode } from '../demo/demoMode'
import { createWorkspace } from '../lib/workspace/createWorkspace'

const STORAGE_KEY = 'freedoli_active_org_id'
const STORAGE_USER_KEY = 'freedoli_active_org_user_id'
const wsTs = () => new Date().toISOString()
const wsLog = (phase, payload = {}) => console.info('[WorkspaceContext]', { ts: wsTs(), phase, ...payload })
const wsWarn = (phase, payload = {}) => console.warn('[WorkspaceContext]', { ts: wsTs(), phase, ...payload })
const serializeError = (error) => {
  if (!error) return null
  return {
    message: error?.message ?? String(error),
    code: error?.code ?? null,
    details: error?.details ?? null,
    hint: error?.hint ?? null,
    status: error?.status ?? null,
    name: error?.name ?? null,
    stack: error?.stack ?? null,
    raw: typeof error === 'object' ? error : String(error),
  }
}

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
    wsLog('setActiveOrgId.called', { orgId })
    setActiveOrgIdState(orgId)
    persistActiveOrg(orgId)
    navigate('/app', { replace: true })
  }, [navigate, persistActiveOrg])

  useEffect(() => {
    let cancelled = false
    let bootstrapInFlight = false
    let pendingAuthenticatedBootstrap = false
    async function bootstrap() {
      if (bootstrapInFlight) return
      bootstrapInFlight = true
      const bootstrapStartedAt = Date.now()
      const slowBootstrapTimer = window.setTimeout(() => {
        wsWarn('bootstrap.slow', { elapsedMs: Date.now() - bootstrapStartedAt })
      }, 5000)
      try {
      wsLog('bootstrap.start')
      if (isDemoMode()) {
        wsLog('bootstrap.demoMode')
        if (!cancelled) {
          setMemberships([])
          setActiveOrgIdState(null)
          persistActiveOrg(null)
          setIsWorkspaceReady(true)
        }
        return
      }
      wsLog('bootstrap.getSession.initial.start')
      let session = (await supabase.auth.getSession()).data.session
      wsLog('bootstrap.getSession.initial', {
        hasSessionUser: Boolean(session?.user),
        userId: session?.user?.id
      })
      if (!session?.user) {
        wsWarn('bootstrap.noSessionUser.initial')
        // Minimal race fix: right after login Supabase may still be hydrating.
        // Give it a short window before finalizing an "empty ready" state.
        await new Promise((r) => setTimeout(r, 750))
        if (cancelled) return

        wsLog('bootstrap.getSession.retry.start')
        session = (await supabase.auth.getSession()).data.session
        wsLog('bootstrap.getSession.retry', {
          hasSessionUser: Boolean(session?.user),
          userId: session?.user?.id
        })
        if (!session?.user) {
          if (pendingAuthenticatedBootstrap) {
            wsWarn('bootstrap.noSessionUser.deferEmptyState', {
              reason: 'pendingAuthenticatedBootstrap',
            })
            return
          }
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
      wsLog('bootstrap.memberships.query.start', {
        userId: session.user.id,
      })
      const { data: rows, error } = await supabase
        .from('org_memberships')
        .select('org_id, role, created_at, orgs(id, name)')
        .eq('user_id', session.user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: true })
      if (error) {
        console.error('[WorkspaceContext]', {
          ts: wsTs(),
          phase: 'bootstrap.memberships.query.error',
          userId: session.user.id,
          error: serializeError(error),
        })
        if (!cancelled) {
          setMemberships([])
          setActiveOrgIdState(null)
          setIsWorkspaceReady(true)
        }
        return
      }
      const list = rows || []
      wsLog('bootstrap.memberships.query.resolved', {
        userId: session.user.id,
        count: list.length,
        orgIds: list.map((m) => m.org_id),
      })
      if (!cancelled) setMemberships(list)
      wsLog('bootstrap.memberships.loaded', {
        userId: session.user.id,
        count: list.length,
        orgIds: list.map((m) => m.org_id),
      })

      // P0.CRITICAL — first-user workspace onboarding unblock:
      // If the authenticated user has no active memberships, auto-create a workspace (org + owner membership)
      // so that activeOrgId is never null for a real user session.
      if (list.length === 0) {
        wsWarn('bootstrap.memberships.empty', {
          userId: session.user.id,
          count: 0,
        })
        try {
          const user = session.user
          const userEmail = user?.email || ''
          const userId = user?.id
          const derivedName =
            user?.user_metadata?.full_name ||
            (userEmail ? userEmail.split('@')[0] : 'Workspace')

          wsWarn('bootstrap.createWorkspace.requested', {
            userId,
            userEmail: userEmail || null,
            derivedName
          })
          const org = await createWorkspace(supabase, {
            name: derivedName || 'Workspace',
            userEmail,
            userId,
          })
          wsLog('bootstrap.createWorkspace.afterAwait', {
            userId,
            returnedOrgId: org?.id ?? null,
            returnedOrgName: org?.name ?? null,
            isNullResult: !org,
          })

          if (!cancelled) {
            if (org?.id) {
              wsLog('bootstrap.createWorkspace.resolved', {
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
              console.error('[WorkspaceContext]', {
                ts: wsTs(),
                phase: 'bootstrap.createWorkspace.nullResult',
                userId,
                userEmail,
                error: null,
              })
              setMemberships([])
              setActiveOrgIdState(null)
              persistActiveOrg(null)
              try {
                localStorage.removeItem(STORAGE_USER_KEY)
              } catch (_) {}
            }
            setIsWorkspaceReady(true)
          }
        } catch (error) {
          console.error('[WorkspaceContext]', {
            ts: wsTs(),
            phase: 'bootstrap.createWorkspace.threw',
            error: serializeError(error),
          })
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
        wsLog('bootstrap.chooseActiveOrg', {
          currentStored,
          isMemberOfStored,
          chosen,
        })
        setActiveOrgIdState(chosen)
        persistActiveOrg(chosen)
        try {
          localStorage.setItem(STORAGE_USER_KEY, session.user.id)
        } catch (_) {}
        setIsWorkspaceReady(true)
      }
      } catch (error) {
        console.error('[WorkspaceContext] bootstrap.unhandledError', {
          ts: wsTs(),
          phase: 'bootstrap.unhandledError',
          elapsedMs: Date.now() - bootstrapStartedAt,
          error: serializeError(error),
        })
        throw error
      } finally {
        window.clearTimeout(slowBootstrapTimer)
        wsLog('bootstrap.finally', {
          elapsedMs: Date.now() - bootstrapStartedAt,
          cancelled,
          bootstrapInFlight,
          pendingAuthenticatedBootstrap,
        })
        bootstrapInFlight = false
        if (!cancelled && pendingAuthenticatedBootstrap) {
          pendingAuthenticatedBootstrap = false
          wsLog('bootstrap.runQueuedAuthenticatedBootstrap')
          bootstrap()
        }
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
        wsLog('authStateChange.rebootstrap', {
          event,
          userId: session?.user?.id,
        })
        if (bootstrapInFlight) {
          pendingAuthenticatedBootstrap = true
          wsLog('authStateChange.queueRebootstrap', {
            event,
            userId: session?.user?.id,
          })
          return
        }
        bootstrap()
      }
    })
    return () => {
      cancelled = true
      subscription.unsubscribe()
      wsLog('bootstrap.effect.cleanup')
    }
  }, [])

  const revalidateActiveOrg = useCallback(async () => {
    wsLog('revalidateActiveOrg.start')
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
    wsLog('revalidateActiveOrg.result', {
      membershipsCount: list.length,
      currentStored,
      isMemberOfStored,
      chosen,
    })
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
