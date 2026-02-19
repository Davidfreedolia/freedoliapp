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
import Button from './Button'

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
            title="Afegir nota"
            aria-label="Afegir nota"
          >
            <StickyNote size={18} />
            {!isMobile && <span style={{ marginLeft: '6px', fontSize: '14px' }}>+ {t('navbar.notes')}</span>}
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

