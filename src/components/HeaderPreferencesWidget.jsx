import React from 'react'
import { Sun, Moon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useApp } from '../context/AppContext'

/**
 * Header preferences: day/night toggle (language control lives in AppLanguageControl on TopNavbar).
 */
export default function HeaderPreferencesWidget({ onLanguageClick }) {
  const { t } = useTranslation()
  const { darkMode, setDarkMode } = useApp()

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
        aria-label={darkMode ? t('topbar.themeAriaToLight') : t('topbar.themeAriaToDark')}
        title={darkMode ? t('topbar.themeTitleLight') : t('topbar.themeTitleDark')}
      >
        <span className="theme-pill__iconWrap" aria-hidden="true">
          {darkMode ? <Moon size={16} /> : <Sun size={16} />}
        </span>
        <span className="theme-pill__label">
          {darkMode ? t('topbar.themeLabelNight') : t('topbar.themeLabelDay')}
        </span>
      </button>
    </div>
  )
}
