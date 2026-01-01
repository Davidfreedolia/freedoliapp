import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, X } from 'lucide-react'
import { getAlerts, getDashboardPreferences } from '../lib/supabase'

export default function AlertsBadge({ darkMode }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showTooltip, setShowTooltip] = useState(false)

  useEffect(() => {
    loadAlerts()
    // Refresh every 5 minutes
    const interval = setInterval(loadAlerts, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  const loadAlerts = async () => {
    setLoading(true)
    try {
      const preferences = await getDashboardPreferences()
      const thresholds = preferences?.alert_thresholds || {
        manufacturerPackDays: 3,
        researchDays: 7
      }
      const alertsData = await getAlerts(thresholds)
      setAlerts(alertsData || [])
    } catch (err) {
      console.error('Error loading alerts:', err)
    }
    setLoading(false)
  }

  if (loading || alerts.length === 0) {
    return null
  }

  const highSeverityCount = alerts.filter(a => a.severity === 'high').length
  const mediumSeverityCount = alerts.filter(a => a.severity === 'medium').length

  const handleClick = () => {
    // Navigate to relevant section based on alert type
    if (alerts.length > 0) {
      const firstAlert = alerts[0]
      if (firstAlert.entityType === 'purchase_order') {
        navigate(`/orders?po=${firstAlert.entityId}`)
      } else if (firstAlert.entityType === 'project') {
        navigate(`/projects/${firstAlert.entityId}`)
      }
    }
  }

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={handleClick}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 12px',
          backgroundColor: highSeverityCount > 0 ? '#ef4444' : '#f59e0b',
          color: '#ffffff',
          border: 'none',
          borderRadius: '6px',
          fontSize: '12px',
          fontWeight: '500',
          cursor: 'pointer',
          position: 'relative'
        }}
      >
        <AlertTriangle size={16} />
        <span>{alerts.length}</span>
      </button>

      {showTooltip && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: '8px',
            padding: '12px',
            backgroundColor: darkMode ? '#1f1f2e' : '#ffffff',
            border: `1px solid ${darkMode ? '#374151' : '#d1d5db'}`,
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            minWidth: '280px',
            maxWidth: '400px',
            zIndex: 1000
          }}
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
        >
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '8px',
            paddingBottom: '8px',
            borderBottom: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`
          }}>
            <h4 style={{
              margin: 0,
              fontSize: '13px',
              fontWeight: '600',
              color: darkMode ? '#ffffff' : '#111827'
            }}>
              Alertes ({alerts.length})
            </h4>
            <button
              onClick={(e) => {
                e.stopPropagation()
                setShowTooltip(false)
              }}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                color: darkMode ? '#9ca3af' : '#6b7280'
              }}
            >
              <X size={14} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {alerts.slice(0, 5).map((alert, index) => {
              const severityColor = alert.severity === 'high' ? '#ef4444' : '#f59e0b'
              
              return (
                <div
                  key={index}
                  onClick={() => {
                    if (alert.entityType === 'purchase_order') {
                      navigate(`/orders?po=${alert.entityId}`)
                    } else if (alert.entityType === 'project') {
                      navigate(`/projects/${alert.entityId}`)
                    }
                    setShowTooltip(false)
                  }}
                  style={{
                    padding: '8px',
                    borderRadius: '6px',
                    backgroundColor: darkMode ? '#0a0a0f' : '#f9fafb',
                    border: `1px solid ${severityColor}40`,
                    cursor: 'pointer',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = darkMode ? '#1f1f2e' : '#f3f4f6'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = darkMode ? '#0a0a0f' : '#f9fafb'
                  }}
                >
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    marginBottom: '4px'
                  }}>
                    <div style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: severityColor
                    }} />
                    <span style={{
                      fontSize: '11px',
                      fontWeight: '600',
                      color: severityColor,
                      textTransform: 'uppercase'
                    }}>
                      {alert.type === 'manufacturer_pack' ? 'Pack' :
                       alert.type === 'shipment' ? 'Enviament' :
                       'Recerca'}
                    </span>
                  </div>
                  <div style={{
                    fontSize: '12px',
                    color: darkMode ? '#e5e7eb' : '#374151',
                    marginBottom: '2px'
                  }}>
                    {alert.poNumber || alert.projectName}
                    {alert.sku && ` (${alert.sku})`}
                  </div>
                  <div style={{
                    fontSize: '11px',
                    color: darkMode ? '#9ca3af' : '#6b7280'
                  }}>
                    {alert.message}
                  </div>
                </div>
              )
            })}
            {alerts.length > 5 && (
              <div style={{
                fontSize: '11px',
                color: darkMode ? '#9ca3af' : '#6b7280',
                textAlign: 'center',
                paddingTop: '4px',
                borderTop: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`
              }}>
                +{alerts.length - 5} més
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}


