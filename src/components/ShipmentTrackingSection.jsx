import { useState, useEffect } from 'react'
import { Truck, Calendar, Package, CheckCircle, Clock, AlertCircle } from 'lucide-react'
import { getPoShipment, upsertPoShipment, setShipmentStatus } from '../lib/supabase'
import { useBreakpoint } from '../hooks/useBreakpoint'

const SHIPMENT_TYPES = [
  { value: 'SPD', label: 'SPD - Small Parcel Delivery' },
  { value: 'LTL', label: 'LTL - Less Than Truckload' },
  { value: 'FTL', label: 'FTL - Full Truckload' }
]

const SHIPMENT_STATUSES = [
  { value: 'planned', label: 'Planned', color: '#6b7280', icon: Clock },
  { value: 'booked', label: 'Booked', color: '#3b82f6', icon: Calendar },
  { value: 'picked_up', label: 'Picked Up', color: '#8b5cf6', icon: Package },
  { value: 'in_transit', label: 'In Transit', color: '#f59e0b', icon: Truck },
  { value: 'delivered', label: 'Delivered', color: '#22c55e', icon: CheckCircle }
]

export default function ShipmentTrackingSection({ po, darkMode }) {
  const { isMobile } = useBreakpoint()
  const [shipment, setShipment] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    shipment_type: 'SPD',
    carrier: '',
    tracking_number: '',
    pro_number: '',
    pickup_date: '',
    eta_date: '',
    status: 'planned',
    notes: ''
  })

  useEffect(() => {
    if (po?.id) {
      loadShipment()
    }
  }, [po?.id])

  const loadShipment = async () => {
    setLoading(true)
    try {
      const data = await getPoShipment(po.id)
      if (data) {
        setShipment(data)
        setFormData({
          shipment_type: data.shipment_type || 'SPD',
          carrier: data.carrier || '',
          tracking_number: data.tracking_number || '',
          pro_number: data.pro_number || '',
          pickup_date: data.pickup_date || '',
          eta_date: data.eta_date || '',
          status: data.status || 'planned',
          notes: data.notes || ''
        })
      }
    } catch (err) {
      console.error('Error carregant shipment:', err)
    }
    setLoading(false)
  }

  const handleSave = async () => {
    // Validacions
    if (formData.status !== 'planned') {
      if (formData.shipment_type === 'SPD' && !formData.tracking_number) {
        alert('El tracking number és obligatori per SPD quan l\'estat no és "planned"')
        return
      }
      if (['LTL', 'FTL'].includes(formData.shipment_type) && !formData.pro_number) {
        alert('El PRO number és obligatori per LTL/FTL quan l\'estat no és "planned"')
        return
      }
    }

    setSaving(true)
    try {
      const saved = await upsertPoShipment(po.id, formData)
      setShipment(saved)
      alert('Shipment guardat correctament')
    } catch (err) {
      console.error('Error guardant shipment:', err)
      alert('Error guardant shipment: ' + (err.message || 'Error desconegut'))
    }
    setSaving(false)
  }

  const handleQuickStatus = async (newStatus) => {
    try {
      const updated = await setShipmentStatus(po.id, newStatus)
      setShipment(updated)
      setFormData(prev => ({ ...prev, status: newStatus }))
      await loadShipment()
    } catch (err) {
      console.error('Error actualitzant estat:', err)
      alert('Error actualitzant estat: ' + (err.message || 'Error desconegut'))
    }
  }

  const getStatusInfo = (status) => {
    return SHIPMENT_STATUSES.find(s => s.value === status) || SHIPMENT_STATUSES[0]
  }

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Carregant shipment...</div>
      </div>
    )
  }

  const statusInfo = getStatusInfo(formData.status)
  const StatusIcon = statusInfo.icon

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h4 style={{
          ...styles.title,
          color: darkMode ? '#ffffff' : '#111827'
        }}>
          <Truck size={18} />
          Shipment to Amazon
        </h4>
        {shipment && (
          <span style={{
            ...styles.statusBadge,
            backgroundColor: `${statusInfo.color}15`,
            color: statusInfo.color
          }}>
            <StatusIcon size={14} />
            {statusInfo.label}
          </span>
        )}
      </div>

      <div style={styles.form}>
        {/* Shipment Type */}
        <div style={styles.formGroup}>
          <label style={{
            ...styles.label,
            color: darkMode ? '#e5e7eb' : '#374151'
          }}>
            Tipus d'Enviament *
          </label>
          <select
            value={formData.shipment_type}
            onChange={e => setFormData({ ...formData, shipment_type: e.target.value })}
            style={{
              ...styles.input,
              backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb',
              color: darkMode ? '#ffffff' : '#111827',
              borderColor: darkMode ? '#374151' : '#d1d5db'
            }}
          >
            {SHIPMENT_TYPES.map(type => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
        </div>

        {/* Carrier */}
        <div style={styles.formGroup}>
          <label style={{
            ...styles.label,
            color: darkMode ? '#e5e7eb' : '#374151'
          }}>
            Carrier
          </label>
          <input
            type="text"
            value={formData.carrier}
            onChange={e => setFormData({ ...formData, carrier: e.target.value })}
            placeholder="Ex: UPS, FedEx, DHL..."
            style={{
              ...styles.input,
              backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb',
              color: darkMode ? '#ffffff' : '#111827',
              borderColor: darkMode ? '#374151' : '#d1d5db'
            }}
          />
        </div>

        {/* Tracking Number (SPD) */}
        {formData.shipment_type === 'SPD' && (
          <div style={styles.formGroup}>
            <label style={{
              ...styles.label,
              color: darkMode ? '#e5e7eb' : '#374151'
            }}>
              Tracking Number {formData.status !== 'planned' && '*'}
            </label>
            <input
              type="text"
              value={formData.tracking_number}
              onChange={e => setFormData({ ...formData, tracking_number: e.target.value })}
              placeholder="Ex: 1Z999AA10123456784"
              style={{
                ...styles.input,
                backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb',
                color: darkMode ? '#ffffff' : '#111827',
                borderColor: darkMode ? '#374151' : '#d1d5db'
              }}
            />
          </div>
        )}

        {/* PRO Number (LTL/FTL) */}
        {['LTL', 'FTL'].includes(formData.shipment_type) && (
          <div style={styles.formGroup}>
            <label style={{
              ...styles.label,
              color: darkMode ? '#e5e7eb' : '#374151'
            }}>
              PRO Number {formData.status !== 'planned' && '*'}
            </label>
            <input
              type="text"
              value={formData.pro_number}
              onChange={e => setFormData({ ...formData, pro_number: e.target.value })}
              placeholder="Ex: PRO123456789"
              style={{
                ...styles.input,
                backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb',
                color: darkMode ? '#ffffff' : '#111827',
                borderColor: darkMode ? '#374151' : '#d1d5db'
              }}
            />
          </div>
        )}

        {/* Dates Grid */}
        <div style={{
          ...styles.formGrid,
          gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr'
        }}>
          <div style={styles.formGroup}>
            <label style={{
              ...styles.label,
              color: darkMode ? '#e5e7eb' : '#374151'
            }}>
              Pickup Date
            </label>
            <input
              type="date"
              value={formData.pickup_date}
              onChange={e => setFormData({ ...formData, pickup_date: e.target.value })}
              style={{
                ...styles.input,
                backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb',
                color: darkMode ? '#ffffff' : '#111827',
                borderColor: darkMode ? '#374151' : '#d1d5db'
              }}
            />
          </div>

          <div style={styles.formGroup}>
            <label style={{
              ...styles.label,
              color: darkMode ? '#e5e7eb' : '#374151'
            }}>
              ETA Date
            </label>
            <input
              type="date"
              value={formData.eta_date}
              onChange={e => setFormData({ ...formData, eta_date: e.target.value })}
              style={{
                ...styles.input,
                backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb',
                color: darkMode ? '#ffffff' : '#111827',
                borderColor: darkMode ? '#374151' : '#d1d5db'
              }}
            />
          </div>
        </div>

        {/* Status */}
        <div style={styles.formGroup}>
          <label style={{
            ...styles.label,
            color: darkMode ? '#e5e7eb' : '#374151'
          }}>
            Estat
          </label>
          <select
            value={formData.status}
            onChange={e => setFormData({ ...formData, status: e.target.value })}
            style={{
              ...styles.input,
              backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb',
              color: darkMode ? '#ffffff' : '#111827',
              borderColor: darkMode ? '#374151' : '#d1d5db'
            }}
          >
            {SHIPMENT_STATUSES.map(status => (
              <option key={status.value} value={status.value}>{status.label}</option>
            ))}
          </select>
        </div>

        {/* Notes */}
        <div style={styles.formGroup}>
          <label style={{
            ...styles.label,
            color: darkMode ? '#e5e7eb' : '#374151'
          }}>
            Notes
          </label>
          <textarea
            value={formData.notes}
            onChange={e => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Notes addicionals sobre l'enviament..."
            rows={3}
            style={{
              ...styles.textarea,
              backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb',
              color: darkMode ? '#ffffff' : '#111827',
              borderColor: darkMode ? '#374151' : '#d1d5db'
            }}
          />
        </div>

        {/* Quick Actions */}
        {shipment && (
          <div style={styles.quickActions}>
            <span style={{
              ...styles.quickActionsLabel,
              color: darkMode ? '#9ca3af' : '#6b7280'
            }}>
              Quick Actions:
            </span>
            <div style={styles.quickActionsButtons}>
              {formData.status !== 'booked' && (
                <button
                  onClick={() => handleQuickStatus('booked')}
                  style={{
                    ...styles.quickActionButton,
                    backgroundColor: '#3b82f6',
                    color: '#ffffff'
                  }}
                >
                  Mark Booked
                </button>
              )}
              {formData.status !== 'picked_up' && (
                <button
                  onClick={() => handleQuickStatus('picked_up')}
                  style={{
                    ...styles.quickActionButton,
                    backgroundColor: '#8b5cf6',
                    color: '#ffffff'
                  }}
                >
                  Mark Picked Up
                </button>
              )}
              {formData.status !== 'in_transit' && (
                <button
                  onClick={() => handleQuickStatus('in_transit')}
                  style={{
                    ...styles.quickActionButton,
                    backgroundColor: '#f59e0b',
                    color: '#ffffff'
                  }}
                >
                  Mark In Transit
                </button>
              )}
              {formData.status !== 'delivered' && (
                <button
                  onClick={() => handleQuickStatus('delivered')}
                  style={{
                    ...styles.quickActionButton,
                    backgroundColor: '#22c55e',
                    color: '#ffffff'
                  }}
                >
                  Mark Delivered
                </button>
              )}
            </div>
          </div>
        )}

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            ...styles.saveButton,
            backgroundColor: '#4f46e5',
            color: '#ffffff',
            opacity: saving ? 0.6 : 1,
            cursor: saving ? 'not-allowed' : 'pointer'
          }}
        >
          {saving ? 'Guardant...' : shipment ? 'Actualitzar Shipment' : 'Crear Shipment'}
        </button>
      </div>
    </div>
  )
}

