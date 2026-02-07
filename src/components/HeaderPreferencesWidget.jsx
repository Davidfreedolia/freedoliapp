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
    padding: 0,
    borderRadius: 'var(--radius-ui)',
    backgroundColor: 'transparent',
    border: 'none',
    height: 'var(--h-btn)'
  }

  const buttonStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 'var(--h-btn)',
    height: 'var(--h-btn)',
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
        type="button"
        className={`theme-pill ${darkMode ? 'is-dark' : 'is-light'}`}
        onClick={() => setDarkMode(!darkMode)}
        aria-label={darkMode ? 'Activar mode dia' : 'Activar mode nit'}
        title={darkMode ? 'Mode dia' : 'Mode nit'}
      >
        <span className="theme-pill__iconWrap" aria-hidden="true">
          {darkMode ? <Moon size={16} /> : <Sun size={16} />}
        </span>
        <span className="theme-pill__label">
          {darkMode ? 'NIT' : 'DIA'}
        </span>
      </button>

      {/* Settings */}
      <button
        onClick={() => navigate('/settings')}
        style={buttonStyle}
        className="btn-icon btn-ghost"
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
