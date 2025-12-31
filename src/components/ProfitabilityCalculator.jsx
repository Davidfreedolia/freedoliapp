import { useState, useEffect } from 'react'
import { Save, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react'
import { getProjectProfitability, upsertProjectProfitability } from '../lib/supabase'
import { calculateQuickProfitability } from '../lib/profitability'

/**
 * Calculadora de profitabilitat ràpida (Nivell 1)
 * Visible a la fase Research del projecte
 */
export default function ProfitabilityCalculator({ projectId, darkMode }) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [data, setData] = useState({
    selling_price: '0',
    cogs: '0',
    shipping_per_unit: '0',
    referral_fee_percent: '15',
    fba_fee_per_unit: '0',
    ppc_per_unit: '0',
    other_costs_per_unit: '0'
  })
  const [results, setResults] = useState(null)
  const [badge, setBadge] = useState(null)

  useEffect(() => {
    loadData()
  }, [projectId])

  useEffect(() => {
    // Recalcular en temps real quan canvien els inputs
    if (data.selling_price || data.cogs || data.shipping_per_unit || 
        data.referral_fee_percent || data.fba_fee_per_unit || 
        data.ppc_per_unit || data.other_costs_per_unit) {
      const calculated = calculateQuickProfitability(data)
      setResults(calculated)
      
      // Actualitzar badge
      if (calculated.decision === 'GO') {
        setBadge({ type: 'go', label: 'GO', color: '#10b981', icon: CheckCircle2 })
      } else if (calculated.decision === 'RISKY') {
        setBadge({ type: 'risky', label: 'RISKY', color: '#f59e0b', icon: AlertTriangle })
      } else if (calculated.decision === 'NO-GO') {
        setBadge({ type: 'no-go', label: 'NO-GO', color: '#ef4444', icon: XCircle })
      } else {
        setBadge(null)
      }
    }
  }, [data])

  const loadData = async () => {
    if (!projectId) return
    setLoading(true)
    try {
      let profitability = await getProjectProfitability(projectId)
      
      // Si no existeix registre, crear-lo amb defaults
      if (!profitability) {
        await upsertProjectProfitability(projectId, {
          selling_price: 0,
          cogs: 0,
          shipping_per_unit: 0,
          referral_fee_percent: 15,
          fba_fee_per_unit: 0,
          ppc_per_unit: 0,
          other_costs_per_unit: 0
        })
        // Recarregar després de crear
        profitability = await getProjectProfitability(projectId)
      }

      if (profitability) {
        setData({
          selling_price: (profitability.selling_price ?? 0).toString(),
          cogs: (profitability.cogs ?? 0).toString(),
          shipping_per_unit: (profitability.shipping_per_unit ?? 0).toString(),
          referral_fee_percent: (profitability.referral_fee_percent ?? 15).toString(),
          fba_fee_per_unit: (profitability.fba_fee_per_unit ?? 0).toString(),
          ppc_per_unit: (profitability.ppc_per_unit ?? 0).toString(),
          other_costs_per_unit: (profitability.other_costs_per_unit ?? 0).toString()
        })
      }
    } catch (err) {
      console.error('Error carregant profitability:', err)
    }
    setLoading(false)
  }

  const handleInputChange = (field, value) => {
    // Validar que no sigui negatiu
    const numValue = parseFloat(value)
    if (value === '' || (!isNaN(numValue) && numValue >= 0)) {
      setData(prev => ({
        ...prev,
        [field]: value === '' ? '0' : value
      }))
    }
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value)
  }

  const formatPercent = (value) => {
    return `${value.toFixed(2)}%`
  }

  const handleSave = async () => {
    if (!projectId) return
    
    setSaving(true)
    try {
      // Recalcular resultats abans de guardar
      const calculated = calculateQuickProfitability(data)
      
      await upsertProjectProfitability(projectId, {
        selling_price: parseFloat(data.selling_price) || 0,
        cogs: parseFloat(data.cogs) || 0,
        shipping_per_unit: parseFloat(data.shipping_per_unit) || 0,
        referral_fee_percent: parseFloat(data.referral_fee_percent) || 15,
        fba_fee_per_unit: parseFloat(data.fba_fee_per_unit) || 0,
        ppc_per_unit: parseFloat(data.ppc_per_unit) || 0,
        other_costs_per_unit: parseFloat(data.other_costs_per_unit) || 0
      })
    } catch (err) {
      console.error('Error guardant profitability:', err)
      alert('Error guardant la profitabilitat: ' + (err.message || 'Error desconegut'))
    } finally {
      setSaving(false)
    }
  }

  const styles = {
    card: {
      padding: '24px',
      borderRadius: '12px',
      backgroundColor: darkMode ? '#15151f' : '#ffffff',
      border: `1px solid ${darkMode ? '#2a2a3a' : '#e5e7eb'}`,
      marginBottom: '24px'
    },
    cardTitle: {
      fontSize: '18px',
      fontWeight: '600',
      color: darkMode ? '#ffffff' : '#111827',
      marginBottom: '20px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    grid: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '32px'
    },
    column: {
      display: 'flex',
      flexDirection: 'column',
      gap: '16px'
    },
    inputGroup: {
      display: 'flex',
      flexDirection: 'column',
      gap: '6px'
    },
    label: {
      fontSize: '13px',
      fontWeight: '500',
      color: darkMode ? '#9ca3af' : '#6b7280'
    },
    input: {
      padding: '10px 12px',
      borderRadius: '6px',
      border: `1px solid ${darkMode ? '#374151' : '#d1d5db'}`,
      backgroundColor: darkMode ? '#1f1f2e' : '#ffffff',
      color: darkMode ? '#ffffff' : '#111827',
      fontSize: '14px',
      width: '100%'
    },
    resultsBox: {
      padding: '20px',
      borderRadius: '8px',
      backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb',
      border: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`
    },
    resultItem: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '12px 0',
      borderBottom: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`
    },
    resultLabel: {
      fontSize: '14px',
      color: darkMode ? '#9ca3af' : '#6b7280'
    },
    resultValue: {
      fontSize: '16px',
      fontWeight: '600',
      color: darkMode ? '#ffffff' : '#111827'
    },
    badge: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '8px',
      padding: '12px 16px',
      borderRadius: '8px',
      fontSize: '14px',
      fontWeight: '600',
      marginTop: '16px'
    },
    saveButton: {
      padding: '12px 24px',
      backgroundColor: '#4f46e5',
      color: '#ffffff',
      border: 'none',
      borderRadius: '6px',
      fontSize: '14px',
      fontWeight: '500',
      cursor: saving ? 'not-allowed' : 'pointer',
      opacity: saving ? 0.6 : 1,
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      justifyContent: 'center',
      marginTop: '8px'
    }
  }

  if (loading) {
    return (
      <div style={styles.card}>
        <div style={{ textAlign: 'center', padding: '40px', color: darkMode ? '#9ca3af' : '#6b7280' }}>
          Carregant calculadora...
        </div>
      </div>
    )
  }

  return (
    <div style={styles.card}>
      <h3 style={styles.cardTitle}>
        💰 Quick Profitability
      </h3>

      <div style={styles.grid}>
        {/* Columna esquerra - Inputs */}
        <div style={styles.column}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Selling Price (€)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={data.selling_price}
              onChange={e => handleInputChange('selling_price', e.target.value)}
              style={styles.input}
              placeholder="0.00"
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>COGS (€)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={data.cogs}
              onChange={e => handleInputChange('cogs', e.target.value)}
              style={styles.input}
              placeholder="0.00"
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Shipping per Unit (€)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={data.shipping_per_unit}
              onChange={e => handleInputChange('shipping_per_unit', e.target.value)}
              style={styles.input}
              placeholder="0.00"
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Referral Fee (%)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={data.referral_fee_percent}
              onChange={e => handleInputChange('referral_fee_percent', e.target.value)}
              style={styles.input}
              placeholder="15.00"
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>FBA Fee per Unit (€)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={data.fba_fee_per_unit}
              onChange={e => handleInputChange('fba_fee_per_unit', e.target.value)}
              style={styles.input}
              placeholder="0.00"
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>PPC per Unit (€)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={data.ppc_per_unit}
              onChange={e => handleInputChange('ppc_per_unit', e.target.value)}
              style={styles.input}
              placeholder="0.00"
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Other Costs per Unit (€)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={data.other_costs_per_unit}
              onChange={e => handleInputChange('other_costs_per_unit', e.target.value)}
              style={styles.input}
              placeholder="0.00"
            />
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            style={styles.saveButton}
          >
            <Save size={16} />
            {saving ? 'Guardant...' : 'Guardar'}
          </button>
        </div>

        {/* Columna dreta - Resultats */}
        <div style={styles.column}>
          {results && (
            <>
              <div style={styles.resultsBox}>
                <div style={styles.resultItem}>
                  <span style={styles.resultLabel}>Referral Fee:</span>
                  <span style={styles.resultValue}>
                    {formatCurrency(results.referral_fee)}
                  </span>
                </div>

                <div style={styles.resultItem}>
                  <span style={styles.resultLabel}>Total Cost:</span>
                  <span style={styles.resultValue}>
                    {formatCurrency(results.total_cost)}
                  </span>
                </div>

                <div style={styles.resultItem}>
                  <span style={styles.resultLabel}>Net Profit:</span>
                  <span style={{
                    ...styles.resultValue,
                    color: results.net_profit >= 0 ? '#10b981' : '#ef4444'
                  }}>
                    {formatCurrency(results.net_profit)}
                  </span>
                </div>

                <div style={{
                  ...styles.resultItem,
                  borderBottom: 'none',
                  paddingTop: '16px',
                  borderTop: `2px solid ${darkMode ? '#374151' : '#e5e7eb'}`
                }}>
                  <span style={styles.resultLabel}>Margin:</span>
                  <span style={{
                    ...styles.resultValue,
                    color: results.margin_percent >= 30 ? '#10b981' :
                           results.margin_percent >= 15 ? '#f59e0b' : '#ef4444'
                  }}>
                    {formatPercent(results.margin_percent)}
                  </span>
                </div>

                <div style={styles.resultItem}>
                  <span style={styles.resultLabel}>ROI:</span>
                  <span style={{
                    ...styles.resultValue,
                    color: results.roi_percent >= 50 ? '#10b981' :
                           results.roi_percent >= 20 ? '#f59e0b' : '#ef4444'
                  }}>
                    {formatPercent(results.roi_percent)}
                  </span>
                </div>

                {results.breakeven_units > 0 && (
                  <div style={styles.resultItem}>
                    <span style={styles.resultLabel}>Breakeven Units:</span>
                    <span style={styles.resultValue}>
                      {results.breakeven_units}
                    </span>
                  </div>
                )}
              </div>

              {/* Badge GO/RISKY/NO-GO */}
              {badge && (
                <div style={{
                  ...styles.badge,
                  backgroundColor: `${badge.color}15`,
                  color: badge.color,
                  border: `2px solid ${badge.color}40`
                }}>
                  <badge.icon size={20} />
                  <span>{badge.label}</span>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