const styles = {
  container: {
    padding: '20px',
    borderRadius: '12px',
    border: '1px solid var(--border-color)',
    backgroundColor: 'transparent'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px'
  },
  title: {
    margin: 0,
    fontSize: '16px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  statusBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: '500'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  formGrid: {
    display: 'grid',
    gap: '16px'
  },
  label: {
    fontSize: '13px',
    fontWeight: '500'
  },
  input: {
    padding: '10px 12px',
    borderRadius: '8px',
    border: '1px solid',
    fontSize: '14px',
    outline: 'none'
  },
  textarea: {
    padding: '10px 12px',
    borderRadius: '8px',
    border: '1px solid',
    fontSize: '14px',
    outline: 'none',
    resize: 'vertical',
    fontFamily: 'inherit'
  },
  quickActions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    padding: '16px',
    borderRadius: '8px',
    backgroundColor: 'var(--bg-secondary)'
  },
  quickActionsLabel: {
    fontSize: '12px',
    fontWeight: '500',
    textTransform: 'uppercase'
  },
  quickActionsButtons: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap'
  },
  quickActionButton: {
    padding: '8px 16px',
    borderRadius: '8px',
    border: 'none',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'opacity 0.2s'
  },
  saveButton: {
    padding: '12px 24px',
    borderRadius: '8px',
    border: 'none',
    fontSize: '14px',
    fontWeight: '500',
    marginTop: '8px'
  },
  loading: {
    padding: '24px',
    textAlign: 'center',
    color: '#6b7280'
  }
}





