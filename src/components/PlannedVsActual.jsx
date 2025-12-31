import React from 'react'
import { TrendingUp, TrendingDown, Minus, AlertCircle } from 'lucide-react'
import { 
  getQuoteUnitPrice, 
  getPoUnitPrice, 
  getPoQuantity,
  comparePrice, 
  compareLeadTime,
  calculateActualLeadTime
} from '../lib/plannedVsActual'

export default function PlannedVsActual({ quote, po, shipment, darkMode }) {
  if (!quote || !po) return null
  
  const poQuantity = getPoQuantity(po)
  const plannedUnitPrice = poQuantity ? getQuoteUnitPrice(quote, poQuantity) : null
  const actualUnitPrice = getPoUnitPrice(po)
  const priceComparison = plannedUnitPrice && actualUnitPrice 
    ? comparePrice(plannedUnitPrice, actualUnitPrice) 
    : null
  
  const promisedLeadTime = quote.lead_time_days
  const actualLeadTime = calculateActualLeadTime(po, shipment)
  const leadTimeComparison = promisedLeadTime && actualLeadTime !== null
    ? compareLeadTime(promisedLeadTime, actualLeadTime)
    : null
  
  // Only show if we have at least one comparison
  if (!priceComparison && !leadTimeComparison) return null
  
  const getStatusBadge = (status) => {
    const badges = {
      better: {
        icon: TrendingDown,
        color: '#10b981',
        label: 'Better',
        bg: '#10b98120'
      },
      worse: {
        icon: TrendingUp,
        color: '#ef4444',
        label: 'Worse',
        bg: '#ef444420'
      },
      on_target: {
        icon: Minus,
        color: '#f59e0b',
        label: 'On Target',
        bg: '#f59e0b20'
      }
    }
    
    return badges[status] || badges.on_target
  }
  
  return (
    <div style={{
      padding: '16px',
      borderRadius: '8px',
      backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb',
      border: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`,
      marginTop: '16px'
    }}>
      <h4 style={{
        margin: '0 0 12px 0',
        fontSize: '14px',
        fontWeight: '600',
        color: darkMode ? '#ffffff' : '#111827'
      }}>
        Planned vs Actual
      </h4>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* Price Comparison */}
        {priceComparison && (
          <div style={{
            padding: '12px',
            borderRadius: '6px',
            backgroundColor: darkMode ? '#0a0a0f' : '#ffffff',
            border: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '8px'
            }}>
              <span style={{
                fontSize: '13px',
                fontWeight: '500',
                color: darkMode ? '#e5e7eb' : '#374151'
              }}>
                Unit Price
              </span>
              {(() => {
                const badge = getStatusBadge(priceComparison.status)
                const Icon = badge.icon
                return (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    backgroundColor: badge.bg,
                    color: badge.color,
                    fontSize: '11px',
                    fontWeight: '600'
                  }}>
                    <Icon size={12} />
                    {badge.label}
                  </div>
                )
              })()}
            </div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '12px',
              color: darkMode ? '#9ca3af' : '#6b7280',
              marginBottom: '4px'
            }}>
              <span>Planned:</span>
              <span style={{ fontWeight: '500', color: darkMode ? '#ffffff' : '#111827' }}>
                {quote.currency} {priceComparison.planned.toFixed(4)}
              </span>
            </div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '12px',
              color: darkMode ? '#9ca3af' : '#6b7280',
              marginBottom: '4px'
            }}>
              <span>Actual:</span>
              <span style={{ fontWeight: '500', color: darkMode ? '#ffffff' : '#111827' }}>
                {po.currency || quote.currency} {priceComparison.actual.toFixed(4)}
              </span>
            </div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '12px',
              color: priceComparison.deltaPercent > 0 ? '#ef4444' : '#10b981',
              fontWeight: '600'
            }}>
              <span>Delta:</span>
              <span>
                {priceComparison.deltaPercent > 0 ? '+' : ''}
                {priceComparison.deltaPercent.toFixed(2)}%
              </span>
            </div>
          </div>
        )}
        
        {/* Lead Time Comparison */}
        {leadTimeComparison && (
          <div style={{
            padding: '12px',
            borderRadius: '6px',
            backgroundColor: darkMode ? '#0a0a0f' : '#ffffff',
            border: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '8px'
            }}>
              <span style={{
                fontSize: '13px',
                fontWeight: '500',
                color: darkMode ? '#e5e7eb' : '#374151'
              }}>
                Lead Time
              </span>
              {(() => {
                const badge = getStatusBadge(leadTimeComparison.status)
                const Icon = badge.icon
                return (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    backgroundColor: badge.bg,
                    color: badge.color,
                    fontSize: '11px',
                    fontWeight: '600'
                  }}>
                    <Icon size={12} />
                    {badge.label}
                  </div>
                )
              })()}
            </div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '12px',
              color: darkMode ? '#9ca3af' : '#6b7280',
              marginBottom: '4px'
            }}>
              <span>Promised:</span>
              <span style={{ fontWeight: '500', color: darkMode ? '#ffffff' : '#111827' }}>
                {leadTimeComparison.promised} days
              </span>
            </div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '12px',
              color: darkMode ? '#9ca3af' : '#6b7280',
              marginBottom: '4px'
            }}>
              <span>Actual:</span>
              <span style={{ fontWeight: '500', color: darkMode ? '#ffffff' : '#111827' }}>
                {leadTimeComparison.actual} days
              </span>
            </div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '12px',
              color: leadTimeComparison.delta > 0 ? '#ef4444' : '#10b981',
              fontWeight: '600'
            }}>
              <span>Delta:</span>
              <span>
                {leadTimeComparison.delta > 0 ? '+' : ''}
                {leadTimeComparison.delta} days
                {leadTimeComparison.delta > 0 ? ' (delay)' : leadTimeComparison.delta < 0 ? ' (ahead)' : ''}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

