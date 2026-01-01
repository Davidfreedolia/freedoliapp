import { useState, useEffect } from 'react'
import { Plus, Trash2, Copy, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import {
  getSupplierPriceEstimates,
  createSupplierPriceEstimate,
  deleteSupplierPriceEstimate
} from '../lib/supabase'
import { convertToEUR, formatEUR } from '../utils/currencyConverter'
import { showToast } from './Toast'

const SOURCES = [
  { value: '1688', label: '1688' },
  { value: 'Alibaba', label: 'Alibaba' },
  { value: 'Zentrada', label: 'Zentrada' },
  { value: 'Other', label: 'Other' }
]

const CURRENCIES = ['EUR', 'USD', 'CNY', 'GBP']

export default function QuickSupplierPriceEstimate({ projectId, darkMode, onCopyToProfitability }) {
  const [estimates, setEstimates] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newEstimate, setNewEstimate] = useState({
    source: '1688',
    price: '',
    currency: 'CNY',
    moq: '',
    notes: ''
  })

  useEffect(() => {
    loadEstimates()
  }, [projectId])

  const loadEstimates = async () => {
    if (!projectId) return
    setLoading(true)
    try {
      const data = await getSupplierPriceEstimates(projectId)
      setEstimates(data || [])
    } catch (err) {
      console.error('Error carregant estimacions:', err)
      showToast('Error carregant estimacions', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleAddEstimate = async () => {
    if (!newEstimate.price || parseFloat(newEstimate.price) <= 0) {
      showToast('El preu és obligatori i ha de ser major que 0', 'error')
      return
    }

    try {
      await createSupplierPriceEstimate(projectId, {
        source: newEstimate.source,
        price: parseFloat(newEstimate.price),
        currency: newEstimate.currency,
        moq: newEstimate.moq ? parseInt(newEstimate.moq) : null,
        notes: newEstimate.notes || null
      })
      setNewEstimate({
        source: '1688',
        price: '',
        currency: 'CNY',
        moq: '',
        notes: ''
      })
      setShowAddForm(false)
      loadEstimates()
      showToast('Estimació afegida', 'success')
    } catch (err) {
      console.error('Error afegint estimació:', err)
      showToast('Error afegint estimació: ' + (err.message || 'Error desconegut'), 'error')
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Segur que vols eliminar aquesta estimació?')) return
    
    try {
      await deleteSupplierPriceEstimate(id)
      loadEstimates()
      showToast('Estimació eliminada', 'success')
    } catch (err) {
      console.error('Error eliminant estimació:', err)
      showToast('Error eliminant estimació', 'error')
    }
  }

  const handleCopyToProfitability = (priceInEUR) => {
    if (onCopyToProfitability) {
      onCopyToProfitability(priceInEUR)
      showToast('Preu copiat a Profitability Calculator', 'success')
    }
  }

  // Calcular estadístiques
  const calculateStats = () => {
    if (estimates.length === 0) {
      return { min: 0, max: 0, avg: 0, count: 0 }
    }

    const pricesInEUR = estimates.map(e => convertToEUR(e.price, e.currency))
    const min = Math.min(...pricesInEUR)
    const max = Math.max(...pricesInEUR)
    const avg = pricesInEUR.reduce((sum, p) => sum + p, 0) / pricesInEUR.length
    const count = estimates.length

    return { min, max, avg, count }
  }

  const stats = calculateStats()

  const styles = {
    container: {
      backgroundColor: darkMode ? '#15151f' : '#ffffff',
      borderRadius: '12px',
      padding: '24px',
      border: `1px solid ${darkMode ? '#2a2a3a' : '#e5e7eb'}`,
      marginBottom: '24px'
    },
    title: {
      fontSize: '18px',
      fontWeight: '600',
      color: darkMode ? '#ffffff' : '#111827',
      marginBottom: '20px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    statsContainer: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
      gap: '12px',
      marginBottom: '20px',
      padding: '16px',
      backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb',
      borderRadius: '8px',
      border: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`
    },
    statItem: {
      display: 'flex',
      flexDirection: 'column',
      gap: '4px'
    },
    statLabel: {
      fontSize: '12px',
      color: darkMode ? '#9ca3af' : '#6b7280',
      fontWeight: '500'
    },
    statValue: {
      fontSize: '18px',
      fontWeight: '700',
      color: darkMode ? '#ffffff' : '#111827'
    },
    addButton: {
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      padding: '10px 16px',
      backgroundColor: '#4f46e5',
      color: '#ffffff',
      border: 'none',
      borderRadius: '6px',
      fontSize: '14px',
      fontWeight: '500',
      cursor: 'pointer',
      marginBottom: '16px'
    },
    form: {
      backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb',
      border: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`,
      borderRadius: '8px',
      padding: '16px',
      marginBottom: '16px',
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
      gap: '12px'
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
      backgroundColor: darkMode ? '#0a0a0f' : '#ffffff',
      color: darkMode ? '#ffffff' : '#111827',
      fontSize: '14px'
    },
    select: {
      padding: '8px 12px',
      borderRadius: '6px',
      border: `1px solid ${darkMode ? '#374151' : '#d1d5db'}`,
      backgroundColor: darkMode ? '#0a0a0f' : '#ffffff',
      color: darkMode ? '#ffffff' : '#111827',
      fontSize: '14px',
      cursor: 'pointer'
    },
    formActions: {
      gridColumn: '1 / -1',
      display: 'flex',
      gap: '8px',
      justifyContent: 'flex-end'
    },
    button: {
      padding: '8px 16px',
      borderRadius: '6px',
      border: 'none',
      fontSize: '14px',
      fontWeight: '500',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '6px'
    },
    estimatesList: {
      display: 'flex',
      flexDirection: 'column',
      gap: '12px'
    },
    estimateCard: {
      backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb',
      border: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`,
      borderRadius: '8px',
      padding: '16px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: '16px'
    },
    estimateInfo: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      gap: '8px'
    },
    estimateHeader: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      flexWrap: 'wrap'
    },
    sourceBadge: {
      padding: '4px 12px',
      borderRadius: '6px',
      fontSize: '12px',
      fontWeight: '600',
      backgroundColor: '#4f46e5',
      color: '#ffffff'
    },
    priceText: {
      fontSize: '16px',
      fontWeight: '600',
      color: darkMode ? '#ffffff' : '#111827'
    },
    priceEUR: {
      fontSize: '14px',
      color: darkMode ? '#9ca3af' : '#6b7280',
      marginLeft: '8px'
    },
    moqText: {
      fontSize: '13px',
      color: darkMode ? '#9ca3af' : '#6b7280'
    },
    notesText: {
      fontSize: '13px',
      color: darkMode ? '#9ca3af' : '#6b7280',
      fontStyle: 'italic'
    },
    estimateActions: {
      display: 'flex',
      gap: '8px',
      alignItems: 'center'
    },
    actionButton: {
      padding: '6px 12px',
      borderRadius: '6px',
      border: 'none',
      fontSize: '13px',
      fontWeight: '500',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      backgroundColor: darkMode ? '#374151' : '#e5e7eb',
      color: darkMode ? '#ffffff' : '#111827'
    },
    deleteButton: {
      backgroundColor: 'transparent',
      border: 'none',
      cursor: 'pointer',
      padding: '4px',
      color: '#ef4444',
      display: 'flex',
      alignItems: 'center'
    },
    empty: {
      textAlign: 'center',
      padding: '40px',
      color: darkMode ? '#9ca3af' : '#6b7280',
      fontSize: '14px'
    },
    loading: {
      textAlign: 'center',
      padding: '40px',
      color: darkMode ? '#9ca3af' : '#6b7280',
      fontSize: '14px'
    }
  }

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Carregant estimacions...</div>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>
        💰 Quick Supplier Price Estimate
      </h3>

      {/* Estadístiques */}
      {estimates.length > 0 && (
        <div style={styles.statsContainer}>
          <div style={styles.statItem}>
            <span style={styles.statLabel}>Count</span>
            <span style={styles.statValue}>{stats.count}</span>
          </div>
          <div style={styles.statItem}>
            <span style={styles.statLabel}>
              <TrendingDown size={14} style={{ display: 'inline', marginRight: '4px' }} />
              Min (EUR)
            </span>
            <span style={styles.statValue}>{formatEUR(stats.min)}</span>
          </div>
          <div style={styles.statItem}>
            <span style={styles.statLabel}>
              <TrendingUp size={14} style={{ display: 'inline', marginRight: '4px' }} />
              Max (EUR)
            </span>
            <span style={styles.statValue}>{formatEUR(stats.max)}</span>
          </div>
          <div style={styles.statItem}>
            <span style={styles.statLabel}>
              <Minus size={14} style={{ display: 'inline', marginRight: '4px' }} />
              Avg (EUR)
            </span>
            <span style={styles.statValue}>{formatEUR(stats.avg)}</span>
          </div>
        </div>
      )}

      {/* Botó afegir */}
      {!showAddForm && (
        <button
          onClick={() => setShowAddForm(true)}
          style={styles.addButton}
        >
          <Plus size={16} />
          Afegir Estimació
        </button>
      )}

      {/* Formulari afegir */}
      {showAddForm && (
        <div style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Source *</label>
            <select
              value={newEstimate.source}
              onChange={(e) => setNewEstimate({ ...newEstimate, source: e.target.value })}
              style={styles.select}
            >
              {SOURCES.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Price *</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={newEstimate.price}
              onChange={(e) => setNewEstimate({ ...newEstimate, price: e.target.value })}
              style={styles.input}
              placeholder="0.00"
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Currency *</label>
            <select
              value={newEstimate.currency}
              onChange={(e) => setNewEstimate({ ...newEstimate, currency: e.target.value })}
              style={styles.select}
            >
              {CURRENCIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>MOQ</label>
            <input
              type="number"
              min="1"
              value={newEstimate.moq}
              onChange={(e) => setNewEstimate({ ...newEstimate, moq: e.target.value })}
              style={styles.input}
              placeholder="Optional"
            />
          </div>

          <div style={{ ...styles.inputGroup, gridColumn: '1 / -1' }}>
            <label style={styles.label}>Notes</label>
            <input
              type="text"
              value={newEstimate.notes}
              onChange={(e) => setNewEstimate({ ...newEstimate, notes: e.target.value })}
              style={styles.input}
              placeholder="Optional notes..."
            />
          </div>

          <div style={styles.formActions}>
            <button
              onClick={() => {
                setShowAddForm(false)
                setNewEstimate({
                  source: '1688',
                  price: '',
                  currency: 'CNY',
                  moq: '',
                  notes: ''
                })
              }}
              style={{
                ...styles.button,
                backgroundColor: darkMode ? '#374151' : '#e5e7eb',
                color: darkMode ? '#ffffff' : '#111827'
              }}
            >
              Cancel·lar
            </button>
            <button
              onClick={handleAddEstimate}
              style={{
                ...styles.button,
                backgroundColor: '#4f46e5',
                color: '#ffffff'
              }}
            >
              <Plus size={16} />
              Afegir
            </button>
          </div>
        </div>
      )}

      {/* Llista d'estimacions */}
      {estimates.length === 0 ? (
        <div style={styles.empty}>
          No hi ha estimacions. Afegeix la primera estimació de preu!
        </div>
      ) : (
        <div style={styles.estimatesList}>
          {estimates.map(estimate => {
            const priceInEUR = convertToEUR(estimate.price, estimate.currency)
            return (
              <div key={estimate.id} style={styles.estimateCard}>
                <div style={styles.estimateInfo}>
                  <div style={styles.estimateHeader}>
                    <span style={styles.sourceBadge}>{estimate.source}</span>
                    <span style={styles.priceText}>
                      {estimate.price.toFixed(2)} {estimate.currency}
                      <span style={styles.priceEUR}>
                        ({formatEUR(priceInEUR)})
                      </span>
                    </span>
                  </div>
                  {estimate.moq && (
                    <span style={styles.moqText}>MOQ: {estimate.moq} units</span>
                  )}
                  {estimate.notes && (
                    <span style={styles.notesText}>{estimate.notes}</span>
                  )}
                </div>
                <div style={styles.estimateActions}>
                  <button
                    onClick={() => handleCopyToProfitability(priceInEUR)}
                    style={styles.actionButton}
                    title="Copiar a Profitability Calculator"
                  >
                    <Copy size={14} />
                    Copy to COGS
                  </button>
                  <button
                    onClick={() => handleDelete(estimate.id)}
                    style={styles.deleteButton}
                    title="Eliminar"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

