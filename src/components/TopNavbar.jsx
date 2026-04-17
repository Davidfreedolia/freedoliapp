import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { supabase } from '../lib/supabase'
import { logSuccess } from '../lib/auditLog'
import AvatarSelector from './AvatarSelector'
import HeaderTimeWidget from './HeaderTimeWidget'
import HeaderPreferencesWidget from './HeaderPreferencesWidget'
import HeaderUserWidget from './HeaderUserWidget'
import { useBreakpoint } from '../hooks/useBreakpoint'
import DecisionBadge from './decisions/DecisionBadge'
import BusinessAlertsBadge from './alerts/BusinessAlertsBadge'
import AppLanguageControl from './AppLanguageControl'

export default function TopNavbar() {
  const { darkMode } = useApp()
  const navigate = useNavigate()
  const location = useLocation()
  const { isMobile } = useBreakpoint()
  const [showAvatarSelector, setShowAvatarSelector] = useState(false)
  const [userEmail, setUserEmail] = useState('')
  const [userName, setUserName] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUserEmail(session.user.email || '')
        setUserName(session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || '')
      }
    }).catch(console.error)
  }, [])

  if (location.pathname === '/login') return null

  const handleLogout = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const userId = session?.user?.id
      await supabase.auth.signOut()
      if (userId) {
        await logSuccess('user', 'logout', userId, 'User logged out successfully').catch(() => {})
      }
    } catch {}
    navigate('/login')
  }

  const navStyle = {
    left: isMobile ? 0 : 'var(--sidebar-w)',
    width: isMobile ? '100%' : 'calc(100% - var(--sidebar-w))'
  }

  return (
    <>
      <nav style={navStyle} className="topbar">
        {/* Esquerra: buit — reservat per futur */}
        <div />

        {/* Centre: rellotge */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <HeaderTimeWidget />
        </div>

        {/* Dreta: controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <BusinessAlertsBadge />
          <DecisionBadge />
          <AppLanguageControl />
          <HeaderPreferencesWidget />
          <HeaderUserWidget
            userEmail={userEmail}
            userName={userName}
            onAvatarClick={() => setShowAvatarSelector(true)}
            onLogout={handleLogout}
          />
        </div>
      </nav>

      <AvatarSelector
        isOpen={showAvatarSelector}
        onClose={() => setShowAvatarSelector(false)}
        userEmail={userEmail}
        userName={userName}
      />
    </>
  )
}

