import React, { useEffect, useState } from 'react'
import CookiePreferences from './CookiePreferences'

const CONSENT_KEY = 'freedoliapp_cookie_consent'
const PREFS_KEY = 'freedoliapp_cookie_preferences'

function getInitialState() {
  if (typeof window === 'undefined') return { consent: 'no_choice', prefs: { analytics: false } }
  try {
    const raw = window.localStorage.getItem(CONSENT_KEY)
    const prefsRaw = window.localStorage.getItem(PREFS_KEY)
    const consent = raw || 'no_choice'
    const prefs = prefsRaw ? JSON.parse(prefsRaw) : { analytics: false }
    return { consent, prefs }
  } catch {
    return { consent: 'no_choice', prefs: { analytics: false } }
  }
}

export default function CookieBanner({ locationPathname }) {
  const [state, setState] = useState(() => getInitialState())
  const [showPrefs, setShowPrefs] = useState(false)

  const isAppRoute = locationPathname.startsWith('/app')
  const isActivation = locationPathname === '/activation'
  const isPublicContext = !isAppRoute && !isActivation

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.setItem(CONSENT_KEY, state.consent)
      window.localStorage.setItem(PREFS_KEY, JSON.stringify(state.prefs))
    } catch {
      // ignore
    }
  }, [state])

  const handleAcceptAll = () => {
    setState({ consent: 'accepted_all', prefs: { analytics: true } })
  }

  const handleRejectNonEssential = () => {
    setState({ consent: 'rejected_non_essential', prefs: { analytics: false } })
  }

  const handleSaveCustom = (prefs) => {
    setState({ consent: 'custom_preferences', prefs })
    setShowPrefs(false)
  }

  if (!isPublicContext) {
    return null
  }

  const shouldShowBanner = state.consent === 'no_choice'

  return (
    <>
      {shouldShowBanner && (
        <div
          style={{
            position: 'fixed',
            bottom: 16,
            left: '50%',
            transform: 'translateX(-50%)',
            maxWidth: 640,
            width: 'calc(100% - 32px)',
            background: '#111827',
            color: '#F9FAFB',
            padding: '12px 16px',
            borderRadius: 12,
            boxShadow: '0 10px 25px rgba(0,0,0,0.35)',
            fontSize: 13,
            zIndex: 1000,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>Cookies on FREEDOLIAPP</div>
              <div style={{ opacity: 0.9 }}>
                We use essential cookies to make the site work, and optional analytics cookies to improve the product.
                You can accept all, reject non-essential, or manage your preferences.
              </div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setShowPrefs(true)}
                style={{
                  borderRadius: 999,
                  border: '1px solid rgba(249,250,251,0.35)',
                  background: 'transparent',
                  color: '#F9FAFB',
                  padding: '6px 10px',
                  fontSize: 12,
                  cursor: 'pointer',
                }}
              >
                Manage preferences
              </button>
              <button
                type="button"
                onClick={handleRejectNonEssential}
                style={{
                  borderRadius: 999,
                  border: 'none',
                  background: '#374151',
                  color: '#F9FAFB',
                  padding: '6px 12px',
                  fontSize: 12,
                  cursor: 'pointer',
                }}
              >
                Reject non-essential
              </button>
              <button
                type="button"
                onClick={handleAcceptAll}
                style={{
                  borderRadius: 999,
                  border: 'none',
                  background: '#10B981',
                  color: '#022C22',
                  padding: '6px 14px',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Accept all
              </button>
            </div>
          </div>
        </div>
      )}

      {showPrefs && (
        <CookiePreferences
          initialPrefs={state.prefs}
          onClose={() => setShowPrefs(false)}
          onSave={handleSaveCustom}
        />
      )}
    </>
  )
}

export { CONSENT_KEY, PREFS_KEY }

