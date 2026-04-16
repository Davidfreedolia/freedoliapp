/**
 * FBACalculator — Interactive Amazon EU FBA cost & margin calculator.
 *
 * Integrates with fbaRates.js to compute fulfillment fees, referral fees,
 * net profit, margin % and ROI from product inputs.
 *
 * Props: none (fully self-contained local state)
 * Usage: <FBACalculator />
 */
import { useState, useMemo } from 'react'
import { computeFullCostBreakdown, REFERRAL_RATES } from '../lib/fbaRates'

const CATEGORIES = Object.entries(REFERRAL_RATES).map(([key, { label, rate }]) => ({
  key,
  label: `${label} (${Math.round(rate * 100)}%)`,
}))

const SIZE_TIER_LABELS = {
  small_standard: 'Estàndard petit',
  standard: 'Estàndard gran',
  small_oversize: 'Sobredimensionat petit',
  medium_oversize: 'Sobredimensionat mitjà',
  large_oversize: 'Sobredimensionat gran',
  special_oversize: 'Sobredimensionat especial',
}

function fmt(n) {
  return `€${n.toFixed(2)}`
}

function pct(n) {
  return `${n.toFixed(1)}%`
}

function marginColor(m) {
  if (m >= 30) return '#10b981'
  if (m >= 15) return '#f59e0b'
  return '#ef4444'
}

function NumInput({ label, value, onChange, unit = '', placeholder = '0', step = '0.01', min = '0' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {label}{unit && <span style={{ fontWeight: 400, marginLeft: 4, textTransform: 'none' }}>{unit}</span>}
      </label>
      <input
        type="number"
        value={value}
        min={min}
        step={step}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
        style={{
          padding: '8px 10px',
          borderRadius: 8,
          border: '1px solid var(--border-1)',
          background: 'var(--surface-bg)',
          color: 'var(--text-1)',
          fontSize: 14,
          width: '100%',
          outline: 'none',
        }}
      />
    </div>
  )
}

function ResultRow({ label, value, sub, tone }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
      padding: '6px 0', borderBottom: '1px solid var(--border-1)'
    }}>
      <span style={{ fontSize: 13, color: 'var(--text-2)' }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 600, color: tone || 'var(--text-1)', textAlign: 'right' }}>
        {value}
        {sub && <span style={{ fontWeight: 400, fontSize: 11, color: 'var(--text-2)', marginLeft: 4 }}>{sub}</span>}
      </span>
    </div>
  )
}

