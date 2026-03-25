import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { TrendingUp, TrendingDown, Clock, DollarSign } from 'lucide-react'
import { getSupplierMetrics, generateSupplierBadges } from '../lib/supplierMemory'
import { supabase } from '../lib/supabase'
import { useApp } from '../context/AppContext'

export default function SupplierMemory({ supplierId, darkMode }) {
  const { t } = useTranslation()
  const { activeOrgId } = useApp()
  const [metrics, setMetrics] = useState(null)
  const [badges, setBadges] = useState([])
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    if (supplierId) {
      loadMetrics()
    }
  }, [supplierId, activeOrgId])
  
  const loadMetrics = async () => {
    setLoading(true)
    try {
      const supplierMetrics = await getSupplierMetrics(supplierId, supabase, { orgId: activeOrgId ?? null })
      setMetrics(supplierMetrics)
      const generatedBadges = generateSupplierBadges(supplierMetrics)
      setBadges(generatedBadges)
    } catch (err) {
      console.error('Error loading supplier metrics:', err)
    }
    setLoading(false)
  }
  
  if (loading) {
    return (
      <div style={{
        padding: '16px',
        borderRadius: '8px',
        backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb',
        border: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`,
        marginTop: '16px'
      }}>
        <div style={{ color: darkMode ? '#9ca3af' : '#6b7280', fontSize: '13px' }}>{t('supplierMemory.loading')}</div>
      </div>
    )
  }
  
  if (!metrics || (metrics.quotesSent === 0 && metrics.totalPos === 0)) {
    return null // Don't show if no data
  }
  
  const minSamples = 3
  const hasEnoughData = metrics.priceDeviationsCount >= minSamples || metrics.leadTimeDeviationsCount >= minSamples
  
  if (!hasEnoughData && metrics.quotesSent === 0) {
    return null // Don't show if not enough samples
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
        {t('supplierMemory.title')}
      </h4>
      
      {/* Badges */}
      {badges.length > 0 && (
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px',
          marginBottom: '16px'
        }}>
          {badges.map(badge => (
            <div
              key={badge.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '6px',
                backgroundColor: `${badge.color}20`,
                color: badge.color,
                fontSize: '12px',
                fontWeight: '600',
                border: `1px solid ${badge.color}40`
              }}
            >
              <span>{badge.icon}</span>
              {t(`supplierMemory.badges.${badge.id}`)}
            </div>
          ))}
        </div>
      )}
      
      {/* Metrics Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: '12px'
      }}>
        {/* Quotes Sent */}
        <div style={{
          padding: '12px',
          borderRadius: '6px',
          backgroundColor: darkMode ? '#0a0a0f' : '#ffffff',
          border: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`
        }}>
          <div style={{
            fontSize: '11px',
            color: darkMode ? '#9ca3af' : '#6b7280',
            marginBottom: '4px'
          }}>
            {t('supplierMemory.metrics.quotesSent')}
          </div>
          <div style={{
            fontSize: '20px',
            fontWeight: '600',
            color: darkMode ? '#ffffff' : '#111827'
          }}>
            {metrics.quotesSent}
          </div>
        </div>
        
        {/* Quotes Selected */}
        <div style={{
          padding: '12px',
          borderRadius: '6px',
          backgroundColor: darkMode ? '#0a0a0f' : '#ffffff',
          border: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`
        }}>
          <div style={{
            fontSize: '11px',
            color: darkMode ? '#9ca3af' : '#6b7280',
            marginBottom: '4px'
          }}>
            {t('supplierMemory.metrics.quotesSelected')}
          </div>
          <div style={{
            fontSize: '20px',
            fontWeight: '600',
            color: darkMode ? '#ffffff' : '#111827'
          }}>
            {metrics.quotesSelected}
          </div>
          {metrics.quotesSent > 0 && (
            <div style={{
              fontSize: '10px',
              color: darkMode ? '#9ca3af' : '#6b7280',
              marginTop: '2px'
            }}>
              {t('supplierMemory.metrics.winRate', { rate: Math.round((metrics.quotesSelected / metrics.quotesSent) * 100) })}
            </div>
          )}
        </div>
        
        {/* Avg Price Deviation */}
        {metrics.avgPriceDeviation !== null && metrics.priceDeviationsCount >= minSamples && (
          <div style={{
            padding: '12px',
            borderRadius: '6px',
            backgroundColor: darkMode ? '#0a0a0f' : '#ffffff',
            border: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`
          }}>
            <div style={{
              fontSize: '11px',
              color: darkMode ? '#9ca3af' : '#6b7280',
              marginBottom: '4px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              <DollarSign size={12} />
              {t('supplierMemory.metrics.avgPriceDeviation')}
            </div>
            <div style={{
              fontSize: '20px',
              fontWeight: '600',
              color: metrics.avgPriceDeviation > 0 ? '#ef4444' : '#10b981',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              {metrics.avgPriceDeviation > 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
              {metrics.avgPriceDeviation > 0 ? '+' : ''}
              {metrics.avgPriceDeviation.toFixed(2)}%
            </div>
            <div style={{
              fontSize: '10px',
              color: darkMode ? '#9ca3af' : '#6b7280',
              marginTop: '2px'
            }}>
              {t('supplierMemory.metrics.samples', { count: metrics.priceDeviationsCount })}
            </div>
          </div>
        )}
        
        {/* Avg Lead Time Deviation */}
        {metrics.avgLeadTimeDeviation !== null && metrics.leadTimeDeviationsCount >= minSamples && (
          <div style={{
            padding: '12px',
            borderRadius: '6px',
            backgroundColor: darkMode ? '#0a0a0f' : '#ffffff',
            border: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`
          }}>
            <div style={{
              fontSize: '11px',
              color: darkMode ? '#9ca3af' : '#6b7280',
              marginBottom: '4px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              <Clock size={12} />
              {t('supplierMemory.metrics.avgLeadTimeDeviation')}
            </div>
            <div style={{
              fontSize: '20px',
              fontWeight: '600',
              color: metrics.avgLeadTimeDeviation > 0 ? '#ef4444' : '#10b981',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              {metrics.avgLeadTimeDeviation > 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
              {metrics.avgLeadTimeDeviation > 0 ? '+' : ''}
              {t('supplierMemory.metrics.daysValue', { count: Math.round(metrics.avgLeadTimeDeviation) })}
            </div>
            <div style={{
              fontSize: '10px',
              color: darkMode ? '#9ca3af' : '#6b7280',
              marginTop: '2px'
            }}>
              {t('supplierMemory.metrics.samples', { count: metrics.leadTimeDeviationsCount })}
            </div>
          </div>
        )}
      </div>
      
      {/* Info message if not enough data */}
      {!hasEnoughData && metrics.quotesSent > 0 && (
        <div style={{
          marginTop: '12px',
          padding: '8px 12px',
          borderRadius: '6px',
          backgroundColor: darkMode ? '#1f293720' : '#f3f4f6',
          border: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`,
          fontSize: '12px',
          color: darkMode ? '#9ca3af' : '#6b7280'
        }}>
          {t('supplierMemory.needMoreData', { count: minSamples })}
        </div>
      )}
    </div>
  )
}








