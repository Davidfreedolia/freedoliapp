import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, X } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { getAlerts, getDashboardPreferences } from '../lib/supabase'

export default function AlertsBadge({ darkMode }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { activeOrgId } = useApp()
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showTooltip, setShowTooltip] = useState(false)

  const loadAlerts = useCallback(async () => {
    setLoading(true)
    try {
      const preferences = await getDashboardPreferences(activeOrgId ?? undefined)
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
  }, [activeOrgId])

  useEffect(() => {
    loadAlerts()
    // Refresh every 5 minutes
    const interval = setInterval(loadAlerts, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [loadAlerts])

  if (loading || alerts.length === 0) {
    return null
  }

  const highSeverityCount = alerts.filter(a => a.severity === 'high').length

  const handleClick = () => {
    // Navigate to relevant section based on alert type
    if (alerts.length > 0) {
      const firstAlert = alerts[0]
      if (firstAlert.entityType === 'purchase_order') {
        navigate(`/app/orders?po=${firstAlert.entityId}`)
      } else if (firstAlert.entityType === 'project') {
        navigate(`/app/projects/${firstAlert.entityId}`)
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
          backgroundColor: highSeverityCount > 0 ? 'var(--danger-1)' : 'var(--warning-1)',
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
            border: `1px solid ${darkMode ? 'var(--text-1)' : 'var(--border-1)'}`,
            borderRadius: '8px',
            boxShadow: 'var(--shadow-popover)',
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
            borderBottom: `1px solid ${darkMode ? 'var(--text-1)' : 'var(--border-1)'}`
          }}>
            <h4 style={{
              margin: 0,
              fontSize: '13px',
              fontWeight: '600',
              color: darkMode ? '#ffffff' : 'var(--text-1)'
            }}>
              {t('alertsBadge.title', { count: alerts.length })}
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
                color: darkMode ? 'var(--muted-1)' : 'var(--text-2)'
              }}
            >
              <X size={14} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {alerts.slice(0, 5).map((alert, index) => {
              const severityColor = alert.severity === 'high' ? 'var(--danger-1)' : 'var(--warning-1)'
              
              return (
                <div
                  key={index}
                  onClick={() => {
                    if (alert.entityType === 'purchase_order') {
                      navigate(`/app/orders?po=${alert.entityId}`)
                    } else if (alert.entityType === 'project') {
                      navigate(`/app/projects/${alert.entityId}`)
                    }
                    setShowTooltip(false)
                  }}
                  style={{
                    padding: '8px',
                    borderRadius: '6px',
                    backgroundColor: darkMode ? '#0a0a0f' : 'var(--surface-bg-2)',
                    border: `1px solid ${severityColor}40`,
                    cursor: 'pointer',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = darkMode ? '#1f1f2e' : 'var(--surface-bg-2)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = darkMode ? '#0a0a0f' : 'var(--surface-bg-2)'
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
                      {alert.type === 'manufacturer_pack' ? t('alertsBadge.types.pack') :
                       alert.type === 'shipment' ? t('alertsBadge.types.shipment') :
                       t('alertsBadge.types.research')}
                    </span>
                  </div>
                  <div style={{
                    fontSize: '12px',
                    color: darkMode ? 'var(--border-1)' : 'var(--text-1)',
                    marginBottom: '2px'
                  }}>
                    {alert.poNumber || alert.projectName}
                    {alert.sku && ` (${alert.sku})`}
                  </div>
                  <div style={{
                    fontSize: '11px',
                    color: darkMode ? 'var(--muted-1)' : 'var(--text-2)'
                  }}>
                    {alert.message}
                  </div>
                </div>
              )
            })}
            {alerts.length > 5 && (
              <div style={{
                fontSize: '11px',
                color: darkMode ? 'var(--muted-1)' : 'var(--text-2)',
                textAlign: 'center',
                paddingTop: '4px',
                borderTop: `1px solid ${darkMode ? 'var(--text-1)' : 'var(--border-1)'}`
              }}>
                {t('alertsBadge.more', { count: alerts.length - 5 })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}




