import React from 'react'
import { useTranslation } from 'react-i18next'
import DecisionNotificationItem from './DecisionNotificationItem'

export default function DecisionDropdown({ items, loading, error, onItemClick, onClose, onCreateTask }) {
  const { t } = useTranslation()
  return (
    <div
      style={{
        position: 'absolute',
        top: '100%',
        right: 0,
        marginTop: 4,
        width: 320,
        maxHeight: 360,
        backgroundColor: 'var(--surface-bg, #ffffff)',
        borderRadius: 12,
        boxShadow: 'var(--shadow-soft, 0 10px 30px rgba(31,95,99,0.10))',
        border: '1px solid var(--border-1, #D8E1DE)',
        overflow: 'hidden',
        zIndex: 1600,
      }}
    >
      <div
        style={{
          padding: '8px 10px',
          borderBottom: '1px solid var(--border-1, #D8E1DE)',
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
            color: 'var(--text-2, #5F7476)',
          }}
        >
          {t('decisionsDropdown.title')}
        </span>
        <button
          type="button"
          onClick={onClose}
          style={{
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            fontSize: 11,
            color: 'var(--text-2, #5F7476)',
          }}
        >
          {t('decisionsDropdown.close')}
        </button>
      </div>
      <div
        style={{
          maxHeight: 320,
          overflowY: 'auto',
          padding: '6px 6px 8px',
          backgroundColor: 'var(--surface-bg, #ffffff)',
        }}
      >
        {loading && (
          <div
            style={{
              padding: 10,
              fontSize: 12,
              color: 'var(--text-2, #5F7476)',
            }}
          >
            {t('decisionsDropdown.loading')}
          </div>
        )}
        {error && !loading && (
          <div
            style={{
              padding: 10,
              fontSize: 12,
              color: 'var(--danger-1, #E55353)',
            }}
          >
            {t('decisionsDropdown.error')}
          </div>
        )}
        {!loading && !error && (!items || items.length === 0) && (
          <div
            style={{
              padding: 10,
              fontSize: 12,
              color: 'var(--text-2, #5F7476)',
            }}
          >
            {t('decisionsDropdown.empty')}
          </div>
        )}
        {!loading && !error && items && items.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {items.map((item) => (
              <DecisionNotificationItem key={item.id} item={item} onClick={onItemClick} onCreateTask={onCreateTask} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

