import { useState, useEffect, useRef } from 'react'
import { Globe, ChevronDown } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { UI_LANGUAGE_OPTIONS, normalizeLang } from '../i18n/languageStorage'
import Button from './Button'

/**
 * B4 — Compact in-app UI language switcher (ca / en / es).
 * Persists via i18n `languageChanged` → languageStorage.
 */
export default function AppLanguageControl({ className = '' }) {
  const { t, i18n } = useTranslation()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const current = normalizeLang(i18n.language)

  useEffect(() => {
    if (!open) return
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={ref} className={className} style={{ position: 'relative' }}>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t('navbar.language')}
        title={t('navbar.language')}
        className="topbar-button topbar-language"
      >
        <Globe size={16} aria-hidden />
        <span style={{ marginLeft: 4, fontSize: 12, fontWeight: 600, letterSpacing: '0.02em' }}>
          {current.toUpperCase()}
        </span>
        <ChevronDown size={12} aria-hidden style={{ marginLeft: 2, opacity: 0.85 }} />
      </Button>
      {open && (
        <div
          role="listbox"
          aria-label={t('language.select')}
          style={{
            position: 'absolute',
            right: 0,
            marginTop: 6,
            minWidth: 160,
            background: 'var(--surface-bg-2, #1e1e2e)',
            borderRadius: 8,
            border: '1px solid var(--border-1, #374151)',
            boxShadow: '0 8px 20px rgba(0,0,0,0.25)',
            zIndex: 50,
            padding: 4,
          }}
        >
          {UI_LANGUAGE_OPTIONS.map((opt) => {
            const active = opt.code === current
            return (
              <button
                key={opt.code}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => {
                  i18n.changeLanguage(opt.code)
                  setOpen(false)
                }}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 10px',
                  fontSize: 13,
                  background: active ? 'var(--surface-bg-3, #2d2d3d)' : 'transparent',
                  color: 'var(--text-1, #f3f4f6)',
                  border: 'none',
                  borderRadius: 6,
                  cursor: 'pointer',
                  fontWeight: active ? 600 : 500,
                }}
              >
                <span>{opt.nativeName}</span>
                <span style={{ fontSize: 11, opacity: 0.7 }}>{opt.code.toUpperCase()}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
