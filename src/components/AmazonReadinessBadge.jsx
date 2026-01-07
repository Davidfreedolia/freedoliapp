import { useState, useEffect } from 'react'
import { CheckCircle2, AlertCircle, XCircle, Plus, Barcode } from 'lucide-react'
import { getProductIdentifiers, getPurchaseOrders } from '../lib/supabase'
import { getButtonStyles, useButtonState } from '../utils/buttonStyles'

export default function AmazonReadinessBadge({ projectId, projectSku, darkMode, onAssignGtin, onCreatePO }) {
  const [readiness, setReadiness] = useState(null) // null = loading, { status, message, action }
  const [loading, setLoading] = useState(true)
  const assignButtonState = useButtonState()
  const createPOButtonState = useButtonState()

  useEffect(() => {
    loadReadiness()
  }, [projectId, projectSku])

  const loadReadiness = async () => {
    setLoading(true)
    try {
      // Obtener GTIN
      const identifiers = await getProductIdentifiers(projectId)
      const hasGtin = !!(identifiers?.gtin_code)
      const hasSku = !!projectSku

      // Obtener POs del proyecto
      const pos = await getPurchaseOrders(projectId)
      const hasPO = pos && pos.length > 0

      // Calcular estado según requisitos:
      // Ready: GTIN + SKU + PO
      // Parcial: GTIN + NO PO
      // No preparat: NO GTIN
      let status, message, action
      
      if (!hasGtin) {
        status = 'not_ready'
        message = "Falta assignar un GTIN. Amazon requereix un identificador per llistar el producte."
        action = { type: 'assign_gtin', label: 'Assignar GTIN' }
      } else if (!hasPO) {
        status = 'partial'
        message = "El producte ja té GTIN però falta una comanda (PO)."
        action = { type: 'create_po', label: 'Crear PO' }
      } else if (hasGtin && hasSku && hasPO) {
        status = 'ready'
        message = "Aquest producte compleix els requisits bàsics per Amazon."
        action = null
      } else {
        // Fallback: si tiene GTIN y PO pero no SKU, aún se considera ready
        // (SKU es opcional según la lógica, pero preferible tenerlo)
        status = 'ready'
        message = "Aquest producte compleix els requisits bàsics per Amazon."
        action = null
      }

      setReadiness({ status, message, action })
    } catch (err) {
      console.error('Error carregant Amazon Readiness:', err)
      setReadiness({ status: 'not_ready', message: 'Error carregant dades.', action: null })
    } finally {
      setLoading(false)
    }
  }

  if (loading || !readiness) {
    return (
      <div style={{
        padding: '16px',
        backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb',
        borderRadius: '12px',
        border: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`,
        marginBottom: '24px'
      }}>
        <div style={{ color: darkMode ? '#9ca3af' : '#6b7280', fontSize: '14px' }}>Carregant...</div>
      </div>
    )
  }

  const { status, message, action } = readiness

  // Estilos según estado
  const statusConfig = {
    ready: {
      color: '#22c55e',
      bgColor: darkMode ? '#1a3a2a' : '#f0fdf4',
      borderColor: '#22c55e',
      icon: CheckCircle2,
      label: 'Amazon Ready'
    },
    partial: {
      color: '#f59e0b',
      bgColor: darkMode ? '#3a2e1a' : '#fffbeb',
      borderColor: '#f59e0b',
      icon: AlertCircle,
      label: 'Parcialment preparat'
    },
    not_ready: {
      color: '#ef4444',
      bgColor: darkMode ? '#3a1a1a' : '#fef2f2',
      borderColor: '#ef4444',
      icon: XCircle,
      label: 'No preparat per Amazon'
    }
  }

  const config = statusConfig[status]
  const Icon = config.icon

  return (
    <div style={{
      padding: '20px',
      backgroundColor: config.bgColor,
      borderRadius: '12px',
      border: `2px solid ${config.borderColor}`,
      marginBottom: '24px'
    }}>
      {/* Badge */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        marginBottom: '12px'
      }}>
        <Icon size={24} color={config.color} />
        <span style={{
          fontSize: '16px',
          fontWeight: '600',
          color: config.color
        }}>
          {config.label}
        </span>
      </div>

      {/* Message */}
      <p style={{
        margin: '0 0 16px 0',
        fontSize: '14px',
        color: darkMode ? '#e5e7eb' : '#374151',
        lineHeight: '1.5'
      }}>
        {message}
      </p>

      {/* Action Button */}
      {action && (
        <button
          onClick={() => {
            if (action.type === 'assign_gtin' && onAssignGtin) {
              onAssignGtin()
            } else if (action.type === 'create_po' && onCreatePO) {
              onCreatePO()
            }
          }}
          {...(action.type === 'assign_gtin' ? assignButtonState : createPOButtonState)}
          style={{
            ...getButtonStyles({
              variant: action.type === 'assign_gtin' ? 'primary' : 'primary',
              darkMode,
              disabled: false,
              isHovered: (action.type === 'assign_gtin' ? assignButtonState : createPOButtonState).isHovered,
              isActive: (action.type === 'assign_gtin' ? assignButtonState : createPOButtonState).isActive
            }),
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          {action.type === 'assign_gtin' ? <Barcode size={16} /> : <Plus size={16} />}
          {action.label}
        </button>
      )}
    </div>
  )
}

