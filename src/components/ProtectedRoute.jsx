import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { isDemoMode } from '../demo/demoMode'

const isDev = typeof import.meta !== 'undefined' && import.meta.env?.DEV === true
const prTs = () => new Date().toISOString()
const prLog = (phase, payload = {}) => console.info('[ProtectedRoute]', { ts: prTs(), phase, ...payload })
const prWarn = (phase, payload = {}) => console.warn('[ProtectedRoute]', { ts: prTs(), phase, ...payload })

export default function ProtectedRoute({ children }) {
  const [loading, setLoading] = useState(true)
  const [authenticated, setAuthenticated] = useState(false)

  useEffect(() => {
    const demo = isDemoMode()
    const startedAt = Date.now()
    let sessionResolved = false
    const slowSessionTimer = window.setTimeout(() => {
      if (!sessionResolved) {
        prWarn('getSession.slow', {
          elapsedMs: Date.now() - startedAt,
          loading,
          authenticated,
          isDemoMode: demo,
        })
      }
    }, 4000)

    prLog('mount', {
      initial: { loading: true, authenticated: false },
      isDemoMode: demo,
      isDev,
    })
    if (isDev) {
      console.log('[Auth] ProtectedRoute mount', { isDemoMode: demo })
    }
    // Demo mode: always authenticated
    if (demo) {
      sessionResolved = true
      window.clearTimeout(slowSessionTimer)
      prLog('demoMode.shortCircuit', { authenticated: true })
      setAuthenticated(true)
      setLoading(false)
      return
    }

    // Verificar sessió actual (i capturar errors per assegurar loading=false)
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        sessionResolved = true
        window.clearTimeout(slowSessionTimer)
        if (isDev) {
          console.log('[Auth] session', { hasSession: !!session, userId: session?.user?.id })
        }
        prLog('getSession.resolved', {
          hasSession: Boolean(session),
          hasSessionUser: Boolean(session?.user),
          userId: session?.user?.id,
          elapsedMs: Date.now() - startedAt,
        })
        setAuthenticated(!!session)
        setLoading(false)
      })
      .catch((err) => {
        sessionResolved = true
        window.clearTimeout(slowSessionTimer)
        if (isDev) {
          console.warn('[Auth] getSession failed', err)
        }
        prWarn('getSession.failed', {
          message: err?.message ?? String(err),
          elapsedMs: Date.now() - startedAt,
        })
        setAuthenticated(false)
        setLoading(false)
      })

    // Escoltar canvis d'autenticació
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (isDev) {
        console.log('[Auth] onAuthStateChange', { event, hasSession: !!session, userId: session?.user?.id })
      }
      prLog('onAuthStateChange', {
        event,
        hasSession: Boolean(session),
        hasSessionUser: Boolean(session?.user),
        userId: session?.user?.id,
      })
      setAuthenticated(!!session)
      setLoading(false)
    })

    return () => {
      window.clearTimeout(slowSessionTimer)
      subscription.unsubscribe()
      prLog('unmount')
    }
  }, [])

  if (loading) {
    prLog('render.loading')
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f8f9fc',
      }}>
        <div style={{ fontSize: '16px', color: '#6b7280' }}>{t('common.loading')}</div>
      </div>
    )
  }

  // Sempre redirect a /login si no autenticat (i no demo)
  if (!authenticated) {
    prWarn('render.navigateLogin', { authenticated })
    return <Navigate to="/login" replace />
  }
  prLog('render.children')
  return children
}












