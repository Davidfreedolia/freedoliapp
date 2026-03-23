import React, { useState, useEffect, useRef } from 'react'
import { StickyNote, HelpCircle, MessageCircle, ChevronDown } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useApp } from '../context/AppContext'
import { supabase } from '../lib/supabase'
import { getDemoMode } from '../lib/demoModeFilter'
import { logSuccess } from '../lib/auditLog'
import { useNotes } from '../hooks/useNotes'
import AddStickyNoteModal from './AddStickyNoteModal'
import HelpModal from './HelpModal'
import AvatarSelector from './AvatarSelector'
import HeaderTimeWidget from './HeaderTimeWidget'
import HeaderPreferencesWidget from './HeaderPreferencesWidget'
import HeaderUserWidget from './HeaderUserWidget'
import { useBreakpoint } from '../hooks/useBreakpoint'
import { useWorkspace } from '../contexts/WorkspaceContext'
import Button from './Button'
import DecisionBadge from './decisions/DecisionBadge'
import BusinessAlertsBadge from './alerts/BusinessAlertsBadge'
import AssistantPanel from './assistant/AssistantPanel'
import AppLanguageControl from './AppLanguageControl'

export default function TopNavbar({ sidebarWidth = 0 }) {
  const { darkMode, setDarkMode } = useApp()
  const { activeOrgId, memberships, setActiveOrgId } = useWorkspace()
  const navigate = useNavigate()
  const location = useLocation()
  const { t, i18n } = useTranslation()
  const { isMobile } = useBreakpoint()
  const { refresh } = useNotes()
  const [showNoteModal, setShowNoteModal] = useState(false)
  const [showHelpModal, setShowHelpModal] = useState(false)
  const [showAssistantPanel, setShowAssistantPanel] = useState(false)
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
        <div style={styles.leftSection}>
          <Button
            type="button"
            variant="note"
            size="sm"
            onClick={() => setShowNoteModal(true)}
            className="topbar-button topbar-notes"
            title={t('topbar.addNote')}
            aria-label={t('topbar.addNote')}
          >
            <StickyNote size={18} />
            {!isMobile && <span style={{ marginLeft: '6px', fontSize: '14px' }}>+ {t('navbar.notes')}</span>}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAssistantPanel(true)}
            className="topbar-button topbar-assistant"
            title={t('assistant.title')}
            aria-label={t('assistant.title')}
          >
            <MessageCircle size={18} />
            {!isMobile && <span style={{ marginLeft: '6px', fontSize: '14px' }}>{t('assistant.title')}</span>}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowHelpModal(true)}
            className="topbar-button topbar-help"
            title={t('navbar.help')}
            aria-label={t('navbar.help')}
          >
            <HelpCircle size={18} />
            {!isMobile && <span style={{ marginLeft: '6px', fontSize: '14px' }}>{t('navbar.help')}</span>}
          </Button>
        </div>

        <div style={styles.centerSection}>
          <div style={styles.centerGroup}>
            <HeaderTimeWidget />
          </div>
        </div>

        <div style={styles.rightSection}>
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
                    padding: '4px 8px',
                    borderRadius: 999,
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
                      borderRadius: 8,
                      border: '1px solid var(--border-1)',
                      boxShadow: '0 8px 20px rgba(0,0,0,0.25)',
                      zIndex: 20,
                      padding: 4,
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
                          borderRadius: 6,
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
            padding: '4px 8px',
            border: '1px solid var(--border-1)',
            background: 'var(--surface-bg-2)',
            borderRadius: 999,
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

      {/* Note Modal */}
      <AddStickyNoteModal
        isOpen={showNoteModal}
        onClose={() => setShowNoteModal(false)}
        onSuccess={() => {
          refresh()
          setShowNoteModal(false)
        }}
        darkMode={darkMode}
      />

      {/* Help Modal */}
      <HelpModal
        isOpen={showHelpModal}
        onClose={() => setShowHelpModal(false)}
        darkMode={darkMode}
      />

      {/* R0.4 — In-app Assistant panel */}
      <AssistantPanel
        isOpen={showAssistantPanel}
        onClose={() => setShowAssistantPanel(false)}
        pathname={location.pathname}
      />

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
    gap: '8px'
  },
  centerSection: {
    flex: 1,
    display: 'flex',
    justifyContent: 'center'
  },
  centerGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  rightSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  
}

