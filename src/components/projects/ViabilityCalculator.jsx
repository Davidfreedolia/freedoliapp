import { useEffect, useMemo, useState } from 'react'
import { Calculator, Save } from 'lucide-react'
import { getPhaseSurfaceStyles } from '../../utils/phaseStyles'

const DEFAULT_VALUES = {
  selling_price: '',
  estimated_cogs: '',
  fba_fee_estimate: '',
  shipping_to_fba_per_unit: '',
  ppc_per_unit: '',
  vat_percent: '21',
  return_rate_percent: '3',
  other_costs_per_unit: ''
}

const parseNumber = (value) => {
  if (value === null || value === undefined) return 0
  const normalized = value.toString().replace(',', '.')
  const numeric = Number.parseFloat(normalized)
  return Number.isFinite(numeric) ? numeric : 0
}

export default function ViabilityCalculator({ projectId, darkMode, phaseStyle, onSave }) {
  const [values, setValues] = useState(DEFAULT_VALUES)
  const [savedAt, setSavedAt] = useState(null)
  const storageKey = useMemo(() => `viability_${projectId}`, [projectId])
  const phaseSurface = getPhaseSurfaceStyles(phaseStyle, { darkMode, borderWidth: 2 })

  useEffect(() => {
    if (!projectId) return
    try {
      const stored = localStorage.getItem(storageKey)
      if (stored) {
        const parsed = JSON.parse(stored)
        setValues({ ...DEFAULT_VALUES, ...parsed })
      }
    } catch (err) {
      console.error('Error carregant viabilitat:', err)
    }
  }, [projectId, storageKey])

  const computed = useMemo(() => {
    const sellingPrice = parseNumber(values.selling_price)
    const vatPercent = parseNumber(values.vat_percent)
    const revenueNetVat = vatPercent > 0 ? sellingPrice / (1 + vatPercent / 100) : sellingPrice
    const estimatedCogs = parseNumber(values.estimated_cogs)
    const fbaFee = parseNumber(values.fba_fee_estimate)
    const shippingToFba = parseNumber(values.shipping_to_fba_per_unit)
    const ppc = parseNumber(values.ppc_per_unit)
    const returnRate = parseNumber(values.return_rate_percent)
    const otherCosts = parseNumber(values.other_costs_per_unit)
    const returnsCost = sellingPrice * (returnRate / 100)
    const totalCosts = estimatedCogs + fbaFee + shippingToFba + ppc + otherCosts + returnsCost
    const profitPerUnit = revenueNetVat - totalCosts
    const netMarginPercent = revenueNetVat > 0 ? (profitPerUnit / revenueNetVat) * 100 : 0
    const breakEvenAcos = sellingPrice > 0 ? (profitPerUnit / sellingPrice) * 100 : 0

    let status = 'red'
    if (profitPerUnit > 0 && netMarginPercent >= 25) status = 'green'
    if (profitPerUnit > 0 && netMarginPercent < 25) status = 'yellow'

    return {
      revenueNetVat,
      totalCosts,
      profitPerUnit,
      netMarginPercent,
      breakEvenAcos,
      status
    }
  }, [values])

  const handleSave = () => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(values))
      setSavedAt(Date.now())
      if (typeof onSave === 'function') {
        onSave({ values, computed })
      }
    } catch (err) {
      console.error('Error guardant viabilitat:', err)
    }
  }

  const updateValue = (key) => (event) => {
    setValues(prev => ({ ...prev, [key]: event.target.value }))
  }

  const statusStyles = {
    green: { color: '#16a34a', borderColor: '#16a34a' },
    yellow: { color: '#f59e0b', borderColor: '#f59e0b' },
    red: { color: '#ef4444', borderColor: '#ef4444' }
  }

  return (
    <div style={{
      ...styles.card,
      ...(phaseSurface.cardStyle || {})
    }}>
      <div style={styles.header}>
        <div style={styles.titleRow}>
          <Calculator size={18} />
          <h4 style={{
            margin: 0,
            fontSize: '15px',
            color: darkMode ? '#ffffff' : '#111827'
          }}>
            Calculadora de viabilitat
          </h4>
        </div>
        <span style={{
          ...styles.statusPill,
          ...(statusStyles[computed.status] || {})
        }}>
          {computed.status === 'green' && 'OK'}
          {computed.status === 'yellow' && 'Marge baix'}
          {computed.status === 'red' && 'No viable'}
        </span>
      </div>

      <div style={styles.inputsGrid}>
        <Input label="Preu venda (EUR)" value={values.selling_price} onChange={updateValue('selling_price')} />
        <Input label="COGS estimat (EUR)" value={values.estimated_cogs} onChange={updateValue('estimated_cogs')} />
        <Input label="FBA fee (EUR)" value={values.fba_fee_estimate} onChange={updateValue('fba_fee_estimate')} />
        <Input label="Shipping a FBA / unitat (EUR)" value={values.shipping_to_fba_per_unit} onChange={updateValue('shipping_to_fba_per_unit')} />
        <Input label="PPC / unitat (EUR)" value={values.ppc_per_unit} onChange={updateValue('ppc_per_unit')} />
        <Input label="IVA (%)" value={values.vat_percent} onChange={updateValue('vat_percent')} />
        <Input label="Devolucions (%)" value={values.return_rate_percent} onChange={updateValue('return_rate_percent')} />
        <Input label="Altres costos / unitat (EUR)" value={values.other_costs_per_unit} onChange={updateValue('other_costs_per_unit')} />
      </div>

      <div style={styles.outputGrid}>
        <Output label="Revenue net IVA" value={`${computed.revenueNetVat.toFixed(2)} €`} />
        <Output label="Costos totals / unitat" value={`${computed.totalCosts.toFixed(2)} €`} />
        <Output label="Profit / unitat" value={`${computed.profitPerUnit.toFixed(2)} €`} />
        <Output label="Marge net" value={`${computed.netMarginPercent.toFixed(1)} %`} />
        <Output label="Break-even ACOS" value={`${computed.breakEvenAcos.toFixed(1)} %`} />
      </div>

      <div style={styles.footerRow}>
        <button style={styles.saveButton} onClick={handleSave}>
          <Save size={14} />
          Guardar
        </button>
        {savedAt && (
          <span style={styles.savedText}>
            Guardat
          </span>
        )}
      </div>
    </div>
  )
}

