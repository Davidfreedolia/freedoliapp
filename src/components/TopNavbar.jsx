import React, { useState, useEffect, useRef } from 'react'
import { ChevronDown } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useApp } from '../context/AppContext'
import { supabase } from '../lib/supabase'
import { getDemoMode } from '../lib/demoModeFilter'
import { logSuccess } from '../lib/auditLog'
import AvatarSelector from './AvatarSelector'
import HeaderTimeWidget from './HeaderTimeWidget'
import HeaderPreferencesWidget from './HeaderPreferencesWidget'
import HeaderUserWidget from './HeaderUserWidget'
import { useBreakpoint } from '../hooks/useBreakpoint'
import { useWorkspace } from '../contexts/WorkspaceContext'
import Button from './Button'
import DecisionBadge from './decisions/DecisionBadge'
import BusinessAlertsBadge from './alerts/BusinessAlertsBadge'
import AppLanguageControl from './AppLanguageControl'

export default function TopNavbar({ sidebarWidth = 0 }) {
  const { darkMode, setDarkMode } = useApp()
  const { activeOrgId, memberships, setActiveOrgId } = useWorkspace()
  const navigate = useNavigate()
  const location = useLocation()
  const { t, i18n } = useTranslation()
  const { isMobile } = useBreakpoint()
  const [showAvatarSelector, setShowAvatarSelector] = useState(false)
  const [userEmail, setUserEmail] = useState('')
  const [userName, setUserName] = useState('')
  const [demoMode, setDemoMode] = useState(false)
  const [showWorkspaceMenu, setShowWorkspaceMenu] = useState(false)
  const workspaceMenuRef = useRef(null)

  // Load user info
  useEffect(() => {
    const loadUserInfo = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          setUserEmail(session.user.email || '')
          // Try to get user name from metadata or use email
          setUserName(session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || '')
        }
      } catch (err) {
        console.error('Error loading user info:', err)
      }
    }
    loadUserInfo()
  }, [])

  useEffect(() => {
    getDemoMode().then(setDemoMode).catch(() => setDemoMode(false))
  }, [])

  const workspaces = (memberships || []).map((m) => ({
    id: m.org_id,
    name: m.orgs?.name || 'Workspace',
    role: m.role,
  }))

  const currentWorkspace = workspaces.find((w) => w.id === activeOrgId) || workspaces[0] || null

  useEffect(() => {
    if (!showWorkspaceMenu) return
    const handleClickOutside = (event) => {
      if (!workspaceMenuRef.current) return
      if (!workspaceMenuRef.current.contains(event.target)) {
        setShowWorkspaceMenu(false)
      }
    }
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setShowWorkspaceMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [showWorkspaceMenu])

  // No mostrar navbar a login
  if (location.pathname === '/login') return null

  const formatDateTime = (value) => {
    if (!value) return ''
    try {
      const d = new Date(value)
      if (Number.isNaN(d.getTime())) return ''
      return d.toLocaleString()
    } catch {
      return ''
    }
  }

  const handleLogout = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const userId = session?.user?.id

      await supabase.auth.signOut()
      
      if (userId) {
        try {
          await logSuccess('user', 'logout', userId, 'User logged out successfully')
        } catch (err) {
          console.warn('[TopNavbar] Failed to log audit:', err)
        }
      }
      
      navigate('/login')
    } catch (err) {
      console.error('Error during logout:', err)
      navigate('/login')
    }
  }

  const navStyle = {
    left: isMobile ? 0 : 'var(--sidebar-w)',
    width: isMobile ? '100%' : 'calc(100% - var(--sidebar-w))'
  }

  return (
    <>
      <nav style={navStyle} className="topbar">
        <div className="topbar__section topbar__section--left" style={styles.leftSection}>
        </div>

        <div className="topbar__section topbar__section--center" style={styles.centerSection}>
          <div style={styles.centerGroup}>
            <HeaderTimeWidget />
          </div>
        </div>

        <div className="topbar__section topbar__section--right" style={styles.rightSection}>
          {currentWorkspace && (
            workspaces.length <= 1 ? (
              <span style={{ fontSize: 11, color: 'var(--muted-1)', marginRight: 6 }}>
                {t('topbar.workspaceLabel', { name: currentWorkspace.name })}
              </span>
            ) : (
              <div style={{ position: 'relative', marginRight: 6 }} ref={workspaceMenuRef}>
                <button
                  type="button"
                  onClick={() => setShowWorkspaceMenu((open) => !open)}
                  aria-haspopup="menu"
                  aria-expanded={showWorkspaceMenu}
                  aria-label={t('topbar.workspaceSwitcherAria', { name: currentWorkspace.name })}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    fontSize: 11,
                    color: 'var(--muted-1)',
                    padding: '6px 10px',
                    borderRadius: 10,
                    border: '1px solid var(--border-1)',
                    background: 'var(--surface-bg-1)',
                    cursor: 'pointer',
                  }}
                >
                  <span>{t('topbar.workspaceLabel', { name: currentWorkspace.name })}</span>
                  <ChevronDown size={12} aria-hidden />
                </button>
                {showWorkspaceMenu && (
                  <div
                    style={{
                      position: 'absolute',
                      right: 0,
                      marginTop: 4,
                      minWidth: 200,
                      background: 'var(--surface-bg-2)',
                      borderRadius: 14,
                      border: '1px solid var(--border-1)',
                      boxShadow: 'var(--shadow-soft-2)',
                      zIndex: 20,
                      padding: 6,
                    }}
                  >
                    {workspaces.map((w) => (
                      <button
                        key={w.id}
                        type="button"
                        onClick={() => {
                          setShowWorkspaceMenu(false)
                          if (w.id !== activeOrgId) {
                            setActiveOrgId(w.id)
                          }
                        }}
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '6px 8px',
                          fontSize: 12,
                          background: w.id === activeOrgId ? 'var(--surface-bg-3)' : 'transparent',
                          color: 'var(--text-1)',
                          border: 'none',
                          borderRadius: 10,
                          cursor: 'pointer',
                        }}
                      >
                        <span>{w.name}</span>
                        <span style={{ fontSize: 10, textTransform: 'uppercase', color: 'var(--muted-2)' }}>
                          {w.role}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )
          )}
          <span style={{
            fontSize: 11,
            padding: '6px 10px',
            border: '1px solid var(--border-1)',
            background: 'var(--surface-bg-2)',
            borderRadius: 10,
            color: demoMode ? 'var(--warning-1)' : 'var(--success-1)',
            fontWeight: 600
          }}>
            {demoMode ? t('topbar.demoBadge') : t('topbar.liveBadge')}
          </span>
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

      {/* Avatar Selector */}
      <AvatarSelector
        isOpen={showAvatarSelector}
        onClose={() => setShowAvatarSelector(false)}
        userEmail={userEmail}
        userName={userName}
      />

    </>
  )
}

const styles = {
  leftSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    minWidth: 0
  },
  centerSection: {
    flex: 1,
    display: 'flex',
    justifyContent: 'center',
    minWidth: 0
  },
  centerGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    minWidth: 0
  },
  rightSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    minWidth: 0
  },
  
}

