import { useState, useEffect } from 'react'
import { X, Save, Check } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { getDashboardPreferences, updateDashboardPreferences } from '../lib/supabase'

const AVAILABLE_WIDGETS = [
  { id: 'logistics_tracking', name: 'Tracking Logístic', description: 'Mostra l\'estat de les comandes per projecte' },
  { id: 'finance_chart', name: 'Gràfica de Finances', description: 'Analítica de ingressos i despeses' },
  { id: 'orders_in_progress', name: 'Comandes en Curs', description: 'Llista de comandes actives' },
  { id: 'activity_feed', name: 'Activitat Recent', description: 'Últims esdeveniments del sistema' }
]

export default function CustomizeDashboardModal({ isOpen, onClose, onSave }) {
  const { darkMode } = useApp()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [widgets, setWidgets] = useState({
    logistics_tracking: true,
    finance_chart: true,
    orders_in_progress: true,
    activity_feed: false
  })

  useEffect(() => {
    if (isOpen) {
      loadPreferences()
    }
  }, [isOpen])

  const loadPreferences = async () => {
    setLoading(true)
    try {
      const prefs = await getDashboardPreferences()
      if (prefs?.widgets) {
        setWidgets({
          logistics_tracking: prefs.widgets.logistics_tracking !== false,
          finance_chart: prefs.widgets.finance_chart !== false,
          orders_in_progress: prefs.widgets.orders_in_progress !== false,
          activity_feed: prefs.widgets.activity_feed === true
        })
      }
    } catch (err) {
      console.error('Error carregant preferències:', err)
    }
    setLoading(false)
  }

  const handleToggle = (widgetId) => {
    setWidgets(prev => ({
      ...prev,
      [widgetId]: !prev[widgetId]
    }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateDashboardPreferences({ widgets })
      if (onSave) onSave(widgets)
      onClose()
    } catch (err) {
      console.error('Error guardant preferències:', err)
      alert('Error guardant les preferències')
    }
    setSaving(false)
  }

  if (!isOpen) return null

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div 
        style={{
          ...styles.modal,
          backgroundColor: darkMode ? '#1f1f2e' : '#ffffff'
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
            Cancel·lar
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
            {saving ? 'Guardant...' : 'Guardar'}
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
    borderRadius: '16px',
    display: 'flex',
    flexDirection: 'column',
    maxHeight: '80vh',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
  },
  header: {
    padding: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottom: '1px solid var(--border-color)'
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
    borderRadius: '12px',
    border: '1px solid',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '16px'
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
  }
}






