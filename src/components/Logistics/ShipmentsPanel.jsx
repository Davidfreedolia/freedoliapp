import { useState, useEffect } from 'react'
import { Truck, Eye, RefreshCw } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { showToast } from '../Toast'
import Button from '../Button'
import ShipmentDetailDrawer from './ShipmentDetailDrawer'

const SHIPMENT_STATUS_COLOR = {
  draft: { bg: '#6b7280', label: 'Draft' },
  in_transit: { bg: '#f59e0b', label: 'In transit' },
  customs: { bg: '#8b5cf6', label: 'Customs' },
  delivered: { bg: '#22c55e', label: 'Delivered' },
  exception: { bg: '#ef4444', label: 'Exception' },
  cancelled: { bg: '#6b7280', label: 'Cancelled' }
}

function formatDate(v) {
  if (!v) return '—'
  try {
    return new Date(v).toLocaleString()
  } catch {
    return v
  }
}

export default function ShipmentsPanel({ poId, orgId, darkMode, onShipmentSynced }) {
  const [shipments, setShipments] = useState([])
  const [loading, setLoading] = useState(true)
  const [drawerShipment, setDrawerShipment] = useState(null)
  const [syncingId, setSyncingId] = useState(null)

  const [packageStats, setPackageStats] = useState({})

  useEffect(() => {
    if (!poId) {
      setShipments([])
      setPackageStats({})
      setLoading(false)
      return
    }
    setLoading(true)
    supabase
      .from('shipments')
      .select('id, org_id, status, destination_type, destination_country, destination_amazon_fc_code, eta_estimated, updated_at')
      .eq('purchase_order_id', poId)
      .order('created_at', { ascending: false })
      .then(async ({ data, error }) => {
        if (error) {
          console.error('[ShipmentsPanel]', error)
          setShipments([])
          setPackageStats({})
          setLoading(false)
          return
        }
        const list = data || []
        setShipments(list)
        if (list.length === 0) {
          setPackageStats({})
          setLoading(false)
          return
        }
        const ids = list.map((s) => s.id)
        const { data: pkgData } = await supabase
          .from('packages')
          .select('shipment_id, last_tracking_sync_at')
          .in('shipment_id', ids)
        const stats = {}
        ;(pkgData || []).forEach((p) => {
          if (!stats[p.shipment_id]) stats[p.shipment_id] = { count: 0, lastSync: null }
          stats[p.shipment_id].count += 1
          const t = p.last_tracking_sync_at ? new Date(p.last_tracking_sync_at).getTime() : 0
          const cur = stats[p.shipment_id].lastSync ? new Date(stats[p.shipment_id].lastSync).getTime() : 0
          if (t > cur) stats[p.shipment_id].lastSync = p.last_tracking_sync_at
        })
        setPackageStats(stats)
        setLoading(false)
      })
  }, [poId])

  const handleSyncNow = async (shipment) => {
    if (!shipment?.id || syncingId) return
    setSyncingId(shipment.id)
    try {
      const { error } = await supabase.rpc('tracking_sync_shipment', { p_shipment_id: shipment.id })
      if (error) throw error
      showToast('Sync requested', 'success')
      onShipmentSynced?.()
      setShipments((prev) => prev.map((s) => (s.id === shipment.id ? { ...s, updated_at: new Date().toISOString() } : s)))
    } catch (err) {
      console.error('[ShipmentsPanel] sync', err)
      showToast(err?.message || 'Error en el sync', 'error')
    }
    setSyncingId(null)
  }

  const destinationLabel = (s) => {
    if (s.destination_type === 'amazon_fba') {
      return s.destination_amazon_fc_code ? `Amazon FBA · ${s.destination_amazon_fc_code}` : 'Amazon FBA'
    }
    const country = s.destination_country || ''
    return country ? `Warehouse · ${country}` : 'Warehouse'
  }

  if (!poId) return null

  return (
    <>
      <div style={{ marginBottom: 16 }}>
        <h4 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 600, color: darkMode ? '#e5e7eb' : '#374151' }}>
          Shipments
        </h4>
        {loading ? (
          <div style={{ padding: 24, fontSize: 13, color: darkMode ? '#9ca3af' : '#6b7280' }}>Carregant…</div>
        ) : !shipments.length ? (
          <div
            style={{
              padding: 24,
              borderRadius: 12,
              border: '1px solid var(--border-1)',
              backgroundColor: darkMode ? 'var(--surface-bg-2)' : '#f9fafb',
              fontSize: 13,
              color: darkMode ? '#9ca3af' : '#6b7280'
            }}
          >
            Cap shipment per aquest PO.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {shipments.map((s) => {
              const meta = SHIPMENT_STATUS_COLOR[s.status] || SHIPMENT_STATUS_COLOR.draft
              const stats = packageStats[s.id] || { count: 0, lastSync: null }
              return (
                <ShipmentCard
                  key={s.id}
                  shipment={s}
                  meta={meta}
                  destinationLabel={destinationLabel(s)}
                  formatDate={formatDate}
                  darkMode={darkMode}
                  packageCount={stats.count}
                  lastSync={stats.lastSync}
                  onView={() => setDrawerShipment(s)}
                  onSyncNow={() => handleSyncNow(s)}
                  syncing={syncingId === s.id}
                />
              )
            })}
          </div>
        )}
      </div>

      {drawerShipment && (
        <>
          <div
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0,0,0,0.4)',
              zIndex: 1099
            }}
            onClick={() => setDrawerShipment(null)}
            aria-hidden="true"
          />
          <ShipmentDetailDrawer
            shipment={drawerShipment}
            darkMode={darkMode}
            onClose={() => setDrawerShipment(null)}
            onSyncDone={() => {
              setShipments((prev) =>
                prev.map((x) => (x.id === drawerShipment.id ? { ...x, updated_at: new Date().toISOString() } : x))
              )
            }}
          />
        </>
      )}
    </>
  )
}

function ShipmentCard({
  shipment,
  meta,
  destinationLabel,
  formatDate,
  darkMode,
  packageCount,
  lastSync,
  onView,
  onSyncNow,
  syncing
}) {
  return (
    <div
      style={{
        padding: 16,
        borderRadius: 12,
        border: '1px solid var(--border-1)',
        boxShadow: 'var(--shadow-soft)',
        backgroundColor: darkMode ? 'var(--surface-bg)' : '#ffffff'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Truck size={16} color="var(--muted-1)" />
          <span style={{ fontSize: 13, fontWeight: 600, color: darkMode ? '#e5e7eb' : '#111827' }}>
            {shipment.id?.slice(0, 8)}
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
      </div>
      <div style={{ fontSize: 12, color: darkMode ? '#9ca3af' : '#6b7280', marginBottom: 8 }}>
        {destinationLabel}
      </div>
      <div style={{ fontSize: 12, color: darkMode ? '#9ca3af' : '#6b7280', marginBottom: 12 }}>
        {packageCount != null ? `${packageCount} package(s)` : '—'}
        {(lastSync || shipment.updated_at) && ` · Last update: ${formatDate(lastSync || shipment.updated_at)}`}
      </div>
      <div style={{ fontSize: 12, color: darkMode ? '#9ca3af' : '#6b7280', marginBottom: 12 }}>
        ETA: {formatDate(shipment.eta_estimated)}
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Button variant="secondary" size="sm" onClick={onView} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <Eye size={14} /> View
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={onSyncNow}
          disabled={syncing}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
        >
          <RefreshCw size={14} /> Sync now
        </Button>
      </div>
    </div>
  )
}
