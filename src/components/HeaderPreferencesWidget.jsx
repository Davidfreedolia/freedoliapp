import React from 'react'
import { Sun, Moon, Settings } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useApp } from '../context/AppContext'
import { useNavigate } from 'react-router-dom'

/**
 * HeaderPreferencesWidget - Preferences controls grouped together
 * Contains: Day/Night toggle + Settings
 * Language selector disabled (P0 pragmatic - Catalan only)
 */
export default function HeaderPreferencesWidget({ onLanguageClick }) {
  const { darkMode, setDarkMode } = useApp()
  const { t } = useTranslation()
  const navigate = useNavigate()

  const widgetStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 8px',
    borderRadius: 'var(--radius-ui)',
    backgroundColor: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    height: '36px' // Consistent height with other widgets
  }

  const buttonStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '32px',
    height: '32px',
    padding: 0,
    borderRadius: 'var(--radius-ui)',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--color-muted)',
    transition: 'all 0.15s ease'
  }

  const buttonHoverStyle = {
    backgroundColor: 'var(--color-bg)',
    color: 'var(--color-text)'
  }

  return (
    <div style={widgetStyle}>
      {/* Language Selector - DISABLED (P0 pragmatic) */}
      {/* <button
        onClick={onLanguageClick}
        style={buttonStyle}
        title={t('navbar.language') || 'Idioma'}
        aria-label={t('navbar.language') || 'Idioma'}
        onMouseEnter={(e) => {
          Object.assign(e.currentTarget.style, buttonHoverStyle)
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent'
          e.currentTarget.style.color = 'var(--color-muted)'
        }}
      >
        <Globe size={18} />
      </button> */}

      {/* Day/Night Toggle */}
      <button
        onClick={() => setDarkMode(!darkMode)}
        className={`fd-switch ${darkMode ? 'is-on' : ''}`}
        title={darkMode ? t('navbar.lightMode') : t('navbar.darkMode')}
        aria-label={darkMode ? t('navbar.lightMode') : t('navbar.darkMode')}
      >
        <span className="fd-switch__thumb" />
      </button>

      {/* Settings */}
      <button
        onClick={() => navigate('/settings')}
        style={buttonStyle}
        title={t('navbar.settings')}
        aria-label={t('navbar.settings')}
        onMouseEnter={(e) => {
          Object.assign(e.currentTarget.style, buttonHoverStyle)
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent'
          e.currentTarget.style.color = 'var(--color-muted)'
        }}
      >
        <Settings size={18} />
      </button>
    </div>
  )
}