export default function FBACalculator() {
  const [sellingPrice, setSellingPrice] = useState('')
  const [cogs, setCogs] = useState('')
  const [weightG, setWeightG] = useState('')
  const [lengthCm, setLengthCm] = useState('')
  const [widthCm, setWidthCm] = useState('')
  const [heightCm, setHeightCm] = useState('')
  const [categoryKey, setCategoryKey] = useState('other')
  const [open, setOpen] = useState(false)

  const result = useMemo(() => {
    const sp = Number(sellingPrice) || 0
    const cg = Number(cogs) || 0
    const wg = Number(weightG) || 0
    if (sp <= 0 && wg <= 0) return null
    return computeFullCostBreakdown({
      sellingPrice: sp,
      cogs: cg,
      weightG: wg,
      lengthCm: Number(lengthCm) || 0,
      widthCm: Number(widthCm) || 0,
      heightCm: Number(heightCm) || 0,
      categoryKey,
    })
  }, [sellingPrice, cogs, weightG, lengthCm, widthCm, heightCm, categoryKey])

  const hasResult = result !== null && Number(sellingPrice) > 0

  return (
    <div style={{
      border: '1px solid var(--border-1)',
      borderRadius: 12,
      overflow: 'hidden',
      background: 'var(--surface-bg-2)',
    }}>
      {/* Header / toggle */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 16px', background: 'transparent', border: 'none', cursor: 'pointer',
          color: 'var(--text-1)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16 }}>🧮</span>
          <span style={{ fontSize: 14, fontWeight: 600 }}>Calculadora FBA EU 2024</span>
          {hasResult && (
            <span style={{
              fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
              background: marginColor(result.marginPct) + '22', color: marginColor(result.marginPct)
            }}>
              {pct(result.marginPct)} marge
            </span>
          )}
        </div>
        <span style={{ fontSize: 18, lineHeight: 1, opacity: 0.5, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>
          ▾
        </span>
      </button>

      {open && (
        <div style={{ padding: '0 16px 16px' }}>
          {/* Grid 2 col for main inputs */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
            <NumInput label="Preu de venda" unit="€" value={sellingPrice} onChange={setSellingPrice} placeholder="29.90" />
            <NumInput label="Cost producte (COGS)" unit="€" value={cogs} onChange={setCogs} placeholder="8.50" />
          </div>

          {/* Dimensions */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
            <NumInput label="Pes" unit="g" value={weightG} onChange={setWeightG} placeholder="350" step="1" />
            <NumInput label="Llarg" unit="cm" value={lengthCm} onChange={setLengthCm} placeholder="30" step="0.1" />
            <NumInput label="Ample" unit="cm" value={widthCm} onChange={setWidthCm} placeholder="20" step="0.1" />
            <NumInput label="Alt" unit="cm" value={heightCm} onChange={setHeightCm} placeholder="5" step="0.1" />
          </div>

          {/* Category */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 14 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Categoria
            </label>
            <select
              value={categoryKey}
              onChange={(e) => setCategoryKey(e.target.value)}
              style={{
                padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border-1)',
                background: 'var(--surface-bg)', color: 'var(--text-1)', fontSize: 14,
              }}
            >
              {CATEGORIES.map(({ key, label }) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>

          {/* Results */}
          {result && Number(sellingPrice) > 0 && (
            <div style={{
              background: 'var(--surface-bg)',
              border: '1px solid var(--border-1)',
              borderRadius: 10,
              padding: '12px 14px',
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                Desglossament EU · {SIZE_TIER_LABELS[result.sizeTier] || result.sizeTier}
              </div>
              <ResultRow label="Preu de venda" value={fmt(Number(sellingPrice))} />
              <ResultRow label="Cost producte (COGS)" value={`–${fmt(Number(cogs) || 0)}`} tone="#ef4444" />
              <ResultRow
                label="Taxa FBA (fulfillment)"
                value={`–${fmt(result.fulfillmentFee)}`}
                tone="#ef4444"
              />
              <ResultRow
                label={`Taxa referral (${Math.round((REFERRAL_RATES[categoryKey]?.rate || 0.15) * 100)}%)`}
                value={`–${fmt(result.referralFee)}`}
                tone="#ef4444"
              />
              <ResultRow label="Total costos" value={`–${fmt(result.totalCosts)}`} tone="#ef4444" />
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                padding: '10px 0 4px', marginTop: 2
              }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)' }}>Benefici net</span>
                <span style={{ fontSize: 18, fontWeight: 800, color: marginColor(result.marginPct) }}>
                  {fmt(result.netProfit)}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                <div style={{
                  flex: 1, textAlign: 'center', padding: '8px 4px',
                  background: marginColor(result.marginPct) + '15', borderRadius: 8,
                }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: marginColor(result.marginPct) }}>
                    {pct(result.marginPct)}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-2)', marginTop: 2 }}>MARGE</div>
                </div>
                <div style={{
                  flex: 1, textAlign: 'center', padding: '8px 4px',
                  background: marginColor(result.roi > 0 ? result.roi / 2 : -1) + '15', borderRadius: 8,
                }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: result.roi >= 0 ? '#10b981' : '#ef4444' }}>
                    {pct(result.roi)}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-2)', marginTop: 2 }}>ROI</div>
                </div>
              </div>
              {result.marginPct < 15 && (
                <div style={{
                  marginTop: 10, padding: '8px 10px', borderRadius: 8,
                  background: '#ef444415', border: '1px solid #ef444433',
                  fontSize: 12, color: '#ef4444', lineHeight: 1.4
                }}>
                  ⚠️ Marge inferior al 15%. Negocia millor el COGS o ajusta el preu de venda.
                </div>
              )}
              {result.marginPct >= 30 && (
                <div style={{
                  marginTop: 10, padding: '8px 10px', borderRadius: 8,
                  background: '#10b98115', border: '1px solid #10b98133',
                  fontSize: 12, color: '#10b981', lineHeight: 1.4
                }}>
                  ✅ Marge excel·lent. El producte compleix l'objectiu de rendibilitat.
                </div>
              )}
            </div>
          )}

          {!result && (
            <div style={{ textAlign: 'center', padding: '12px 0', fontSize: 12, color: 'var(--text-2)' }}>
              Introdueix el preu de venda i el pes per calcular les taxes FBA.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
