import { useState, useEffect, useCallback } from 'react'
import { Save, AlertTriangle, CheckCircle2, XCircle, ExternalLink, Link2 } from 'lucide-react'
import { getProjectProfitability, upsertProjectProfitability, getProductIdentifiers, upsertProductIdentifiers } from '../lib/supabase'
import { calculateQuickProfitability } from '../lib/profitability'
import HelpIcon from './HelpIcon'

/**
 * Calculadora de profitabilitat ràpida (Nivell 1.5)
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
    other_costs_per_unit: '0',
    fixed_costs: '0'
  })
  const [results, setResults] = useState(null)
  const [badge, setBadge] = useState(null)
  
  // Amazon ASIN Capture state
  const [asinInput, setAsinInput] = useState('')
  const [capturedAsin, setCapturedAsin] = useState(null)
  const [asinMarketplace, setAsinMarketplace] = useState(null)
  const [capturingAsin, setCapturingAsin] = useState(false)
  const [asinError, setAsinError] = useState(null)

  // This will be set up after loadData and loadAsin are defined

  // Listen for price copy events from QuickSupplierPriceEstimate
  useEffect(() => {
    const handleCopyPrice = (event) => {
      const { price } = event.detail
      if (price && !isNaN(price)) {
        setData(prev => ({
          ...prev,
          cogs: price.toString()
        }))
      }
    }

    window.addEventListener('copyPriceToCOGS', handleCopyPrice)
    return () => {
      window.removeEventListener('copyPriceToCOGS', handleCopyPrice)
    }
  }, [])

  useEffect(() => {
    // Recalcular en temps real quan canvien els inputs
    if (data.selling_price || data.cogs || data.shipping_per_unit || 
        data.referral_fee_percent || data.fba_fee_per_unit || 
        data.ppc_per_unit || data.other_costs_per_unit || data.fixed_costs) {
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

  const loadData = useCallback(async () => {
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
          other_costs_per_unit: 0,
          fixed_costs: 0
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
          other_costs_per_unit: (profitability.other_costs_per_unit ?? 0).toString(),
          fixed_costs: (profitability.fixed_costs ?? 0).toString()
        })
      }
    } catch (err) {
      console.error('Error carregant profitability:', err)
    }
    setLoading(false)
  }, [projectId])

  useEffect(() => {
    loadData()
    loadAsin()
  }, [projectId, loadData, loadAsin])

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

  const loadAsin = useCallback(async () => {
    if (!projectId) return
    try {
      const identifiers = await getProductIdentifiers(projectId)
      if (identifiers?.asin) {
        setCapturedAsin(identifiers.asin)
        // Try to extract marketplace from existing data if available
        // For now, default to 'es' if not specified
        setAsinMarketplace('es')
      }
    } catch (err) {
      console.error('Error carregant ASIN:', err)
    }
  }, [projectId])

  /**
   * Extrae ASIN de una URL de Amazon o valida un ASIN directo
   * Soporta:
   * - /dp/<ASIN>
   * - /gp/product/<ASIN>
   * - query param asin=<ASIN>
   * - ASIN directo (10 caracteres alfanuméricos)
   */
  const extractAsin = (input) => {
    if (!input || typeof input !== 'string') return null
    
    const trimmed = input.trim()
    
    // Si es un ASIN directo (10 caracteres alfanuméricos)
    if (/^[A-Z0-9]{10}$/i.test(trimmed)) {
      return trimmed.toUpperCase()
    }
    
    // Intentar extraer de URL
    try {
      const url = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`)
      
      // Extraer marketplace del dominio
      const domain = url.hostname
      let marketplace = 'es' // default
      if (domain.includes('.co.uk')) marketplace = 'uk'
      else if (domain.includes('.de')) marketplace = 'de'
      else if (domain.includes('.fr')) marketplace = 'fr'
      else if (domain.includes('.it')) marketplace = 'it'
      else if (domain.includes('.es')) marketplace = 'es'
      else if (domain.includes('.com')) marketplace = 'com'
      
      // Patrón 1: /dp/<ASIN>
      const dpMatch = url.pathname.match(/\/dp\/([A-Z0-9]{10})/i)
      if (dpMatch) {
        setAsinMarketplace(marketplace)
        return dpMatch[1].toUpperCase()
      }
      
      // Patrón 2: /gp/product/<ASIN>
      const gpMatch = url.pathname.match(/\/gp\/product\/([A-Z0-9]{10})/i)
      if (gpMatch) {
        setAsinMarketplace(marketplace)
        return gpMatch[1].toUpperCase()
      }
      
      // Patrón 3: query param asin=<ASIN>
      const asinParam = url.searchParams.get('asin')
      if (asinParam && /^[A-Z0-9]{10}$/i.test(asinParam)) {
        setAsinMarketplace(marketplace)
        return asinParam.toUpperCase()
      }
      
      return null
    } catch {
      // Si no es una URL válida, intentar como ASIN directo
      if (/^[A-Z0-9]{10}$/i.test(trimmed)) {
        return trimmed.toUpperCase()
      }
      return null
    }
  }

  /**
   * Valida formato de ASIN: 10 caracteres alfanuméricos
   */
  const validateAsin = (asin) => {
    if (!asin) return false
    return /^[A-Z0-9]{10}$/.test(asin)
  }

  const handleCaptureAsin = async () => {
    if (!projectId) return
    
    setCapturingAsin(true)
    setAsinError(null)
    
    try {
      const asin = extractAsin(asinInput)
      
      if (!asin) {
        setAsinError('Format invàlid. Introdueix una URL d\'Amazon o un ASIN de 10 caràcters.')
        setCapturingAsin(false)
        return
      }
      
      if (!validateAsin(asin)) {
        setAsinError('L\'ASIN ha de tenir exactament 10 caràcters alfanumèrics.')
        setCapturingAsin(false)
        return
      }
      
      // Guardar en product_identifiers
      await upsertProductIdentifiers(projectId, {
        asin: asin
      })
      
      setCapturedAsin(asin)
      setAsinInput('')
      setAsinError(null)
      
      // Opcional: Log a audit_log (si existeix la función)
      try {
        const { logAuditEvent } = await import('../lib/supabase')
        if (logAuditEvent) {
          await logAuditEvent('asin_captured', {
            project_id: projectId,
            asin: asin,
            marketplace: asinMarketplace || 'es'
          })
        }
      } catch {
        // Ignorar si no existeix audit_log
      }
    } catch (err) {
      console.error('Error capturant ASIN:', err)
      setAsinError('Error guardant l\'ASIN: ' + (err.message || 'Error desconegut'))
    } finally {
      setCapturingAsin(false)
    }
  }

  const handleReplaceAsin = () => {
    setCapturedAsin(null)
    setAsinInput('')
    setAsinError(null)
  }

  const getAmazonUrl = (asin, marketplace = 'es') => {
    const domainMap = {
      'es': 'amazon.es',
      'uk': 'amazon.co.uk',
      'de': 'amazon.de',
      'fr': 'amazon.fr',
      'it': 'amazon.it',
      'com': 'amazon.com'
    }
    const domain = domainMap[marketplace] || 'amazon.es'
    return `https://${domain}/dp/${asin}`
  }

  const handleOpenOnAmazon = () => {
    if (!capturedAsin) return
    const url = getAmazonUrl(capturedAsin, asinMarketplace || 'es')
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const handleSave = async () => {
    if (!projectId) return
    
    setSaving(true)
    try {
      await upsertProjectProfitability(projectId, {
        selling_price: parseFloat(data.selling_price) || 0,
        cogs: parseFloat(data.cogs) || 0,
        shipping_per_unit: parseFloat(data.shipping_per_unit) || 0,
        referral_fee_percent: parseFloat(data.referral_fee_percent) || 15,
        fba_fee_per_unit: parseFloat(data.fba_fee_per_unit) || 0,
        ppc_per_unit: parseFloat(data.ppc_per_unit) || 0,
        other_costs_per_unit: parseFloat(data.other_costs_per_unit) || 0,
        fixed_costs: parseFloat(data.fixed_costs) || 0
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
    },
    asinSection: {
      marginBottom: '24px'
    },
    asinInputGroup: {
      display: 'flex',
      gap: '8px',
      alignItems: 'flex-start'
    },
    asinCapturedGroup: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '12px',
      flexWrap: 'wrap'
    },
    captureButton: {
      display: 'flex',
      alignItems: 'center',
      gap: '6px'
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
        <HelpIcon helpKey="profitability" size="medium" darkMode={darkMode} />
      </h3>

      {/* Amazon ASIN Capture Section */}
      <div style={{
        ...styles.asinSection,
        backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb',
        border: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`,
        borderRadius: '8px',
        padding: '16px',
        marginBottom: '24px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '12px'
        }}>
          <Link2 size={16} color={darkMode ? '#9ca3af' : '#6b7280'} />
          <label style={{
            ...styles.label,
            fontSize: '14px',
            fontWeight: '600',
            color: darkMode ? '#ffffff' : '#111827'
          }}>
            Amazon ASIN Capture
          </label>
        </div>
        
        {!capturedAsin ? (
          <div style={styles.asinInputGroup}>
            <input
              type="text"
              value={asinInput}
              onChange={(e) => {
                setAsinInput(e.target.value)
                setAsinError(null)
              }}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleCaptureAsin()
                }
              }}
              placeholder="Pega una URL d'Amazon o un ASIN (ex: B08XYZ1234)"
              style={{
                ...styles.input,
                flex: 1,
                marginRight: '8px'
              }}
            />
            <button
              onClick={handleCaptureAsin}
              disabled={capturingAsin || !asinInput.trim()}
              style={{
                ...styles.captureButton,
                backgroundColor: '#4f46e5',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                padding: '10px 16px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: (capturingAsin || !asinInput.trim()) ? 'not-allowed' : 'pointer',
                opacity: (capturingAsin || !asinInput.trim()) ? 0.6 : 1,
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              {capturingAsin ? 'Capturant...' : 'Capture'}
            </button>
          </div>
        ) : (
          <div style={styles.asinCapturedGroup}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              flex: 1
            }}>
              <CheckCircle2 size={16} color="#10b981" />
              <span style={{
                fontSize: '14px',
                color: darkMode ? '#ffffff' : '#111827',
                fontWeight: '500'
              }}>
                ASIN capturat: <strong>{capturedAsin}</strong>
                {asinMarketplace && (
                  <span style={{ color: darkMode ? '#9ca3af' : '#6b7280', marginLeft: '8px' }}>
                    ({asinMarketplace.toUpperCase()})
                  </span>
                )}
              </span>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={handleOpenOnAmazon}
                style={{
                  ...styles.captureButton,
                  backgroundColor: '#f59e0b',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '8px 12px',
                  fontSize: '13px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <ExternalLink size={14} />
                Open on Amazon
              </button>
              <button
                onClick={handleReplaceAsin}
                style={{
                  ...styles.captureButton,
                  backgroundColor: 'transparent',
                  color: darkMode ? '#9ca3af' : '#6b7280',
                  border: `1px solid ${darkMode ? '#374151' : '#d1d5db'}`,
                  borderRadius: '6px',
                  padding: '8px 12px',
                  fontSize: '13px',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                Replace
              </button>
            </div>
          </div>
        )}
        
        {asinError && (
          <div style={{
            marginTop: '8px',
            padding: '8px 12px',
            backgroundColor: '#fee2e2',
            border: '1px solid #fecaca',
            borderRadius: '6px',
            color: '#991b1b',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <AlertTriangle size={14} />
            {asinError}
          </div>
        )}
      </div>

      <div style={styles.grid}>
        {/* Columna esquerra - Inputs */}
        <div style={styles.column}>
          <div style={styles.inputGroup}>
            <label style={{ ...styles.label, display: 'flex', alignItems: 'center', gap: '4px' }}>
              Selling Price (€)
              <HelpIcon helpKey="profitability.selling_price" size="small" darkMode={darkMode} />
            </label>
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
            <label style={{ ...styles.label, display: 'flex', alignItems: 'center', gap: '4px' }}>
              COGS (€)
              <HelpIcon helpKey="profitability.cogs" size="small" darkMode={darkMode} />
            </label>
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
            <label style={{ ...styles.label, display: 'flex', alignItems: 'center', gap: '4px' }}>
              Shipping per Unit (€)
              <HelpIcon helpKey="profitability.shipping_per_unit" size="small" darkMode={darkMode} />
            </label>
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
            <label style={{ ...styles.label, display: 'flex', alignItems: 'center', gap: '4px' }}>
              Referral Fee (%)
              <HelpIcon helpKey="profitability.referral_fee_percent" size="small" darkMode={darkMode} />
            </label>
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
            <label style={{ ...styles.label, display: 'flex', alignItems: 'center', gap: '4px' }}>
              FBA Fee per Unit (€)
              <HelpIcon helpKey="profitability.fba_fee_per_unit" size="small" darkMode={darkMode} />
            </label>
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
            <label style={{ ...styles.label, display: 'flex', alignItems: 'center', gap: '4px' }}>
              PPC per Unit (€)
              <HelpIcon helpKey="profitability.ppc_per_unit" size="small" darkMode={darkMode} />
            </label>
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
            <label style={{ ...styles.label, display: 'flex', alignItems: 'center', gap: '4px' }}>
              Other Costs per Unit (€)
              <HelpIcon helpKey="profitability.other_costs_per_unit" size="small" darkMode={darkMode} />
            </label>
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

          <div style={styles.inputGroup}>
            <label style={{ ...styles.label, display: 'flex', alignItems: 'center', gap: '4px' }}>
              Fixed Costs (€)
              <HelpIcon helpKey="profitability.fixed_costs" size="small" darkMode={darkMode} />
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={data.fixed_costs}
              onChange={e => handleInputChange('fixed_costs', e.target.value)}
              style={styles.input}
              placeholder="0.00"
            />
            <span style={{ fontSize: '11px', color: darkMode ? '#6b7280' : '#9ca3af', marginTop: '2px' }}>
              Costos fixos totals (ex: desenvolupament, tooling, etc.)
            </span>
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
                  <span style={{ ...styles.resultLabel, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    ROI Product:
                    <HelpIcon helpKey="profitability.roi" size="small" darkMode={darkMode} />
                  </span>
                  <span style={{
                    ...styles.resultValue,
                    color: results.roi_product >= 50 ? '#10b981' :
                           results.roi_product >= 20 ? '#f59e0b' : '#ef4444'
                  }}>
                    {formatPercent(results.roi_product)}
                  </span>
                  <span style={{ fontSize: '11px', color: darkMode ? '#6b7280' : '#9ca3af', marginLeft: '8px' }}>
                    (excl. fees)
                  </span>
                </div>

                <div style={styles.resultItem}>
                  <span style={styles.resultLabel}>ROI Total:</span>
                  <span style={{
                    ...styles.resultValue,
                    color: results.roi_total >= 50 ? '#10b981' :
                           results.roi_total >= 20 ? '#f59e0b' : '#ef4444'
                  }}>
                    {formatPercent(results.roi_total)}
                  </span>
                  <span style={{ fontSize: '11px', color: darkMode ? '#6b7280' : '#9ca3af', marginLeft: '8px' }}>
                    (incl. fees)
                  </span>
                </div>

                {results.breakeven_units !== null && results.breakeven_units > 0 && (
                  <div style={{
                    ...styles.resultItem,
                    borderBottom: 'none'
                  }}>
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
