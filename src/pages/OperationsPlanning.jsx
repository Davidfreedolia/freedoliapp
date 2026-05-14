/**
 * D22.3 / D22.4 / D22.5 — Operations Planning. Reorder + Stock Risk + Cash Impact.
 * Data from getReorderCandidates, detectStockoutRisk, getCashflowForecast only; no client-side calculations.
 */
import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useWorkspace } from '../contexts/WorkspaceContext'
import { supabase } from '../lib/supabase'
import { getReorderCandidates } from '../lib/inventory/getReorderCandidates'
import { detectStockoutRisk } from '../lib/inventory/detectStockoutRisk'
import { getCashflowForecast } from '../lib/finance/getCashflowForecast'
import Button from '../components/ui/Button'

const LIMIT = 500
const STOCKOUT_LOOKBACK_DAYS = 30
const CASH_FORECAST_DAYS = 30

function localeFor(lng) {
  return lng === 'es' ? 'es-ES' : lng === 'en' ? 'en-GB' : 'ca-ES'
}

function formatCurrencyEUR(amount, lng) {
  if (amount == null || !Number.isFinite(amount)) return '—'
  return new Intl.NumberFormat(localeFor(lng), { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount)
}

function formatDateReadable(dateStr, lng) {
  if (!dateStr || typeof dateStr !== 'string') return '—'
  const d = new Date(dateStr + 'Z')
  if (Number.isNaN(d.getTime())) return dateStr
  return d.toLocaleDateString(localeFor(lng), { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatNum(v) {
  if (v == null || !Number.isFinite(v)) return '—'
  return Number(v)
}

async function getWorkspaceAsins(supabaseClient, orgId) {
  const { data, error } = await supabaseClient
    .from('product_identifiers')
    .select('asin')
    .eq('org_id', orgId)
    .not('asin', 'is', null)
  if (error) return []
  return [...new Set((data || []).map((r) => (r.asin || '').trim()).filter(Boolean))]
}

/** Derive severity from daysOfCover for display (engine does not return it). */
function severityFromDays(days) {
  if (days == null || !Number.isFinite(days)) return 'low'
  if (days < 7) return 'high'
  if (days < 14) return 'medium'
  return 'low'
}

/** Predicted stockout date string from days of cover. */
function predictedStockoutDate(daysOfCover) {
  if (daysOfCover == null || !Number.isFinite(daysOfCover)) return null
  const d = new Date()
  d.setDate(d.getDate() + Math.max(0, Math.floor(daysOfCover)))
  return d.toISOString().slice(0, 10)
}

export default function OperationsPlanning() {
  const { t, i18n } = useTranslation()
  const formatDays = (v) => {
    if (v == null || !Number.isFinite(v)) return '—'
    const n = Number(v)
    if (n < 0) return '—'
    return n <= 1 ? t('operationsPlanning.day', { n }) : t('operationsPlanning.days', { n: Math.round(n) })
  }
  const { activeOrgId } = useWorkspace()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [rows, setRows] = useState([])
  const [stockRiskLoading, setStockRiskLoading] = useState(true)
  const [stockRiskError, setStockRiskError] = useState(null)
  const [stockRiskRows, setStockRiskRows] = useState([])
  const [cashImpactLoading, setCashImpactLoading] = useState(true)
  const [cashImpactError, setCashImpactError] = useState(null)
  const [cashImpactData, setCashImpactData] = useState([])

  const loadReorder = useCallback(async () => {
    if (!activeOrgId) {
      setRows([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const data = await getReorderCandidates(supabase, activeOrgId, { limit: LIMIT })
      setRows(Array.isArray(data) ? data : [])
    } catch (e) {
      setError(e?.message || String(e))
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [activeOrgId])

  const loadStockRisk = useCallback(async () => {
    if (!activeOrgId) {
      setStockRiskRows([])
      setStockRiskLoading(false)
      return
    }
    setStockRiskLoading(true)
    setStockRiskError(null)
    try {
      const asins = await getWorkspaceAsins(supabase, activeOrgId)
      const results = await Promise.all(
        asins.map((asin) => detectStockoutRisk(supabase, activeOrgId, { asin, lookbackDays: STOCKOUT_LOOKBACK_DAYS }))
      )
      const list = (results.filter(Boolean) || []).sort((a, b) => (a.daysOfStock ?? Infinity) - (b.daysOfStock ?? Infinity))
      setStockRiskRows(list)
    } catch (e) {
      setStockRiskError(e?.message || String(e))
      setStockRiskRows([])
    } finally {
      setStockRiskLoading(false)
    }
  }, [activeOrgId])

  const loadCashImpact = useCallback(async () => {
    if (!activeOrgId) {
      setCashImpactData([])
      setCashImpactLoading(false)
      return
    }
    setCashImpactLoading(true)
    setCashImpactError(null)
    try {
      const result = await getCashflowForecast(supabase, activeOrgId, { forecastDays: CASH_FORECAST_DAYS })
      setCashImpactData(Array.isArray(result) ? result : [])
    } catch (e) {
      setCashImpactError(e?.message || String(e))
      setCashImpactData([])
    } finally {
      setCashImpactLoading(false)
    }
  }, [activeOrgId])

  useEffect(() => {
    loadReorder()
  }, [loadReorder])

  useEffect(() => {
    loadStockRisk()
  }, [loadStockRisk])

  useEffect(() => {
    loadCashImpact()
  }, [loadCashImpact])

  const load = useCallback(() => {
    loadReorder()
    loadStockRisk()
  }, [loadReorder, loadStockRisk])

  const hasReorderError = Boolean(error)
  const reorderEmpty = !loading && rows.length === 0

  if (loading && stockRiskLoading && rows.length === 0 && stockRiskRows.length === 0) {
    return (
      <div style={styles.page}>
        <header style={styles.header}>
          <h1 style={styles.title}>Operations Planning</h1>
          <p style={styles.subtitle}>Plan reorder priorities using live inventory intelligence</p>
        </header>
        <div style={styles.loading}>Loading…</div>
      </div>
    )
  }

  if (hasReorderError && !rows.length) {
    return (
      <div style={styles.page}>
        <header style={styles.header}>
          <h1 style={styles.title}>{t('operationsPlanning.title')}</h1>
          <p style={styles.subtitle}>{t('operationsPlanning.subtitle')}</p>
        </header>
        <div style={styles.errorWrap}>
          <p style={styles.errorText}>{error}</p>
          <Button variant="primary" size="md" onClick={load}>
            {t('common.retry')}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <h1 style={styles.title}>{t('operationsPlanning.title')}</h1>
        <p style={styles.subtitle}>{t('operationsPlanning.subtitle')}</p>
      </header>

      {/* Reorder Planning View */}
      <section style={styles.section} aria-labelledby="reorder-heading">
        <h2 id="reorder-heading" style={styles.sectionTitle}>{t('operationsPlanning.reorder.title')}</h2>
        {loading ? (
          <div style={styles.loading}>{t('common.loading')}</div>
        ) : reorderEmpty ? (
          <div style={styles.empty}>{t('operationsPlanning.reorder.empty')}</div>
        ) : (
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>{t('operationsPlanning.reorder.cols.product')}</th>
                  <th style={styles.th}>{t('operationsPlanning.reorder.cols.units')}</th>
                  <th style={styles.th}>{t('operationsPlanning.reorder.cols.coverage')}</th>
                  <th style={styles.th}>{t('operationsPlanning.reorder.cols.stockout')}</th>
                  <th style={styles.th}>{t('operationsPlanning.reorder.cols.reorder')}</th>
                  <th style={styles.th}>{t('operationsPlanning.reorder.cols.leadTime')}</th>
                  <th style={styles.th}>{t('operationsPlanning.reorder.cols.confidence')}</th>
                  <th style={styles.th}>{t('operationsPlanning.reorder.cols.issues')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.asin}>
                    <td style={styles.td}>{row.productName || row.asin || '—'}</td>
                    <td style={styles.td}>{formatNum(row.stockOnHand)}</td>
                    <td style={styles.td}>{formatNum(row.coverageDays)}</td>
                    <td style={styles.td}>{formatDays(row.daysUntilStockout)}</td>
                    <td style={styles.td}>{formatNum(row.reorderUnits)}</td>
                    <td style={styles.td}>{formatNum(row.leadTimeDays)}</td>
                    <td style={styles.td}>{row.confidence || '—'}</td>
                    <td style={styles.td}>{Array.isArray(row.issues) ? row.issues.join(', ') : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Stock Risk View — D22.4 */}
      <section style={styles.section} aria-labelledby="stock-risk-heading">
        <h2 id="stock-risk-heading" style={styles.sectionTitle}>{t('operationsPlanning.stockRisk.title')}</h2>
        <p style={styles.sectionSubtitle}>{t('operationsPlanning.stockRisk.subtitle')}</p>
        {stockRiskLoading ? (
          <div style={styles.loading}>{t('common.loading')}</div>
        ) : stockRiskError ? (
          <div style={styles.errorInSection}>
            <p style={styles.errorText}>{stockRiskError}</p>
            <Button variant="secondary" size="sm" onClick={loadStockRisk}>
              {t('common.retry')}
            </Button>
          </div>
        ) : stockRiskRows.length === 0 ? (
          <div style={styles.empty}>{t('operationsPlanning.stockRisk.empty')}</div>
        ) : (
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>{t('operationsPlanning.reorder.cols.product')}</th>
                  <th style={styles.th}>{t('operationsPlanning.reorder.cols.units')}</th>
                  <th style={styles.th}>{t('operationsPlanning.stockRisk.cols.daysOfCover')}</th>
                  <th style={styles.th}>{t('operationsPlanning.stockRisk.cols.predicted')}</th>
                  <th style={styles.th}>{t('operationsPlanning.stockRisk.cols.severity')}</th>
                </tr>
              </thead>
              <tbody>
                {stockRiskRows.map((row) => (
                  <tr key={row.asin}>
                    <td style={styles.td}>{row.asin || '—'}</td>
                    <td style={styles.td}>{formatNum(row.currentStock)}</td>
                    <td style={styles.td}>{formatNum(row.daysOfStock)}</td>
                    <td style={styles.td}>{predictedStockoutDate(row.daysOfStock) ?? '—'}</td>
                    <td style={styles.td}>{severityFromDays(row.daysOfStock)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Cash Impact View — D22.5 */}
      <section style={styles.section} aria-labelledby="cash-impact-heading">
        <h2 id="cash-impact-heading" style={styles.sectionTitle}>{t('operationsPlanning.cashImpact.title')}</h2>
        <p style={styles.sectionSubtitle}>{t('operationsPlanning.cashImpact.subtitle')}</p>
        {cashImpactLoading ? (
          <div style={styles.loading}>{t('common.loading')}</div>
        ) : cashImpactError ? (
          <div style={styles.errorInSection}>
            <p style={styles.errorText}>{cashImpactError}</p>
            <Button variant="secondary" size="sm" onClick={loadCashImpact}>
              {t('common.retry')}
            </Button>
          </div>
        ) : cashImpactData.length === 0 ? (
          <div style={styles.empty}>{t('operationsPlanning.cashImpact.empty')}</div>
        ) : (
          <>
            <div style={styles.kpiRow}>
              <div style={styles.kpiBox}>
                <span style={styles.kpiLabel}>{t('operationsPlanning.cashImpact.kpi.today')}</span>
                <span style={styles.kpiValue}>{formatCurrencyEUR(cashImpactData[0]?.cashBalance, i18n.language)}</span>
              </div>
              <div style={styles.kpiBox}>
                <span style={styles.kpiLabel}>{t('operationsPlanning.cashImpact.kpi.in30Days')}</span>
                <span style={styles.kpiValue}>{formatCurrencyEUR(cashImpactData[cashImpactData.length - 1]?.cashBalance, i18n.language)}</span>
              </div>
            </div>
            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>{t('operationsPlanning.cashImpact.cols.date')}</th>
                    <th style={styles.th}>{t('operationsPlanning.cashImpact.cols.balance')}</th>
                  </tr>
                </thead>
                <tbody>
                  {cashImpactData.map((row) => (
                    <tr key={row.date}>
                      <td style={styles.td}>{formatDateReadable(row.date, i18n.language)}</td>
                      <td style={styles.td}>{formatCurrencyEUR(row.cashBalance, i18n.language)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  )
}

const styles = {
  page: {
    padding: '1.5rem 1.5rem 2rem',
    maxWidth: 1400,
    margin: '0 auto',
  },
  header: {
    marginBottom: '1.5rem',
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: 700,
    color: 'var(--text-1, #111827)',
    margin: 0,
  },
  subtitle: {
    fontSize: '0.9375rem',
    color: 'var(--text-secondary, #6b7280)',
    margin: '0.25rem 0 0',
  },
  section: {
    marginBottom: '2rem',
  },
  sectionTitle: {
    fontSize: '1.125rem',
    fontWeight: 600,
    color: 'var(--text-1, #111827)',
    margin: '0 0 0.25rem',
  },
  sectionSubtitle: {
    fontSize: '0.875rem',
    color: 'var(--text-secondary, #6b7280)',
    margin: '0 0 1rem',
  },
  kpiRow: {
    display: 'flex',
    gap: '1.5rem',
    marginBottom: '1rem',
    flexWrap: 'wrap',
  },
  kpiBox: {
    display: 'flex',
    flexDirection: 'column',
    padding: '1rem 1.25rem',
    border: '1px solid var(--border-color, #e5e7eb)',
    borderRadius: 8,
    background: 'var(--card-bg, #fff)',
    minWidth: 140,
  },
  kpiLabel: {
    fontSize: '0.75rem',
    color: 'var(--text-secondary, #6b7280)',
    marginBottom: '0.25rem',
  },
  kpiValue: {
    fontSize: '1.125rem',
    fontWeight: 600,
    color: 'var(--text-1, #111827)',
  },
  loading: {
    padding: '2rem',
    color: 'var(--text-secondary, #6b7280)',
  },
  errorWrap: {
    padding: '2rem',
    textAlign: 'center',
  },
  errorInSection: {
    padding: '1.5rem',
    textAlign: 'center',
    border: '1px solid var(--border-color, #e5e7eb)',
    borderRadius: 8,
    background: 'var(--card-bg, #fff)',
  },
  errorText: {
    color: 'var(--text-secondary, #6b7280)',
    marginBottom: '1rem',
  },
  empty: {
    padding: '2rem',
    color: 'var(--text-secondary, #6b7280)',
  },
  tableWrap: {
    overflowX: 'auto',
    border: '1px solid var(--border-color, #e5e7eb)',
    borderRadius: 8,
    background: 'var(--card-bg, #fff)',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '0.875rem',
  },
  th: {
    textAlign: 'left',
    padding: '0.75rem 1rem',
    fontWeight: 600,
    color: 'var(--text-1, #111827)',
    borderBottom: '1px solid var(--border-color, #e5e7eb)',
    whiteSpace: 'nowrap',
  },
  td: {
    padding: '0.75rem 1rem',
    borderBottom: '1px solid var(--border-color, #e5e7eb)',
    color: 'var(--text-1, #111827)',
  },
}
