/**
 * useIsSuperAdmin — true when the authenticated user's email is in the
 * platform-wide super-admin allowlist.
 *
 * Source of truth at the data layer is the SQL function `is_super_admin()`
 * (see migration 20260514120000). This client-side hook mirrors that list so
 * UI can show super-admin-only affordances (admin gate, banners, badges)
 * without an extra round-trip. Defense-in-depth: even if the JS check is
 * bypassed, RLS still blocks unauthorized reads at the DB.
 */
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

// Keep this in sync with `public.is_super_admin()` in the Supabase migration.
const SUPER_ADMIN_EMAILS = new Set(['david@freedolia.com'])

export function useIsSuperAdmin() {
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        if (cancelled) return
        const email = (session?.user?.email ?? '').toLowerCase()
        setIsSuperAdmin(SUPER_ADMIN_EMAILS.has(email))
        setLoading(false)
      })
      .catch(() => {
        if (cancelled) return
        setIsSuperAdmin(false)
        setLoading(false)
      })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return
      const email = (session?.user?.email ?? '').toLowerCase()
      setIsSuperAdmin(SUPER_ADMIN_EMAILS.has(email))
    })

    return () => {
      cancelled = true
      sub?.subscription?.unsubscribe?.()
    }
  }, [])

  return { isSuperAdmin, loading }
}

export default useIsSuperAdmin
