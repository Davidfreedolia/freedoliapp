import React from 'react'
import DecisionNotificationItem from './DecisionNotificationItem'

export default function DecisionDropdown({ items, loading, error, onItemClick, onClose }) {
  return (
    <div
      style={{
        position: 'absolute',
        top: '100%',
        right: 0,
        marginTop: 4,
        width: 320,
        maxHeight: 360,
        backgroundColor: 'var(--surface-bg-2, #020617)',
        borderRadius: 10,
        boxShadow: 'var(--shadow-soft, 0 10px 40px rgba(15,23,42,0.6))',
        border: '1px solid var(--border-1, #1f2933)',
        overflow: 'hidden',
        zIndex: 1600,
      }}
    >
      <div
        style={{
          padding: '8px 10px',
          borderBottom: '1px solid var(--border-1, #1f2933)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
        }}
      >
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: 0.6,
            color: 'var(--text-secondary, #9ca3af)',
          }}
        >
          Decisions
        </span>
        <button
          type="button"
          onClick={onClose}
          style={{
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            fontSize: 11,
            color: 'var(--text-secondary, #9ca3af)',
          }}
        >
          Close
        </button>
      </div>
      <div
        style={{
          maxHeight: 320,
          overflowY: 'auto',
          padding: '6px 6px 8px',
          backgroundColor: 'var(--surface-bg, #020617)',
        }}
      >
        {loading && (
          <div
            style={{
              padding: 10,
              fontSize: 12,
              color: 'var(--text-secondary, #9ca3af)',
            }}
          >
            Loading decisions…
          </div>
        )}
        {error && !loading && (
          <div
            style={{
              padding: 10,
              fontSize: 12,
              color: 'var(--status-critical, #b91c1c)',
            }}
          >
            Error loading decision notifications.
          </div>
        )}
        {!loading && !error && (!items || items.length === 0) && (
          <div
            style={{
              padding: 10,
              fontSize: 12,
              color: 'var(--text-secondary, #9ca3af)',
            }}
          >
            No new decisions.
          </div>
        )}
        {!loading && !error && items && items.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {items.map((item) => (
              <DecisionNotificationItem key={item.id} item={item} onClick={onItemClick} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

