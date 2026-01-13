import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { X, Save, Check, ChevronUp, ChevronDown } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { getDashboardPreferences, updateDashboardPreferences } from '../lib/supabase'
import { useBreakpoint } from '../hooks/useBreakpoint'
import { getModalStyles } from '../utils/responsiveStyles'
import { getButtonStyles, useButtonState } from '../utils/buttonStyles'

const AVAILABLE_WIDGETS = [
  { id: 'logistics_tracking', name: 'Tracking Logístic', description: 'Mostra l\'estat de les comandes per projecte' },
  { id: 'finance_chart', name: 'Gràfica de Finances', description: 'Analítica de ingressos i despeses' },
  { id: 'orders_in_progress', name: 'Comandes en Curs', description: 'Llista de comandes actives' },
  { id: 'pos_not_ready', name: 'POs No Preparades', description: 'Comandes que necessiten atenció' },
  { id: 'waiting_manufacturer', name: 'Esperant Fabricant', description: 'POs esperant fabricant' },
  { id: 'activity_feed', name: 'Activitat Recent', description: 'Últims esdeveniments del sistema' }
]

const DAILY_OPS_WIDGETS = [
  { id: 'waiting_manufacturer_ops', name: 'Waiting Manufacturer', description: 'POs amb pack generat però no enviat' },
  { id: 'pos_not_amazon_ready', name: 'POs Not Amazon Ready', description: 'POs que no estan llestes per Amazon' },
  { id: 'shipments_in_transit', name: 'Shipments In Transit', description: 'Enviaments en trànsit' },
  { id: 'research_no_decision', name: 'Research No Decision', description: 'Projectes en recerca sense decisió' },
  { id: 'stale_tracking', name: 'Stale Tracking', description: 'POs amb tracking desactualitzat' }
]

