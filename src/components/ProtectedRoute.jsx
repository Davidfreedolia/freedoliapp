import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { isDemoMode } from '../demo/demoMode'

const isDev = typeof import.meta !== 'undefined' && import.meta.env?.DEV === true

export default function ProtectedRoute({ children }) {
  const [loading, setLoading] = useState(true)
  const [authenticated, setAuthenticated] = useState(false)

  useEffect(() => {
    const demo = isDemoMode()
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
        setAuthenticated(!!session)
        setLoading(false)
      })
      .catch((err) => {
        if (isDev) {
          console.warn('[Auth] getSession failed', err)
        }
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
      setAuthenticated(!!session)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f8f9fc',
      }}>
        <div style={{ fontSize: '16px', color: '#6b7280' }}>Carregant...</div>
      </div>
    )
  }

  // Sempre redirect a /login si no autenticat (i no demo)
  if (!authenticated) {
    return <Navigate to="/login" replace />
  }
  return children
}












