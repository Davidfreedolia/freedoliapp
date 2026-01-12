import React, { useState } from 'react'
import { Globe, X, Check } from 'lucide-react'
import { useTranslation } from 'react-i18next'

/**
 * Language Selector Component - Asana-style dropdown
 * Allows user to select language (CA, EN, ES)
 */
export default function LanguageSelector({ isOpen, onClose }) {
  const { i18n, t } = useTranslation()

  const languages = [
    { code: 'ca', name: 'Català', nativeName: 'Català' },
    { code: 'en', name: 'English', nativeName: 'English' },
    { code: 'es', name: 'Español', nativeName: 'Español' }
  ]

  const handleLanguageChange = async (langCode) => {
    await i18n.changeLanguage(langCode)
    localStorage.setItem('freedoliapp.lang', langCode)
    onClose()
  }

  if (!isOpen) return null

  const styles = {
    overlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '16px'
    },
    modal: {
      backgroundColor: 'var(--color-surface)',
      borderRadius: 'var(--radius-ui)',
      padding: '20px',
      maxWidth: '320px',
      width: '100%',
      boxShadow: 'var(--shadow-lg)',
      position: 'relative'
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '16px'
    },
    title: {
      fontSize: '16px',
      fontWeight: '600',
      color: 'var(--color-text)',
      margin: 0,
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    closeButton: {
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      padding: '4px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 'var(--radius-ui)',
      color: 'var(--color-muted)',
      transition: 'all 0.15s ease'
    },
    languageList: {
      display: 'flex',
      flexDirection: 'column',
      gap: '4px'
    },
    languageButton: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '10px 12px',
      borderRadius: 'var(--radius-ui)',
      border: '1px solid transparent',
      backgroundColor: 'transparent',
      color: 'var(--color-text)',
      cursor: 'pointer',
      transition: 'all 0.15s ease',
      fontSize: '14px',
      fontWeight: '500'
    },
    languageButtonHover: {
      backgroundColor: 'var(--color-bg)',
      borderColor: 'var(--color-border)'
    },
    languageButtonActive: {
      backgroundColor: 'var(--color-accent)',
      color: '#FFFFFF',
      borderColor: 'var(--color-accent)'
    },
    languageInfo: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px'
    },
    languageCode: {
      fontSize: '12px',
      fontWeight: '700',
      color: 'inherit',
      opacity: 0.8,
      minWidth: '32px'
    },
    languageName: {
      fontSize: '14px',
      fontWeight: '500',
      color: 'inherit'
    },
    checkIcon: {
      width: '18px',
      height: '18px',
      color: 'inherit'
    }
  }

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h3 style={styles.title}>
            <Globe size={18} />
            {t('language.select') || 'Seleccionar idioma'}
          </h3>
          <button
            style={styles.closeButton}
            onClick={onClose}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-bg)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent'
            }}
          >
            <X size={18} />
          </button>
        </div>

        <div style={styles.languageList}>
          {languages.map((lang) => {
            const isActive = i18n.language === lang.code || i18n.language?.startsWith(lang.code)
            return (
              <button
                key={lang.code}
                style={{
                  ...styles.languageButton,
                  ...(isActive ? styles.languageButtonActive : {})
                }}
                onClick={() => handleLanguageChange(lang.code)}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = 'var(--color-bg)'
                    e.currentTarget.style.borderColor = 'var(--color-border)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = 'transparent'
                    e.currentTarget.style.borderColor = 'transparent'
                  }
                }}
              >
                <div style={styles.languageInfo}>
                  <span style={styles.languageCode}>{lang.code.toUpperCase()}</span>
                  <span style={styles.languageName}>{lang.nativeName}</span>
                </div>
                {isActive && <Check size={18} style={styles.checkIcon} />}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}