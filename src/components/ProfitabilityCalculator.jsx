import { useState, useEffect, useCallback } from 'react'
import { Save, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react'
import { getProjectProfitability, upsertProjectProfitability } from '../lib/supabase'

/**
 * Calculadora de profitabilitat ràpida (tipus Helium 10)
 * Visible a la fase Research del projecte
 */
export default function ProfitabilityCalculator({ projectId, darkMode }) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [data, setData] = useState({
    selling_price: '',
    cogs: '',
    shipping_per_unit: '',
    referral_fee_percent: '',
    fba_fee_per_unit: '',
    ppc_per_unit: '0'
  })
  const [results, setResults] = useState({
    total_fees_per_unit: 0,
    net_profit_per_unit: 0,
    margin_percent: 0,
    roi_percent: 0,
    break_even_units: 0
  })
  const [badge, setBadge] = useState(null) // 'go', 'risky', 'no-go'
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true)
  const [lastSaved, setLastSaved] = useState(null)

  useEffect(() => {
    loadData()
  }, [projectId])

  const loadData = async () => {
    if (!projectId) return
    setLoading(true)
    try {
      const profitability = await getProjectProfitability(projectId)
      if (profitability) {
        setData({
          selling_price: profitability.selling_price?.toString() || '',
          cogs: profitability.cogs?.toString() || '',
          shipping_per_unit: profitability.shipping_per_unit?.toString() || '',
          referral_fee_percent: profitability.referral_fee_percent?.toString() || '',
          fba_fee_per_unit: profitability.fba_fee_per_unit?.toString() || '',
          ppc_per_unit: profitability.ppc_per_unit?.toString() || '0'
        })
        // Carregar resultats guardats si existeixen
        if (profitability.net_profit_per_unit !== null) {
          calculateResults({
            selling_price: profitability.selling_price?.toString() || '',
            cogs: profitability.cogs?.toString() || '',
            shipping_per_unit: profitability.shipping_per_unit?.toString() || '',
            referral_fee_percent: profitability.referral_fee_percent?.toString() || '',
            fba_fee_per_unit: profitability.fba_fee_per_unit?.toString() || '',
            ppc_per_unit: profitability.ppc_per_unit?.toString() || '0'
          }, false) // No recalcular, usar valors guardats
        }
      }
    } catch (err) {
      console.error('Error carregant profitability:', err)
    }
    setLoading(false)
  }

  const calculateResults = useCallback((inputData, shouldCalculate = true) => {
    const sellingPrice = parseFloat(inputData.selling_price) || 0
    const cogs = parseFloat(inputData.cogs) || 0
    const shipping = parseFloat(inputData.shipping_per_unit) || 0
    const referralFeePercent = parseFloat(inputData.referral_fee_percent) || 0
    const fbaFee = parseFloat(inputData.fba_fee_per_unit) || 0
    const ppc = parseFloat(inputData.ppc_per_unit) || 0

    if (!shouldCalculate || sellingPrice === 0) {
      // Si no s'ha de calcular o no hi ha selling_price, usar valors guardats o zeros
      return
    }

    // Calcular total fees per unit
    const referralFee = (sellingPrice * referralFeePercent) / 100
    const totalFeesPerUnit = shipping + referralFee + fbaFee + ppc

    // Calcular net profit per unit
    const netProfitPerUnit = sellingPrice - cogs - totalFeesPerUnit

    // Calcular margin %
    const marginPercent = sellingPrice > 0 ? (netProfitPerUnit / sellingPrice) * 100 : 0

    // Calcular ROI %
    const roiPercent = cogs > 0 ? (netProfitPerUnit / cogs) * 100 : 0

    // Calcular break-even (units necessàries per cobrir costos fixos si hi ha)
    // Per simplificar, break-even = cogs / net_profit_per_unit si net_profit > 0
    const breakEvenUnits = netProfitPerUnit > 0 && cogs > 0 
      ? Math.ceil(cogs / netProfitPerUnit) 
      : 0

    const newResults = {
      total_fees_per_unit: totalFeesPerUnit,
      net_profit_per_unit: netProfitPerUnit,
      margin_percent: marginPercent,
      roi_percent: roiPercent,
      break_even_units: breakEvenUnits
    }

    setResults(newResults)

    // Determinar badge segons margin
    if (marginPercent >= 30) {
      setBadge({ type: 'go', label: 'GO', color: '#10b981', icon: CheckCircle2 })
    } else if (marginPercent >= 15) {
      setBadge({ type: 'risky', label: 'RISKY', color: '#f59e0b', icon: AlertTriangle })
    } else if (marginPercent > 0) {
      setBadge({ type: 'no-go', label: 'NO-GO', color: '#ef4444', icon: XCircle })
    } else {
      setBadge(null)
    }
  }, [])

  useEffect(() => {
    // Auto-càlcul quan canvien els inputs
    const timer = setTimeout(() => {
      calculateResults(data, true)
    }, 300) // Debounce 300ms

    // Autosave opcional després de 2 segons sense canvis
    let autoSaveTimer
    if (autoSaveEnabled && projectId && data.selling_price) {
      autoSaveTimer = setTimeout(() => {
        handleSave(true) // true = autosave (silenciós)
      }, 2000)
    }

    return () => {
      clearTimeout(timer)
      if (autoSaveTimer) clearTimeout(autoSaveTimer)
    }
  }, [data, autoSaveEnabled, projectId]) // Removed calculateResults and handleSave from deps to avoid infinite loop

  const handleInputChange = (field, value) => {
    setData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSave = async (isAutoSave = false) => {
    if (!projectId) return
    
    setSaving(true)
    try {
      const sellingPrice = parseFloat(data.selling_price) || null
      const cogs = parseFloat(data.cogs) || null
      const shipping = parseFloat(data.shipping_per_unit) || null
      const referralFeePercent = parseFloat(data.referral_fee_percent) || null
      const fbaFee = parseFloat(data.fba_fee_per_unit) || null
      const ppc = parseFloat(data.ppc_per_unit) || 0

      // Calcular resultats abans de guardar
      const referralFee = sellingPrice > 0 ? (sellingPrice * (referralFeePercent || 0)) / 100 : 0
      const totalFeesPerUnit = (shipping || 0) + referralFee + (fbaFee || 0) + ppc
      const netProfitPerUnit = (sellingPrice || 0) - (cogs || 0) - totalFeesPerUnit
      const marginPercent = sellingPrice > 0 ? (netProfitPerUnit / sellingPrice) * 100 : 0
      const roiPercent = cogs > 0 ? (netProfitPerUnit / cogs) * 100 : 0

      // Actualitzar resultats a l'estat
      const newResults = {
        total_fees_per_unit: totalFeesPerUnit,
        net_profit_per_unit: netProfitPerUnit,
        margin_percent: marginPercent,
        roi_percent: roiPercent,
        break_even_units: netProfitPerUnit > 0 && cogs > 0 ? Math.ceil(cogs / netProfitPerUnit) : 0
      }
      setResults(newResults)

      // Actualitzar badge
      if (marginPercent >= 30) {
        setBadge({ type: 'go', label: 'GO', color: '#10b981', icon: CheckCircle2 })
      } else if (marginPercent >= 15) {
        setBadge({ type: 'risky', label: 'RISKY', color: '#f59e0b', icon: AlertTriangle })
      } else if (marginPercent > 0) {
        setBadge({ type: 'no-go', label: 'NO-GO', color: '#ef4444', icon: XCircle })
      } else {
        setBadge(null)
      }

      await upsertProjectProfitability(projectId, {
        selling_price: sellingPrice,
        cogs: cogs,
        shipping_per_unit: shipping,
        referral_fee_percent: referralFeePercent,
        fba_fee_per_unit: fbaFee,
        ppc_per_unit: ppc,
        total_fees_per_unit: totalFeesPerUnit,
        net_profit_per_unit: netProfitPerUnit,
        margin_percent: marginPercent,
        roi_percent: roiPercent
      })
      
      if (!isAutoSave) {
        setLastSaved(new Date())
      }
    } catch (err) {
      console.error('Error guardant profitability:', err)
      if (!isAutoSave) {
        alert('Error guardant la profitabilitat: ' + (err.message || 'Error desconegut'))
      }
    } finally {
      setSaving(false)
    }
  }

  const styles = {
    container: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '24px',
      padding: '20px',
      borderRadius: '12px',
      backgroundColor: darkMode ? '#15151f' : '#ffffff',
      border: `1px solid ${darkMode ? '#2a2a3a' : '#e5e7eb'}`
    },
    column: {
      display: 'flex',
      flexDirection: 'column',
      gap: '16px'
    },
    sectionTitle: {
      fontSize: '14px',
      fontWeight: '600',
      color: darkMode ? '#e5e7eb' : '#374151',
      marginBottom: '8px'
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
      padding: '8px 12px',
      borderRadius: '6px',
      border: `1px solid ${darkMode ? '#374151' : '#d1d5db'}`,
      backgroundColor: darkMode ? '#1f1f2e' : '#ffffff',
      color: darkMode ? '#ffffff' : '#111827',
      fontSize: '14px',
      width: '100%'
    },
    resultsBox: {
      padding: '16px',
      borderRadius: '8px',
      backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb',
      border: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`
    },
    resultItem: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '8px 0',
      borderBottom: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`
    },
    resultLabel: {
      fontSize: '13px',
      color: darkMode ? '#9ca3af' : '#6b7280'
    },
    resultValue: {
      fontSize: '14px',
      fontWeight: '600',
      color: darkMode ? '#ffffff' : '#111827'
    },
    badge: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      padding: '8px 12px',
      borderRadius: '8px',
      fontSize: '13px',
      fontWeight: '600',
      marginTop: '12px'
    },
    saveButton: {
      padding: '10px 20px',
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
      justifyContent: 'center'
    }
  }

  if (loading) {
    return (
      <div style={{
        padding: '40px',
        textAlign: 'center',
        color: darkMode ? '#9ca3af' : '#6b7280'
      }}>
        Carregant calculadora...
      </div>
    )
  }

  return (
    <div style={styles.container}>
      {/* Columna esquerra - Inputs */}
      <div style={styles.column}>
        <h3 style={{
          ...styles.sectionTitle,
          fontSize: '16px',
          marginBottom: '16px'
        }}>
          💰 Quick Profitability Calculator
        </h3>

        <div style={styles.inputGroup}>
          <label style={styles.label}>Selling Price (€)</label>
          <input
            type="number"
            step="0.01"
            value={data.selling_price}
            onChange={e => handleInputChange('selling_price', e.target.value)}
            style={styles.input}
            placeholder="0.00"
          />
        </div>

        <div style={styles.inputGroup}>
          <label style={styles.label}>COGS - Cost of Goods Sold (€)</label>
          <input
            type="number"
            step="0.01"
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
            value={data.ppc_per_unit}
            onChange={e => handleInputChange('ppc_per_unit', e.target.value)}
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
        <h3 style={{
          ...styles.sectionTitle,
          fontSize: '16px',
          marginBottom: '16px'
        }}>
          📊 Results
        </h3>

        <div style={styles.resultsBox}>
          <div style={styles.resultItem}>
            <span style={styles.resultLabel}>Total Fees per Unit:</span>
            <span style={styles.resultValue}>
              €{results.total_fees_per_unit.toFixed(2)}
            </span>
          </div>

          <div style={styles.resultItem}>
            <span style={styles.resultLabel}>Net Profit per Unit:</span>
            <span style={{
              ...styles.resultValue,
              color: results.net_profit_per_unit >= 0 ? '#10b981' : '#ef4444'
            }}>
              €{results.net_profit_per_unit.toFixed(2)}
            </span>
          </div>

          <div style={styles.resultItem}>
            <span style={styles.resultLabel}>Margin:</span>
            <span style={{
              ...styles.resultValue,
              color: results.margin_percent >= 30 ? '#10b981' :
                     results.margin_percent >= 15 ? '#f59e0b' : '#ef4444'
            }}>
              {results.margin_percent.toFixed(2)}%
            </span>
          </div>

          <div style={styles.resultItem}>
            <span style={styles.resultLabel}>ROI:</span>
            <span style={{
              ...styles.resultValue,
              color: results.roi_percent >= 50 ? '#10b981' :
                     results.roi_percent >= 20 ? '#f59e0b' : '#ef4444'
            }}>
              {results.roi_percent.toFixed(2)}%
            </span>
          </div>

          {results.break_even_units > 0 && (
            <div style={{
              ...styles.resultItem,
              borderBottom: 'none',
              paddingTop: '12px',
              borderTop: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`
            }}>
              <span style={styles.resultLabel}>Break-Even Units:</span>
              <span style={styles.resultValue}>
                {results.break_even_units}
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
            border: `1px solid ${badge.color}40`
          }}>
            <badge.icon size={16} />
            {badge.label}
          </div>
        )}

        {/* Info adicional */}
        <div style={{
          padding: '12px',
          borderRadius: '8px',
          backgroundColor: darkMode ? '#1f1f2e' : '#f3f4f6',
          fontSize: '12px',
          color: darkMode ? '#9ca3af' : '#6b7280',
          lineHeight: '1.5'
        }}>
          <strong>Badge Rules:</strong><br />
          ✓ GO: Margin ≥ 30%<br />
          ⚠ RISKY: Margin ≥ 15% i &lt; 30%<br />
          ✗ NO-GO: Margin &lt; 15%
        </div>
      </div>
    </div>
  )
}

