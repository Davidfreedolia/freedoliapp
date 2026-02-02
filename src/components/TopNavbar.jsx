import React, { useState, useEffect } from 'react'
import { StickyNote, HelpCircle } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useApp } from '../context/AppContext'
import { supabase } from '../lib/supabase'
import { logSuccess } from '../lib/auditLog'
import { useNotes } from '../hooks/useNotes'
import AddStickyNoteModal from './AddStickyNoteModal'
import HelpModal from './HelpModal'
import AvatarSelector from './AvatarSelector'
import HeaderTimeWidget from './HeaderTimeWidget'
import HeaderPreferencesWidget from './HeaderPreferencesWidget'
import HeaderUserWidget from './HeaderUserWidget'
import { useBreakpoint } from '../hooks/useBreakpoint'
import { showToast } from './Toast'

export default function TopNavbar({ sidebarWidth = 0 }) {
  const { darkMode, setDarkMode } = useApp()
  const navigate = useNavigate()
  const location = useLocation()
  const { t, i18n } = useTranslation()
  const { isMobile } = useBreakpoint()
  const { refresh } = useNotes()
  const [showNoteModal, setShowNoteModal] = useState(false)
  const [showHelpModal, setShowHelpModal] = useState(false)
  const [showAvatarSelector, setShowAvatarSelector] = useState(false)
  const [userEmail, setUserEmail] = useState('')
  const [userName, setUserName] = useState('')

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

  // No mostrar navbar a login
  if (location.pathname === '/login') return null

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
    ...styles.navbar,
    left: isMobile ? 0 : sidebarWidth,
    width: isMobile ? '100%' : `calc(100% - ${sidebarWidth}px)`
  }

  return (
    <>
      <nav style={navStyle}>
        {/* Left Section: Notes + Help grouped */}
        <div style={styles.leftSection}>
          <button 
            onClick={() => setShowNoteModal(true)}
            style={styles.notesButton}
            title={t('navbar.addNote')}
            aria-label={t('navbar.addNote')}
          >
            <StickyNote size={18} />
            {!isMobile && <span style={{ marginLeft: '6px', fontSize: '14px' }}>+ {t('navbar.notes')}</span>}
          </button>

          <button 
            onClick={() => setShowHelpModal(true)}
            style={styles.helpButton}
            title={t('navbar.help')}
            aria-label={t('navbar.help')}
          >
            <HelpCircle size={18} />
            {!isMobile && <span style={{ marginLeft: '6px', fontSize: '14px' }}>{t('navbar.help')}</span>}
          </button>
        </div>

        {/* Right Section: 3 grouped widgets */}
        <div style={styles.rightSection}>
          {/* Time Widget */}
          <HeaderTimeWidget />

          {/* Preferences Widget */}
          <HeaderPreferencesWidget />

          {/* User Widget */}
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
  navbar: {
    height: '64px',
    padding: '0 24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'sticky',
    top: 0,
    zIndex: 300,
    backgroundColor: 'transparent',
    color: 'var(--nav-fg)',
    backdropFilter: 'blur(6px)',
    borderBottom: '1px solid rgba(15, 23, 42, 0.06)',
    boxShadow: 'none'
  },
  leftSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px' // Consistent spacing between Notes and Help
  },
  rightSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px' // Consistent spacing between widgets
  },
  notesButton: {
    height: '36px',
    padding: '0 12px',
    borderRadius: 'var(--radius-ui)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.15s ease',
    gap: '6px',
    backgroundColor: 'rgba(244, 247, 243, 0.1)',
    color: 'var(--nav-fg)',
    fontWeight: '500',
    border: '1px solid rgba(244, 247, 243, 0.2)',
    fontSize: '14px',
    boxShadow: '0 1px 2px rgba(31, 78, 95, 0.15)'
  },
  helpButton: {
    height: '36px',
    padding: '0 12px',
    borderRadius: 'var(--radius-ui)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.15s ease',
    gap: '6px',
    backgroundColor: 'rgba(244, 247, 243, 0.08)',
    color: 'var(--nav-fg)',
    border: '1px solid rgba(244, 247, 243, 0.2)',
    fontSize: '14px'
  }
}

