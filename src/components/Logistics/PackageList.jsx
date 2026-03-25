import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

function formatDate(v) {
  if (!v) return '—'
  try {
    return new Date(v).toLocaleString()
  } catch {
    return v
  }
}

export default function PackageList({ packages, selectedPackageId, onSelectPackage, darkMode }) {
  const { t } = useTranslation()
  const list = useMemo(() => Array.isArray(packages) ? packages : [], [packages])
  const PACKAGE_STATUS_COLOR = {
    pending: { bg: '#6b7280', label: t('orders.shipmentsPanel.packageStatus.pending') },
    in_transit: { bg: '#f59e0b', label: t('orders.shipmentsPanel.packageStatus.inTransit') },
    delivered: { bg: '#22c55e', label: t('orders.shipmentsPanel.packageStatus.delivered') },
    exception: { bg: '#ef4444', label: t('orders.shipmentsPanel.packageStatus.exception') },
    cancelled: { bg: '#6b7280', label: t('orders.shipmentsPanel.packageStatus.cancelled') }
  }

  if (!list.length) {
    return (
      <div style={{ padding: 12, fontSize: 13, color: darkMode ? '#9ca3af' : '#6b7280' }}>
        {t('orders.shipmentsPanel.drawer.noPackages')}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {list.map((pkg) => {
        const meta = PACKAGE_STATUS_COLOR[pkg.status] || PACKAGE_STATUS_COLOR.pending
        const isSelected = pkg.id === selectedPackageId
        return (
          <button
            key={pkg.id}
            type="button"
            onClick={() => onSelectPackage(pkg.id)}
            style={{
              display: 'block',
              width: '100%',
              textAlign: 'left',
              padding: 12,
              borderRadius: 10,
              border: `1px solid ${isSelected ? 'var(--primary-1)' : 'var(--border-1)'}`,
              backgroundColor: isSelected ? (darkMode ? 'rgba(79,70,229,0.15)' : 'rgba(79,70,229,0.08)') : (darkMode ? 'var(--surface-bg-2)' : '#f9fafb'),
              cursor: 'pointer'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: darkMode ? '#e5e7eb' : '#111827' }}>
                {pkg.tracking_number || '—'}
              </span>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: 999,
                  backgroundColor: `${meta.bg}20`,
                  color: meta.bg
                }}
              >
                {meta.label}
              </span>
            </div>
            <div style={{ fontSize: 12, color: darkMode ? '#9ca3af' : '#6b7280' }}>
              {pkg.carrier_name && <span>{pkg.carrier_name} · </span>}
              {t('orders.shipmentsPanel.drawer.lastSync', { date: formatDate(pkg.last_tracking_sync_at) })}
            </div>
          </button>
        )
      })}
    </div>
  )
}