export default function CustomizeDashboardModal({ isOpen, onClose, onSave }) {
  const { darkMode } = useApp()
  const { isMobile } = useBreakpoint()
  const { t } = useTranslation()
  const modalStyles = getModalStyles(isMobile, darkMode)
  const cancelButtonState = useButtonState()
  const saveButtonState = useButtonState()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [widgets, setWidgets] = useState({
    logistics_tracking: true,
    finance_chart: true,
    orders_in_progress: true,
    pos_not_ready: true,
    waiting_manufacturer: true,
    activity_feed: false
  })
  const [enabledWidgets, setEnabledWidgets] = useState({
    waiting_manufacturer_ops: true,
    pos_not_amazon_ready: true,
    shipments_in_transit: true,
    research_no_decision: true,
    stale_tracking: true
  })
  const [widgetOrder, setWidgetOrder] = useState([
    'waiting_manufacturer_ops',
    'pos_not_amazon_ready',
    'shipments_in_transit',
    'research_no_decision',
    'stale_tracking'
  ])
  const [staleDays, setStaleDays] = useState(7)
  const [alertThresholds, setAlertThresholds] = useState({
    manufacturerPackDays: 3,
    researchDays: 7
  })

  const loadPreferences = async () => {
    setLoading(true)
    try {
      const prefs = await getDashboardPreferences()
      if (prefs?.widgets) {
        setWidgets({
          logistics_tracking: prefs.widgets.logistics_tracking !== false,
          finance_chart: prefs.widgets.finance_chart !== false,
          orders_in_progress: prefs.widgets.orders_in_progress !== false,
          pos_not_ready: prefs.widgets.pos_not_ready !== false,
          waiting_manufacturer: prefs.widgets.waiting_manufacturer !== false,
          activity_feed: prefs.widgets.activity_feed === true
        })
      }
      if (prefs?.enabledWidgets) {
        setEnabledWidgets({
          waiting_manufacturer_ops: prefs.enabledWidgets.waiting_manufacturer_ops !== false,
          pos_not_amazon_ready: prefs.enabledWidgets.pos_not_amazon_ready !== false,
          shipments_in_transit: prefs.enabledWidgets.shipments_in_transit !== false,
          research_no_decision: prefs.enabledWidgets.research_no_decision !== false,
          stale_tracking: prefs.enabledWidgets.stale_tracking !== false
        })
      }
      if (prefs?.widgetOrder) {
        setWidgetOrder(prefs.widgetOrder)
      }
      if (prefs?.staleDays) {
        setStaleDays(prefs.staleDays)
      }
      if (prefs?.alert_thresholds || prefs?.alertThresholds) {
        setAlertThresholds(prefs.alert_thresholds || prefs.alertThresholds)
      }
    } catch (err) {
      console.error('Error carregant preferències:', err)
    }
    setLoading(false)
  }

  useEffect(() => {
    if (isOpen) {
      loadPreferences()
    }
  }, [isOpen])

  const handleToggle = (widgetId) => {
    setWidgets(prev => ({
      ...prev,
      [widgetId]: !prev[widgetId]
    }))
  }

  const handleToggleDailyOps = (widgetId) => {
    setEnabledWidgets(prev => ({
      ...prev,
      [widgetId]: !prev[widgetId]
    }))
  }

  const handleMoveUp = (index) => {
    if (index === 0) return
    const newOrder = [...widgetOrder]
    ;[newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]]
    setWidgetOrder(newOrder)
  }

  const handleMoveDown = (index) => {
    if (index === widgetOrder.length - 1) return
    const newOrder = [...widgetOrder]
    ;[newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]]
    setWidgetOrder(newOrder)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateDashboardPreferences({ 
        widgets,
        enabledWidgets,
        widgetOrder,
        staleDays,
        alertThresholds
      })
      if (onSave) onSave({ widgets, enabledWidgets, widgetOrder, staleDays, alertThresholds })
      onClose()
    } catch (err) {
      console.error('Error guardant preferències:', err)
      alert('Error guardant les preferències')
    }
    setSaving(false)
  }

  if (!isOpen) return null

  return (
    <div style={{...styles.overlay, ...modalStyles.overlay}} onClick={onClose}>
      <div 
        style={{
          ...styles.modal,
          ...modalStyles.modal
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={styles.header}>
          <h2 style={{
            ...styles.title,
            color: darkMode ? '#ffffff' : '#111827'
          }}>
            Personalitzar Dashboard
          </h2>
          <button 
            onClick={onClose}
            style={{
              ...styles.closeButton,
              color: darkMode ? '#9ca3af' : '#6b7280'
            }}
          >
            <X size={20} />
          </button>
        </div>

        <div style={styles.content}>
          <p style={{
            ...styles.description,
            color: darkMode ? '#9ca3af' : '#6b7280'
          }}>
            Activa o desactiva els widgets que vols veure al Dashboard
          </p>

          {loading ? (
            <div style={styles.loading}>Carregant...</div>
          ) : (
            <>
              <div style={styles.section}>
                <h3 style={{
                  ...styles.sectionTitle,
                  color: darkMode ? '#ffffff' : '#111827'
                }}>
                  Widgets Principals
                </h3>
                <div style={styles.widgetsList}>
                  {AVAILABLE_WIDGETS.map(widget => (
                    <div
                      key={widget.id}
                      style={{
                        ...styles.widgetItem,
                        backgroundColor: darkMode ? '#15151f' : '#f9fafb',
                        borderColor: darkMode ? '#374151' : '#e5e7eb'
                      }}
                    >
                      <div style={styles.widgetInfo}>
                        <div style={{
                          ...styles.widgetName,
                          color: darkMode ? '#ffffff' : '#111827'
                        }}>
                          {widget.name}
                        </div>
                        <div style={{
                          ...styles.widgetDescription,
                          color: darkMode ? '#6b7280' : '#9ca3af'
                        }}>
                          {widget.description}
                        </div>
                      </div>
                      <button
                        onClick={() => handleToggle(widget.id)}
                        style={{
                          ...styles.toggleButton,
                          backgroundColor: widgets[widget.id] ? '#22c55e' : (darkMode ? '#374151' : '#e5e7eb'),
                          color: widgets[widget.id] ? '#ffffff' : (darkMode ? '#9ca3af' : '#6b7280')
                        }}
                      >
                        {widgets[widget.id] && <Check size={16} />}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div style={styles.section}>
                <h3 style={{
                  ...styles.sectionTitle,
                  color: darkMode ? '#ffffff' : '#111827'
                }}>
                  Daily Ops Widgets
                </h3>
                <div style={styles.widgetsList}>
                  {widgetOrder.map((widgetId, index) => {
                    const widget = DAILY_OPS_WIDGETS.find(w => w.id === widgetId)
                    if (!widget) return null
                    
                    return (
                      <div
                        key={widget.id}
                        style={{
                          ...styles.widgetItem,
                          backgroundColor: darkMode ? '#15151f' : '#f9fafb',
                          borderColor: darkMode ? '#374151' : '#e5e7eb'
                        }}
                      >
                        <div style={styles.widgetInfo}>
                          <div style={{
                            ...styles.widgetName,
                            color: darkMode ? '#ffffff' : '#111827'
                          }}>
                            {widget.name}
                          </div>
                          <div style={{
                            ...styles.widgetDescription,
                            color: darkMode ? '#6b7280' : '#9ca3af'
                          }}>
                            {widget.description}
                          </div>
                        </div>
                        <div style={styles.widgetActions}>
                          <div style={styles.orderButtons}>
                            <button
                              onClick={() => handleMoveUp(index)}
                              disabled={index === 0}
                              style={{
                                ...styles.orderButton,
                                opacity: index === 0 ? 0.3 : 1,
                                cursor: index === 0 ? 'not-allowed' : 'pointer'
                              }}
                            >
                              <ChevronUp size={16} />
                            </button>
                            <button
                              onClick={() => handleMoveDown(index)}
                              disabled={index === widgetOrder.length - 1}
                              style={{
                                ...styles.orderButton,
                                opacity: index === widgetOrder.length - 1 ? 0.3 : 1,
                                cursor: index === widgetOrder.length - 1 ? 'not-allowed' : 'pointer'
                              }}
                            >
                              <ChevronDown size={16} />
                            </button>
                          </div>
                          <button
                            onClick={() => handleToggleDailyOps(widget.id)}
                            style={{
                              ...styles.toggleButton,
                              backgroundColor: enabledWidgets[widget.id] ? '#22c55e' : (darkMode ? '#374151' : '#e5e7eb'),
                              color: enabledWidgets[widget.id] ? '#ffffff' : (darkMode ? '#9ca3af' : '#6b7280')
                            }}
                          >
                            {enabledWidgets[widget.id] && <Check size={16} />}
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div style={styles.section}>
                <h3 style={{
                  ...styles.sectionTitle,
                  color: darkMode ? '#ffffff' : '#111827'
                }}>
                  Configuració
                </h3>
                <div style={{
                  ...styles.configItem,
                  backgroundColor: darkMode ? '#15151f' : '#f9fafb',
                  borderColor: darkMode ? '#374151' : '#e5e7eb'
                }}>
                  <label style={{
                    ...styles.configLabel,
                    color: darkMode ? '#ffffff' : '#111827'
                  }}>
                    Dies per considerar tracking stale:
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={staleDays}
                    onChange={(e) => setStaleDays(parseInt(e.target.value) || 7)}
                    style={{
                      ...styles.configInput,
                      backgroundColor: darkMode ? '#1f1f2e' : '#ffffff',
                      color: darkMode ? '#ffffff' : '#111827',
                      borderColor: darkMode ? '#374151' : '#d1d5db'
                    }}
                  />
                </div>
              </div>
            </>
          )}
        </div>

        <div style={{
          ...styles.footer,
          borderTopColor: darkMode ? '#374151' : '#e5e7eb'
        }}>
          <button
            onClick={onClose}
            style={{
              ...styles.cancelButton,
              backgroundColor: darkMode ? '#1f1f2e' : '#f3f4f6',
              color: darkMode ? '#9ca3af' : '#6b7280'
            }}
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              ...styles.saveButton,
              backgroundColor: '#4f46e5',
              opacity: saving ? 0.6 : 1
            }}
          >
            {saving ? t('common.loading') : t('common.save')}
          </button>
        </div>
      </div>
    </div>
  )
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000
  },
  modal: {
    width: '90%',
    maxWidth: '600px',
    borderRadius: 'var(--radius-ui)', // Unified radius
    display: 'flex',
    flexDirection: 'column',
    maxHeight: '80vh',
    border: 'none', // No border - use shadow
    backgroundColor: 'var(--surface-bg)',
    boxShadow: 'var(--shadow-lg)' // Stronger shadow for modals
  },
  header: {
    padding: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottom: 'none', // No border - use subtle background difference
    backgroundColor: 'var(--surface-bg-2)'
  },
  title: {
    margin: 0,
    fontSize: '20px',
    fontWeight: '600'
  },
  closeButton: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  content: {
    padding: '24px',
    overflowY: 'auto',
    flex: 1
  },
  description: {
    margin: '0 0 24px',
    fontSize: '14px'
  },
  loading: {
    padding: '48px',
    textAlign: 'center',
    color: '#6b7280'
  },
  widgetsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  widgetItem: {
    padding: '16px',
    borderRadius: 'var(--radius-ui)', // Unified radius
    border: 'none', // No border - use shadow
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '16px',
    backgroundColor: 'var(--surface-bg)',
    boxShadow: 'var(--shadow-soft)'
  },
  widgetInfo: {
    flex: 1
  },
  widgetName: {
    fontSize: '15px',
    fontWeight: '600',
    marginBottom: '4px'
  },
  widgetDescription: {
    fontSize: '13px'
  },
  toggleButton: {
    width: '44px',
    height: '44px',
    borderRadius: '12px',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
    flexShrink: 0
  },
  footer: {
    padding: '20px 24px',
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    borderTop: '1px solid'
  },
  cancelButton: {
    padding: '10px 20px',
    borderRadius: '10px',
    border: 'none',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer'
  },
  saveButton: {
    padding: '10px 20px',
    borderRadius: '10px',
    border: 'none',
    fontSize: '14px',
    fontWeight: '500',
    color: '#ffffff',
    cursor: 'pointer'
  },
  section: {
    marginBottom: '32px'
  },
  sectionTitle: {
    margin: '0 0 16px',
    fontSize: '16px',
    fontWeight: '600'
  },
  widgetActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  orderButtons: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px'
  },
  orderButton: {
    width: '32px',
    height: '20px',
    padding: 0,
    border: 'none',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  configItem: {
    padding: '16px',
    borderRadius: '12px',
    border: '1px solid',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '16px'
  },
  configLabel: {
    fontSize: '14px',
    fontWeight: '500'
  },
  configInput: {
    width: '80px',
    padding: '8px 12px',
    borderRadius: '8px',
    border: '1px solid',
    fontSize: '14px',
    outline: 'none'
  }
}






