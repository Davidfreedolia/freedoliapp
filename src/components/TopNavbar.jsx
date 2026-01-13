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

export default function TopNavbar() {
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

  return (
    <>
      <nav style={styles.navbar}>
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
    zIndex: 100,
    backgroundColor: 'var(--color-surface)',
    borderBottom: '1px solid var(--color-border)',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
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
    backgroundColor: '#FFE066',
    color: '#5F4B00',
    fontWeight: '600',
    border: '1px solid #fbbf24',
    fontSize: '14px',
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
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
    backgroundColor: 'var(--color-surface)',
    color: 'var(--color-muted)',
    border: '1px solid var(--color-border)',
    fontSize: '14px'
  }
}

