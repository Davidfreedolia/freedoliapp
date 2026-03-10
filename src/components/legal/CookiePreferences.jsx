import React, { useState } from 'react'

export default function CookiePreferences({ initialPrefs, onClose, onSave }) {
  const [analytics, setAnalytics] = useState(Boolean(initialPrefs?.analytics))

  const handleSave = () => {
    onSave({ analytics })
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cookie-prefs-title"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15,23,42,0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1100,
      }}
    >
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: 12,
          maxWidth: 480,
          width: 'calc(100% - 32px)',
          padding: '20px 20px 16px',
          boxShadow: '0 20px 45px rgba(15,23,42,0.35)',
          fontSize: 14,
        }}
      >
        <h2 id="cookie-prefs-title" style={{ fontSize: 18, margin: 0, marginBottom: 8 }}>
          Cookie preferences
        </h2>
        <p style={{ fontSize: 13, color: '#4b5563', marginBottom: 16 }}>
          Choose how FREEDOLIAPP uses cookies. Essential cookies are always on because they are needed for the site to function.
        </p>

        <div style={{ marginBottom: 12 }}>
          <div style={{ fontWeight: 600, fontSize: 13 }}>Essential cookies</div>
          <p style={{ fontSize: 12, color: '#6b7280', margin: '4px 0 0' }}>
            Required for authentication, security and core functionality. Always active.
          </p>
          <div style={{ marginTop: 6, fontSize: 12, color: '#059669', fontWeight: 600 }}>
            Always on
          </div>
        </div>

        <div style={{ marginBottom: 16, paddingTop: 8, borderTop: '1px solid #e5e7eb' }}>
          <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 13 }}>Analytics cookies</div>
              <p style={{ fontSize: 12, color: '#6b7280', margin: '4px 0 0' }}>
                Help us understand how the product is used so we can improve it. Optional.
              </p>
            </div>
            <input
              type="checkbox"
              checked={analytics}
              onChange={(e) => setAnalytics(e.target.checked)}
            />
          </label>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              borderRadius: 999,
              border: '1px solid #e5e7eb',
              background: '#FFFFFF',
              color: '#374151',
              padding: '6px 12px',
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            style={{
              borderRadius: 999,
              border: 'none',
              background: '#111827',
              color: '#F9FAFB',
              padding: '6px 14px',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Save preferences
          </button>
        </div>
      </div>
    </div>
  )
}

