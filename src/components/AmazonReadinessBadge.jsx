import { useState, useEffect } from 'react'
import { CheckCircle2, AlertCircle, XCircle, Plus, Barcode, Shield } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { getProductIdentifiers, getPurchaseOrders } from '../lib/supabase'
import { getButtonStyles, useButtonState } from '../utils/buttonStyles'
import useT from '../hooks/useT'

export default function AmazonReadinessBadge({
  projectId,
  darkMode,
  onAssignGtin,
  onCreatePO,
  onMarkExempt,
  phaseId
}) {
  const t = useT()
  const { activeOrgId } = useApp()
  const [readiness, setReadiness] = useState(null) // null = loading, { status, message, action }
  const [loading, setLoading] = useState(true)
  const assignButtonState = useButtonState()
  const createPOButtonState = useButtonState()
  const exemptButtonState = useButtonState()

  useEffect(() => {
    loadReadiness()
  }, [projectId, phaseId, t, activeOrgId])

  const loadReadiness = async () => {
    setLoading(true)
    try {
      if (phaseId <= 2) {
        setReadiness({
          status: 'not_ready',
          message: t('amazonReadiness.messages.discovery'),
          action: { type: 'discovery_asin', label: t('amazonReadiness.actions.completeCompetitorAsin') }
        })
        return
      }

      // Obtener GTIN y estado de exempción
      const identifiers = await getProductIdentifiers(projectId)
      const hasGtin = !!(identifiers?.gtin_code)
      const hasGtinExempt = identifiers?.gtin_type === 'GTIN_EXEMPT'
      const hasGtinOrExempt = hasGtin || hasGtinExempt
      // Usar SKU Amazon de identifiers (no project.sku que es interno)
      const hasAmazonSku = !!(identifiers?.sku)

      // Obtener POs del proyecto
      const pos = await getPurchaseOrders(projectId, activeOrgId ?? undefined)
      const hasPO = pos && pos.length > 0

      // Calcular estado según requisitos:
      // Ready: (GTIN OR GTIN Exempt) AND SKU Amazon AND PO
      // Parcial: (GTIN OR GTIN Exempt) AND SKU Amazon AND !PO
      // Not ready: !(GTIN OR GTIN Exempt) OR !SKU Amazon
      let status, message, action
      
      if (!hasGtinOrExempt) {
        status = 'not_ready'
        message = t('amazonReadiness.messages.noGtin')
        action = { 
          type: 'no_gtin', 
          label: t('amazonReadiness.actions.assignGtin'),
          secondaryLabel: t('amazonReadiness.actions.markExempt'),
          hasSecondary: true
        }
      } else if (!hasAmazonSku) {
        status = 'not_ready'
        message = t('amazonReadiness.messages.noAmazonSku')
        action = { type: 'assign_gtin', label: t('amazonReadiness.actions.assignAmazonSku') }
      } else if (!hasPO) {
        status = 'partial'
        message = hasGtinExempt 
          ? t('amazonReadiness.messages.partialNoPoExempt')
          : t('amazonReadiness.messages.partialNoPo')
        action = { type: 'create_po', label: t('amazonReadiness.actions.createPo') }
      } else if (hasGtinOrExempt && hasAmazonSku && hasPO) {
        status = 'ready'
        message = t('amazonReadiness.messages.ready')
        action = null
      } else {
        // Fallback: no debería llegar aquí, pero por seguridad
        status = 'not_ready'
        message = t('amazonReadiness.messages.fallback')
        action = { type: 'assign_gtin', label: t('amazonReadiness.actions.reviewIdentifiers') }
      }

      setReadiness({ status, message, action })
    } catch (err) {
      console.error('Error carregant Amazon Readiness:', err)
      setReadiness({ status: 'not_ready', message: t('amazonReadiness.messages.loadError'), action: null })
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
        <div style={{ color: darkMode ? '#9ca3af' : '#6b7280', fontSize: '14px' }}>{t('amazonReadiness.loading')}</div>
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
      label: t('amazonReadiness.status.ready')
    },
    partial: {
      color: '#f59e0b',
      bgColor: darkMode ? '#3a2e1a' : '#fffbeb',
      borderColor: '#f59e0b',
      icon: AlertCircle,
      label: t('amazonReadiness.status.partial')
    },
    not_ready: {
      color: '#ef4444',
      bgColor: darkMode ? '#3a1a1a' : '#fef2f2',
      borderColor: '#ef4444',
      icon: XCircle,
      label: t('amazonReadiness.status.notReady')
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

      {/* Action Buttons */}
      {action && (
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {action.type === 'no_gtin' && action.hasSecondary ? (
            <>
              <button
                onClick={() => {
                  if (onAssignGtin) onAssignGtin()
                }}
                {...assignButtonState}
                style={{
                  ...getButtonStyles({
                    variant: 'primary',
                    darkMode,
                    disabled: false,
                    isHovered: assignButtonState.isHovered,
                    isActive: assignButtonState.isActive
                  }),
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <Barcode size={16} />
                {action.label}
              </button>
              <button
                onClick={() => {
                  if (onMarkExempt) onMarkExempt()
                }}
                {...exemptButtonState}
                style={{
                  ...getButtonStyles({
                    variant: 'secondary',
                    darkMode,
                    disabled: false,
                    isHovered: exemptButtonState.isHovered,
                    isActive: exemptButtonState.isActive
                  }),
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <Shield size={16} />
                {action.secondaryLabel}
              </button>
            </>
          ) : (
            <button
              onClick={() => {
                if ((action.type === 'assign_gtin' || action.type === 'discovery_asin') && onAssignGtin) {
                  onAssignGtin()
                } else if (action.type === 'create_po' && onCreatePO) {
                  onCreatePO()
                }
              }}
              {...((action.type === 'assign_gtin' || action.type === 'discovery_asin') ? assignButtonState : createPOButtonState)}
              style={{
                ...getButtonStyles({
                  variant: 'primary',
                  darkMode,
                  disabled: false,
                  isHovered: ((action.type === 'assign_gtin' || action.type === 'discovery_asin') ? assignButtonState : createPOButtonState).isHovered,
                  isActive: ((action.type === 'assign_gtin' || action.type === 'discovery_asin') ? assignButtonState : createPOButtonState).isActive
                }),
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              {(action.type === 'assign_gtin' || action.type === 'discovery_asin') ? <Barcode size={16} /> : <Plus size={16} />}
              {action.label}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

