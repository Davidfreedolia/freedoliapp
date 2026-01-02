import { useState } from 'react'
import { StickyNote, HelpCircle, Sun, Moon, Bell, LogOut } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useApp } from '../context/AppContext'
import { supabase } from '../lib/supabase'
import { logSuccess } from '../lib/auditLog'
import { useNotes } from '../hooks/useNotes'
import AddStickyNoteModal from './AddStickyNoteModal'
import HelpModal from './HelpModal'
import { useBreakpoint } from '../hooks/useBreakpoint'

export default function TopNavbar() {
  const { darkMode, setDarkMode } = useApp()
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useTranslation()
  const { isMobile } = useBreakpoint()
  const { addNote, refresh } = useNotes()
  const [showNoteModal, setShowNoteModal] = useState(false)
  const [showHelpModal, setShowHelpModal] = useState(false)

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
      <nav style={{
        ...styles.navbar,
        backgroundColor: darkMode ? '#0a0a0f' : '#ffffff',
        borderBottom: 'none',
        boxShadow: 'none'
      }}>
        <div style={styles.leftSection}>
          {/* Notes Button - Always first */}
          <button 
            onClick={() => setShowNoteModal(true)}
            style={{
              ...styles.notesButton,
              backgroundColor: '#FFE066',
              color: '#5F4B00',
              fontWeight: '600',
              border: '2px solid #fbbf24'
            }}
            title={t('navbar.addNote')}
            aria-label={t('navbar.addNote')}
          >
            <StickyNote size={18} />
            {!isMobile && <span style={{ marginLeft: '6px', fontSize: '14px' }}>+ {t('navbar.notes')}</span>}
          </button>

          {/* Help Button */}
          <button 
            onClick={() => setShowHelpModal(true)}
            style={{
              ...styles.helpButton,
              backgroundColor: darkMode ? '#1f1f2e' : '#f3f4f6',
              color: darkMode ? '#9ca3af' : '#6b7280'
            }}
            title={t('navbar.help')}
            aria-label={t('navbar.help')}
          >
            <HelpCircle size={20} />
            {!isMobile && <span style={{ marginLeft: '6px', fontSize: '14px' }}>{t('navbar.help')}</span>}
          </button>
        </div>

        <div style={styles.rightSection}>
          {/* Notifications */}
          <button 
            style={{
              ...styles.iconButton,
              backgroundColor: darkMode ? '#1f1f2e' : '#f3f4f6'
            }}
            title={t('navbar.notifications')}
            aria-label={t('navbar.notifications')}
          >
            <Bell size={20} color={darkMode ? '#9ca3af' : '#6b7280'} />
          </button>

          {/* Toggle Dark Mode */}
          <button 
            onClick={() => setDarkMode(!darkMode)}
            style={{
              ...styles.iconButton,
              backgroundColor: darkMode ? '#1f1f2e' : '#f3f4f6'
            }}
            title={darkMode ? t('navbar.lightMode') : t('navbar.darkMode')}
            aria-label={darkMode ? t('navbar.lightMode') : t('navbar.darkMode')}
          >
            {darkMode ? (
              <Sun size={20} color="#fbbf24" />
            ) : (
              <Moon size={20} color="#6b7280" />
            )}
          </button>

          {/* Logout */}
          <button 
            onClick={handleLogout}
            style={{
              ...styles.iconButton,
              backgroundColor: darkMode ? '#1f1f2e' : '#f3f4f6'
            }}
            title={t('navbar.logout')}
            aria-label={t('navbar.logout')}
          >
            <LogOut size={20} color={darkMode ? '#9ca3af' : '#6b7280'} />
          </button>
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
    </>
  )
}

const styles = {
  navbar: {
    height: '70px',
    padding: '0 32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'sticky',
    top: 0,
    zIndex: 100,
    borderBottom: 'none',
    boxShadow: 'none'
  },
  leftSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  rightSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  notesButton: {
    height: '40px',
    padding: '0 14px',
    borderRadius: '10px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
    gap: '6px',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
    border: 'none'
  },
  helpButton: {
    height: '40px',
    padding: '0 14px',
    borderRadius: '10px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
    gap: '6px',
    border: '1px solid var(--border-color, #e5e7eb)'
  },
  iconButton: {
    width: '40px',
    height: '40px',
    border: '1px solid var(--border-color, #e5e7eb)',
    borderRadius: '10px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease'
  }
}

