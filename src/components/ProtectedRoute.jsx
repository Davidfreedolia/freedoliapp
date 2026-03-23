import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { isDemoMode } from '../demo/demoMode'

const isDev = typeof import.meta !== 'undefined' && import.meta.env?.DEV === true

export default function ProtectedRoute({ children }) {
  const [loading, setLoading] = useState(true)
  const [authenticated, setAuthenticated] = useState(false)

  useEffect(() => {
    const demo = isDemoMode()
    console.log('[DiagWhiteScreen][ProtectedRoute] mount', {
      initial: { loading: true, authenticated: false },
      isDemoMode: demo,
      isDev,
    })
    if (isDev) {
      console.log('[Auth] ProtectedRoute mount', { isDemoMode: demo })
    }
    // Demo mode: always authenticated
    if (demo) {
      setAuthenticated(true)
      setLoading(false)
      return
    }

    // Verificar sessió actual (i capturar errors per assegurar loading=false)
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        if (isDev) {
          console.log('[Auth] session', { hasSession: !!session, userId: session?.user?.id })
        }
        console.log('[DiagWhiteScreen][ProtectedRoute] getSession resolved', {
          hasSession: Boolean(session),
          hasSessionUser: Boolean(session?.user),
          userId: session?.user?.id,
        })
        setAuthenticated(!!session)
        setLoading(false)
      })
      .catch((err) => {
        if (isDev) {
          console.warn('[Auth] getSession failed', err)
        }
        console.log('[DiagWhiteScreen][ProtectedRoute] getSession failed', {
          message: err?.message ?? String(err),
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
      console.log('[DiagWhiteScreen][ProtectedRoute] onAuthStateChange', {
        event,
        hasSession: Boolean(session),
        hasSessionUser: Boolean(session?.user),
        userId: session?.user?.id,
      })
      setAuthenticated(!!session)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    console.log('[DiagWhiteScreen][ProtectedRoute] render -> loading branch')
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
    console.log('[DiagWhiteScreen][ProtectedRoute] render -> unauthenticated branch (Navigate /login)')
    return <Navigate to="/login" replace />
  }
  console.log('[DiagWhiteScreen][ProtectedRoute] render -> authenticated branch (render children)')
  return children
}












