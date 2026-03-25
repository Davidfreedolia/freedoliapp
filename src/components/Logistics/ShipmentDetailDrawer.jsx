import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { X, Truck, RefreshCw } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { showToast } from '../Toast'
import Button from '../Button'
import PackageList from './PackageList'
import TrackingEventList from './TrackingEventList'

function formatDate(v) {
  if (!v) return '—'
  try {
    return new Date(v).toLocaleString()
  } catch {
    return v
  }
}

export default function ShipmentDetailDrawer({ shipment, darkMode, onClose, onSyncDone }) {
  const { t } = useTranslation()
  const [packages, setPackages] = useState([])
  const SHIPMENT_STATUS_COLOR = {
    draft: { bg: '#6b7280', label: t('orders.shipmentsPanel.status.draft') },
    in_transit: { bg: '#f59e0b', label: t('orders.shipmentsPanel.status.inTransit') },
    customs: { bg: '#8b5cf6', label: t('orders.shipmentsPanel.status.customs') },
    delivered: { bg: '#22c55e', label: t('orders.shipmentsPanel.status.delivered') },
    exception: { bg: '#ef4444', label: t('orders.shipmentsPanel.status.exception') },
    cancelled: { bg: '#6b7280', label: t('orders.shipmentsPanel.status.cancelled') }
  }

  const [alerts, setAlerts] = useState([])
  const [loadingPackages, setLoadingPackages] = useState(true)
  const [loadingAlerts, setLoadingAlerts] = useState(true)
  const [selectedPackageId, setSelectedPackageId] = useState(null)
  const [syncing, setSyncing] = useState(false)

  useEffect(() => {
    if (!shipment?.id) return
    setLoadingPackages(true)
    supabase
      .from('packages')
      .select('id, tracking_number, carrier_name, status, last_tracking_sync_at')
      .eq('shipment_id', shipment.id)
      .order('created_at', { ascending: true })
      .then(({ data, error }) => {
        setLoadingPackages(false)
        if (error) {
          console.error('[ShipmentDetailDrawer] packages', error)
          setPackages([])
          return
        }
        const list = data || []
        setPackages(list)
        setSelectedPackageId(list[0]?.id ?? null)
      })
  }, [shipment?.id])

  useEffect(() => {
    if (!shipment?.id || !shipment?.org_id) return
    setLoadingAlerts(true)
    const prefix = `shipment:${shipment.id}:`
    supabase
      .from('alerts')
      .select('id, dedupe_key, title, status')
      .eq('org_id', shipment.org_id)
      .in('status', ['open', 'acknowledged'])
      .like('dedupe_key', `${prefix}%`)
      .then(({ data, error }) => {
        setLoadingAlerts(false)
        if (error) {
          console.error('[ShipmentDetailDrawer] alerts', error)
          setAlerts([])
          return
        }
        setAlerts(data || [])
      })
  }, [shipment?.id, shipment?.org_id])

  const destinationLabel = () => {
    if (!shipment) return '—'
    if (shipment.destination_type === 'amazon_fba') {
      return shipment.destination_amazon_fc_code
        ? `${t('orders.shipmentsPanel.destination.amazonFba')} · ${shipment.destination_amazon_fc_code}`
        : t('orders.shipmentsPanel.destination.amazonFba')
    }
    const country = shipment.destination_country || ''
    return country
      ? `${t('orders.shipmentsPanel.destination.warehouse')} · ${country}`
      : t('orders.shipmentsPanel.destination.warehouse')
  }

  const statusMeta = SHIPMENT_STATUS_COLOR[shipment?.status] || SHIPMENT_STATUS_COLOR.draft
  const alertChips = alerts.map((a) => {
    const key = a.dedupe_key || ''
    const suffix = key.replace(`shipment:${shipment?.id}:`, '')
    return { ...a, suffix }
  })

  const handleSyncNow = async () => {
    if (!shipment?.id || syncing) return
    setSyncing(true)
    try {
      const { error } = await supabase.rpc('tracking_sync_shipment', { p_shipment_id: shipment.id })
      if (error) throw error
      showToast(t('orders.shipmentsPanel.toasts.syncRequested'), 'success')
      onSyncDone?.()
      setLoadingPackages(true)
      supabase
        .from('packages')
        .select('id, tracking_number, carrier_name, status, last_tracking_sync_at')
        .eq('shipment_id', shipment.id)
        .order('created_at', { ascending: true })
        .then(({ data }) => {
          setLoadingPackages(false)
          setPackages(data || [])
        })
    } catch (err) {
      console.error('[ShipmentDetailDrawer] sync', err)
      showToast(err?.message || t('orders.shipmentsPanel.toasts.syncError'), 'error')
    }
    setSyncing(false)
  }

  if (!shipment) return null

  const shortId = shipment.id?.slice(0, 8) || '—'

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        bottom: 0,
        width: '100%',
        maxWidth: 480,
        backgroundColor: darkMode ? 'var(--page-bg)' : '#ffffff',
        boxShadow: 'var(--shadow-soft)',
        zIndex: 1100,
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 16px 12px',
          borderBottom: '1px solid var(--border-1)'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <Truck size={18} color="var(--muted-1)" />
            <span style={{ fontSize: 14, fontWeight: 600, color: darkMode ? '#e5e7eb' : '#111827' }}>
              {t('orders.shipmentsPanel.drawer.shipmentId', { id: shortId })}
            </span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                padding: '2px 8px',
                borderRadius: 999,
                backgroundColor: `${statusMeta.bg}20`,
                color: statusMeta.bg
              }}
            >
              {statusMeta.label}
            </span>
          </div>
          <div style={{ fontSize: 12, color: darkMode ? '#9ca3af' : '#6b7280' }}>
            {destinationLabel()} · {t('orders.shipmentsPanel.eta', { date: formatDate(shipment.eta_estimated) })}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          style={{
            border: 'none',
            background: 'transparent',
            padding: 4,
            cursor: 'pointer',
            color: 'var(--muted-1)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          aria-label={t('common.close')}
        >
          <X size={20} />
        </button>
      </div>

      {alertChips.length > 0 && (
        <div style={{ padding: '10px 16px', display: 'flex', flexWrap: 'wrap', gap: 6, borderBottom: '1px solid var(--border-1)' }}>
          {alertChips.map((a) => (
            <span
              key={a.id}
              style={{
                fontSize: 11,
                fontWeight: 600,
                padding: '4px 8px',
                borderRadius: 8,
                backgroundColor: darkMode ? 'var(--surface-bg-2)' : '#f3f4f6',
                color: darkMode ? '#e5e7eb' : '#374151',
                border: '1px solid var(--border-1)'
              }}
            >
              {a.suffix}
            </span>
          ))}
        </div>
      )}

      <div style={{ padding: 16, display: 'flex', gap: 12 }}>
        <Button
          variant="secondary"
          size="sm"
          onClick={handleSyncNow}
          disabled={syncing}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
        >
          <RefreshCw size={14} />
          {t('orders.shipmentsPanel.actions.syncNow')}
        </Button>
      </div>

      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: '0 16px 16px' }}>
        <h4 style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 600, color: darkMode ? '#e5e7eb' : '#374151' }}>
          {t('orders.shipmentsPanel.drawer.packages')}
        </h4>
        {loadingPackages ? (
          <div style={{ padding: 12, fontSize: 13, color: darkMode ? '#9ca3af' : '#6b7280' }}>{t('common.loading')}</div>
        ) : (
          <div style={{ marginBottom: 16, minHeight: 80 }}>
            <PackageList
              packages={packages}
              selectedPackageId={selectedPackageId}
              onSelectPackage={setSelectedPackageId}
              darkMode={darkMode}
            />
          </div>
        )}

        <h4 style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 600, color: darkMode ? '#e5e7eb' : '#374151' }}>
          {t('orders.shipmentsPanel.drawer.trackingEvents')}
        </h4>
        <div style={{ flex: 1, minHeight: 120, overflow: 'auto' }}>
          <TrackingEventList packageId={selectedPackageId} darkMode={darkMode} />
        </div>
      </div>
    </div>
  )
}
