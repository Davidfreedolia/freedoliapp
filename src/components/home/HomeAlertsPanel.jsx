/**
 * D21.4 — Panell d'alertes per la Home (margin o stockout).
 */
import { AlertTriangle } from 'lucide-react'
import { useTranslation } from 'react-i18next'

const MAX_ITEMS = 5

function formatPercent(ratio, lng) {
  if (!Number.isFinite(ratio)) return '—'
  const locale = lng === 'es' ? 'es-ES' : lng === 'en' ? 'en-US' : 'ca-ES'
  return new Intl.NumberFormat(locale, { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(ratio)
}

export default function HomeAlertsPanel({ title, items = [], type, emptyMessage }) {
  const { t, i18n } = useTranslation()
  const list = Array.isArray(items) ? items.slice(0, MAX_ITEMS) : []
  const isEmpty = list.length === 0
  const resolvedEmpty = emptyMessage ?? t('home.alerts.defaultEmpty')

  return (
    <div
      style={{
        flex: '1 1 280px',
        minWidth: 240,
        padding: '1rem 1.25rem',
        borderRadius: 8,
        background: 'var(--card-bg, #f9fafb)',
        border: `1px solid ${type === 'margin' ? 'var(--margin-alert-coral, #e07a5f)' : 'var(--stockout-alert-amber, var(--warning-1))'}`,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 10,
          fontSize: '0.9375rem',
          fontWeight: 600,
          color: 'var(--text-1, #111827)',
        }}
      >
        <AlertTriangle
          size={18}
          style={{
            color: type === 'margin' ? 'var(--margin-alert-coral, #e07a5f)' : 'var(--stockout-alert-amber, var(--warning-1))',
            flexShrink: 0,
          }}
        />
        {title}
      </div>
      {isEmpty ? (
        <div
          style={{
            fontSize: '0.8125rem',
            color: 'var(--text-2, #6b7280)',
          }}
        >
          {resolvedEmpty}
        </div>
      ) : (
        <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
          {list.map((item, index) => (
            <li
              key={item.asin ?? `item-${index}`}
              style={{
                padding: '6px 0',
                borderBottom: '1px solid var(--border-color, #e5e7eb)',
                fontSize: '0.8125rem',
              }}
            >
              <span style={{ fontWeight: 500, color: 'var(--text-1)' }}>{item.asin || '—'}</span>
              {type === 'margin' && (
                <span style={{ marginLeft: 8, color: 'var(--text-2)' }}>
                  {t('home.alerts.marginDrop')} {formatPercent(item.marginDrop, i18n.language)}
                </span>
              )}
              {type === 'stockout' && (
                <span style={{ marginLeft: 8, color: 'var(--text-2)' }}>
                  {Number.isFinite(item.daysOfStock) ? `${Number(item.daysOfStock).toFixed(1)} ${t('home.alerts.daysOfStock')}` : '—'}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
