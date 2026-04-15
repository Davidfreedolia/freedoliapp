import { useState, useMemo, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router-dom'
import { Lightbulb, X, Search, ChevronDown, ChevronUp, Mail, Send } from 'lucide-react'
import Button from '../Button'
import { getHelpContext, getAllFaqs, SUPPORT_EMAIL } from '../../lib/helpContent'

/**
 * HelpAssistant — floating bottom-right button + slide-in side panel.
 *
 * Per UX guidelines (ClickUp-inspired):
 * - Floating button (bottom: 24px; right: 24px) with lightbulb icon.
 * - Side panel (320px wide) overlay — does NOT push layout.
 * - Contextual title that changes per route.
 * - 3-5 FAQs for current context, click to expand answer.
 * - Search box filters across all FAQs.
 * - "Contactar" opens an inline form that composes a mailto: to support.
 *
 * Coexists with the existing AssistantPanel (intent-based query assistant in
 * the topnav). This is the FAQ-first surface; AssistantPanel is the chat-like
 * surface. Future cleanup may merge them.
 */
export default function HelpAssistant({ darkMode = false }) {
  const { t } = useTranslation()
  const { pathname } = useLocation()

  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [expanded, setExpanded] = useState(null) // qKey of expanded FAQ
  const [showContact, setShowContact] = useState(false)
  const [contactMessage, setContactMessage] = useState('')

  // Reset transient UI when panel closes.
  useEffect(() => {
    if (!open) {
      setQuery('')
      setExpanded(null)
      setShowContact(false)
      setContactMessage('')
    }
  }, [open])

  // Don't render on auth/landing/legal screens.
  const hidden = useMemo(() => {
    if (!pathname) return false
    return (
      pathname === '/' ||
      pathname.startsWith('/login') ||
      pathname.startsWith('/legal') ||
      pathname.startsWith('/landing')
    )
  }, [pathname])

  const ctx = useMemo(() => getHelpContext(pathname), [pathname])

  const visibleFaqs = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = q ? getAllFaqs() : ctx.faqs
    if (!q) return list
    return list.filter((f) => {
      const question = t(f.q, '').toLowerCase()
      const answer = t(f.a, '').toLowerCase()
      return question.includes(q) || answer.includes(q)
    })
  }, [query, ctx, t])

  if (hidden) return null

  // Palette per FreedoliApp guidelines (canvas — NO canviar).
  const ACCENT = '#6ECBC3' // Turquesa — primary CTA
  const PETROL = '#1F5F63'
  const cardBg = darkMode ? 'rgba(255,255,255,0.05)' : '#FFFFFF'
  const pageBg = darkMode ? 'var(--bg-dark, #15151f)' : '#F6F8F3'
  const ink = darkMode ? '#E8E8ED' : '#1A1A2E'
  const muted = darkMode ? '#9CA3AF' : '#6B7280'
  const border = darkMode ? 'rgba(255,255,255,0.1)' : '#E5E7EB'

  const handleContactSubmit = (e) => {
    e.preventDefault()
    const subject = encodeURIComponent(t('helpAssistant.contact.subject', 'Ajuda — FreedoliApp'))
    const body = encodeURIComponent(
      `${contactMessage}\n\n---\n${t('helpAssistant.contact.fromPage', 'Des de')}: ${pathname}`,
    )
    window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`
    setShowContact(false)
    setContactMessage('')
  }

  return (
    <>
      {/* Floating launcher */}
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={t('helpAssistant.openLabel', 'Obrir ajuda')}
          title={t('helpAssistant.openLabel', 'Obrir ajuda')}
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            width: 52,
            height: 52,
            borderRadius: '50%',
            backgroundColor: ACCENT,
            color: PETROL,
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 6px 20px rgba(0,0,0,0.18)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1090,
            transition: 'transform 0.15s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.06)')}
          onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        >
          <Lightbulb size={22} />
        </button>
      )}

      {/* Side panel */}
      {open && (
        <>
          <div
            role="presentation"
            onClick={() => setOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0,0,0,0.3)',
              zIndex: 1095,
            }}
          />
          <aside
            role="dialog"
            aria-label={t('helpAssistant.title', 'Ajuda')}
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              bottom: 0,
              width: '100%',
              maxWidth: 360,
              backgroundColor: pageBg,
              boxShadow: '-6px 0 24px rgba(0,0,0,0.18)',
              zIndex: 1096,
              display: 'flex',
              flexDirection: 'column',
              color: ink,
              fontFamily: 'Roboto, sans-serif',
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: '16px 18px',
                borderBottom: `1px solid ${border}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Lightbulb size={18} color={ACCENT} />
                <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
                  {t(ctx.titleKey, t('helpAssistant.title', 'Ajuda'))}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={t('common.close', 'Tanca')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: muted,
                  padding: 6,
                  borderRadius: 6,
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Search */}
            <div style={{ padding: '12px 18px', borderBottom: `1px solid ${border}` }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 12px',
                  borderRadius: 10,
                  backgroundColor: cardBg,
                  border: `1px solid ${border}`,
                }}
              >
                <Search size={14} color={muted} />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t('helpAssistant.searchPlaceholder', 'Cerca a l\'ajuda…')}
                  style={{
                    flex: 1,
                    border: 'none',
                    outline: 'none',
                    background: 'transparent',
                    color: ink,
                    fontSize: 13,
                    fontFamily: 'inherit',
                  }}
                />
              </div>
            </div>

            {/* FAQ list */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 18px' }}>
              {visibleFaqs.length === 0 ? (
                <p style={{ color: muted, fontSize: 13, textAlign: 'center', marginTop: 24 }}>
                  {t('helpAssistant.noResults', 'No hi ha resultats. Prova de contactar-nos.')}
                </p>
              ) : (
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {visibleFaqs.map((f) => {
                    const isOpen = expanded === f.q
                    return (
                      <li key={f.q}>
                        <button
                          type="button"
                          onClick={() => setExpanded(isOpen ? null : f.q)}
                          style={{
                            width: '100%',
                            textAlign: 'left',
                            padding: '10px 12px',
                            borderRadius: 10,
                            border: `1px solid ${border}`,
                            backgroundColor: cardBg,
                            color: ink,
                            fontSize: 13,
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 8,
                            fontFamily: 'inherit',
                          }}
                        >
                          <span style={{ flex: 1 }}>{t(f.q)}</span>
                          {isOpen ? <ChevronUp size={14} color={muted} /> : <ChevronDown size={14} color={muted} />}
                        </button>
                        {isOpen && (
                          <div
                            style={{
                              marginTop: 4,
                              padding: '10px 14px',
                              borderRadius: 8,
                              backgroundColor: darkMode ? 'rgba(110,203,195,0.08)' : 'rgba(110,203,195,0.12)',
                              color: ink,
                              fontSize: 13,
                              lineHeight: 1.5,
                            }}
                          >
                            {t(f.a)}
                          </div>
                        )}
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>

            {/* Contact section */}
            <div
              style={{
                padding: '12px 18px',
                borderTop: `1px solid ${border}`,
                backgroundColor: cardBg,
              }}
            >
              {!showContact ? (
                <Button
                  variant="primary"
                  onClick={() => setShowContact(true)}
                  style={{ width: '100%' }}
                >
                  <Mail size={14} style={{ marginRight: 6, verticalAlign: -2 }} />
                  {t('helpAssistant.contact.cta', 'Contactar amb suport')}
                </Button>
              ) : (
                <form onSubmit={handleContactSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: 0.4 }}>
                    {t('helpAssistant.contact.messageLabel', 'El teu missatge')}
                  </label>
                  <textarea
                    value={contactMessage}
                    onChange={(e) => setContactMessage(e.target.value)}
                    rows={3}
                    placeholder={t('helpAssistant.contact.placeholder', 'Explica\'ns què necessites…')}
                    required
                    style={{
                      padding: '8px 10px',
                      borderRadius: 8,
                      border: `1px solid ${border}`,
                      backgroundColor: pageBg,
                      color: ink,
                      fontSize: 13,
                      fontFamily: 'inherit',
                      resize: 'vertical',
                      outline: 'none',
                    }}
                  />
                  <div style={{ display: 'flex', gap: 6 }}>
                    <Button variant="ghost" size="sm" onClick={() => setShowContact(false)} type="button">
                      {t('common.cancel', 'Cancel·la')}
                    </Button>
                    <Button variant="primary" size="sm" type="submit" disabled={!contactMessage.trim()} style={{ flex: 1 }}>
                      <Send size={12} style={{ marginRight: 4, verticalAlign: -1 }} />
                      {t('helpAssistant.contact.send', 'Enviar')}
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </aside>
        </>
      )}
    </>
  )
}