function Input({ label, value, onChange }) {
  return (
    <label style={styles.inputField}>
      <span style={styles.inputLabel}>{label}</span>
      <input
        type="number"
        step="0.01"
        value={value}
        onChange={onChange}
        style={styles.input}
      />
    </label>
  )
}

function Output({ label, value }) {
  return (
    <div style={styles.outputField}>
      <span style={styles.outputLabel}>{label}</span>
      <strong style={styles.outputValue}>{value}</strong>
    </div>
  )
}

const styles = {
  card: {
    padding: '20px',
    borderRadius: '16px',
    border: '1px solid var(--border-color)',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  titleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  statusPill: {
    fontSize: '11px',
    fontWeight: '700',
    border: '1px solid',
    borderRadius: '999px',
    padding: '4px 10px'
  },
  inputsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '12px'
  },
  inputField: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  inputLabel: {
    fontSize: '12px',
    color: '#6b7280'
  },
  input: {
    padding: '8px 10px',
    borderRadius: '8px',
    border: '1px solid #d1d5db',
    fontSize: '13px'
  },
  outputGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
    gap: '10px'
  },
  outputField: {
    padding: '10px 12px',
    borderRadius: '10px',
    border: '1px dashed #e5e7eb',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  outputLabel: {
    fontSize: '11px',
    color: '#6b7280'
  },
  outputValue: {
    fontSize: '13px',
    color: '#111827'
  },
  footerRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  saveButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 14px',
    borderRadius: '10px',
    border: '1px solid #4f46e5',
    backgroundColor: '#4f46e5',
    color: '#ffffff',
    fontSize: '13px',
    cursor: 'pointer'
  },
  savedText: {
    fontSize: '12px',
    color: '#16a34a'
  }
}
