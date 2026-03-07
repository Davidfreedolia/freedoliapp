/**
 * D13 Slice 4 + Slice 6 — Vista de profit per producte i tendència de benefici.
 * D14 Slice 3 — Alertes de compressió de marge (getMarginCompressionAlerts).
 * Taula prové de getWorkspaceProfit(); gràfic de getProfitTimeseries(); alertes de getMarginCompressionAlerts().
 * No es recalcula ni es dupliquen fórmules al frontend.
 */
import { useState, useEffect, useCallback } from 'react'
import { DollarSign, AlertCircle, RefreshCw, TrendingUp, AlertTriangle } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { supabase } from '../lib/supabase'
import { getOrgEntitlements, hasOrgFeature } from '../lib/billing/entitlements'
import { getWorkspaceProfit } from '../lib/profit/getWorkspaceProfit'
import { getProfitTimeseries } from '../lib/profit/getProfitTimeseries'
import { getMarginCompressionAlerts } from '../lib/profit/getMarginCompressionAlerts'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'
import Header from '../components/Header'
import Button from '../components/Button'
import AppToolbar from '../components/ui/AppToolbar'

function defaultDateRange() {
  const to = new Date()
  const from = new Date()
  from.setDate(from.getDate() - 30)
  return {
    dateFrom: from.toISOString().split('T')[0],
    dateTo: to.toISOString().split('T')[0],
  }
}

const formatCurrency = (amount, currency = 'EUR') =>
  new Intl.NumberFormat('ca-ES', { style: 'currency', currency }).format(amount ?? 0)

const formatPercent = (ratio) =>
  Number.isFinite(ratio) ? new Intl.NumberFormat('ca-ES', { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(ratio) : '—'

export default function Profit() {
  const { darkMode, activeOrgId } = useApp()
  const defaults = defaultDateRange()
  const [dateFrom, setDateFrom] = useState(defaults.dateFrom)
  const [dateTo, setDateTo] = useState(defaults.dateTo)
  const [marketplace, setMarketplace] = useState('')
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [profitBlocked, setProfitBlocked] = useState(false)
  const [trendData, setTrendData] = useState([])
  const [trendLoading, setTrendLoading] = useState(false)
  const [trendError, setTrendError] = useState(null)
  const [selectedAsin, setSelectedAsin] = useState(null)
  const [marginAlerts, setMarginAlerts] = useState([])
  const [marginAlertsLoading, setMarginAlertsLoading] = useState(false)
  const [marginAlertsError, setMarginAlertsError] = useState(null)

  useEffect(() => {
    if (!activeOrgId) {
      setLoading(false)
      return
    }
    let cancelled = false
    getOrgEntitlements(supabase, activeOrgId)
      .then((entitlements) => {
        if (!cancelled && !hasOrgFeature(entitlements, 'profit_engine')) setProfitBlocked(true)
      })
      .catch(() => {
        if (!cancelled) setProfitBlocked(true)
      })
    return () => { cancelled = true }
  }, [activeOrgId])

  const loadData = useCallback(async () => {
    if (!activeOrgId || profitBlocked) return
    setLoading(true)
    setError(null)
    try {
      const options = { dateFrom, dateTo }
      if (marketplace) options.marketplace = marketplace
      const data = await getWorkspaceProfit(supabase, activeOrgId, options)
      setRows(data || [])
    } catch (err) {
      setError(err?.message ?? 'Error carregant profit.')
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [activeOrgId, profitBlocked, dateFrom, dateTo, marketplace])

  const loadTrendData = useCallback(async () => {
    if (!activeOrgId || profitBlocked || !dateFrom || !dateTo) return
    setTrendLoading(true)
    setTrendError(null)
    try {
      const options = { dateFrom, dateTo }
      if (marketplace) options.marketplace = marketplace
      if (selectedAsin) options.asin = selectedAsin
      const data = await getProfitTimeseries(supabase, activeOrgId, options)
      setTrendData(data || [])
    } catch (err) {
      setTrendError(err?.message ?? 'Error carregant tendència.')
      setTrendData([])
    } finally {
      setTrendLoading(false)
    }
  }, [activeOrgId, profitBlocked, dateFrom, dateTo, marketplace, selectedAsin])

  const loadMarginAlerts = useCallback(async () => {
    if (!activeOrgId || profitBlocked) return
    setMarginAlertsLoading(true)
    setMarginAlertsError(null)
    try {
      const options = { lookbackDays: 30, recentDays: 7 }
      if (marketplace) options.marketplace = marketplace
      const data = await getMarginCompressionAlerts(supabase, activeOrgId, options)
      setMarginAlerts(data || [])
    } catch (err) {
      setMarginAlertsError(err?.message ?? 'Error carregant alertes.')
      setMarginAlerts([])
    } finally {
      setMarginAlertsLoading(false)
    }
  }, [activeOrgId, profitBlocked, marketplace])

  useEffect(() => {
    if (!activeOrgId || profitBlocked) return
    loadData()
  }, [activeOrgId, profitBlocked, loadData])

  useEffect(() => {
    if (!activeOrgId || profitBlocked) return
    loadTrendData()
  }, [activeOrgId, profitBlocked, loadTrendData])

  useEffect(() => {
    if (!activeOrgId || profitBlocked) return
    loadMarginAlerts()
  }, [activeOrgId, profitBlocked, loadMarginAlerts])

  if (profitBlocked) {
    return (
      <div style={styles.container}>
        <Header
          title={
            <span className="page-title-with-icon">
              <DollarSign size={22} />
              Profit
            </span>
          }
        />
        <div style={styles.content}>
          <div style={{ ...styles.errorContainer, padding: '2rem', textAlign: 'center' }}>
            <AlertCircle size={32} color="#f59e0b" />
            <h3 style={{ color: darkMode ? '#ffffff' : '#111827', margin: '12px 0' }}>Profit no disponible</h3>
            <p style={{ color: '#6b7280' }}>Aquesta funcionalitat no està inclosa al teu pla. Fes upgrade per accedir.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      <Header
        title={
          <span className="page-title-with-icon">
            <DollarSign size={22} />
            Profit
          </span>
        }
      />
      <div style={styles.content}>
        <AppToolbar style={styles.toolbar} className="toolbar-row">
          <AppToolbar.Left>
            <div className="toolbar-group" style={styles.filtersRow}>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                style={styles.input}
                title="Data des de"
              />
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                style={styles.input}
                title="Data fins a"
              />
              <input
                type="text"
                value={marketplace}
                onChange={(e) => setMarketplace(e.target.value)}
                placeholder="Marketplace (opcional)"
                style={styles.input}
              />
            </div>
          </AppToolbar.Left>
          <AppToolbar.Right>
            <Button variant="secondary" size="sm" onClick={() => { loadData(); loadTrendData(); loadMarginAlerts(); }} style={styles.refreshBtn} title="Actualitzar">
              <RefreshCw size={18} />
            </Button>
          </AppToolbar.Right>
        </AppToolbar>

        <section style={styles.marginAlertsSection} aria-labelledby="margin-alerts-heading">
          <h2 id="margin-alerts-heading" style={styles.marginAlertsTitle}>
            <AlertTriangle size={20} style={{ color: 'var(--margin-alert-coral, #e07a5f)' }} />
            Margin alerts
          </h2>
          {marginAlertsLoading ? (
            <div style={styles.marginAlertsLoading}>Carregant alertes...</div>
          ) : marginAlertsError ? (
            <div style={styles.marginAlertsError}>
              <AlertCircle size={18} color="#ef4444" />
              <span>{marginAlertsError}</span>
            </div>
          ) : marginAlerts.length === 0 ? (
            <div style={styles.marginAlertsEmpty}>No margin compression detected.</div>
          ) : (
            <div style={styles.marginAlertsWrap}>
              <table style={styles.marginAlertsTable}>
                <thead>
                  <tr>
                    <th style={styles.marginAlertsTh}>ASIN</th>
                    <th style={styles.marginAlertsThR}>Margin last 30 days</th>
                    <th style={styles.marginAlertsThR}>Margin last 7 days</th>
                    <th style={styles.marginAlertsThR}>Margin drop</th>
                  </tr>
                </thead>
                <tbody>
                  {marginAlerts.map((alert) => (
                    <tr key={alert.asin}>
                      <td style={styles.marginAlertsTd}>{alert.asin}</td>
                      <td style={styles.marginAlertsTdR}>{formatPercent(alert.averageMarginLookback)}</td>
                      <td style={styles.marginAlertsTdR}>{formatPercent(alert.averageMarginRecent)}</td>
                      <td style={styles.marginAlertsTdR}>{formatPercent(alert.marginDrop)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section style={styles.trendSection} aria-labelledby="profit-trend-heading">
          <h2 id="profit-trend-heading" style={styles.trendTitle}>
            <TrendingUp size={20} />
            Profit trend
          </h2>
          {trendLoading ? (
            <div style={styles.trendLoading}>Carregant tendència...</div>
          ) : trendError ? (
            <div style={styles.trendError}>
              <AlertCircle size={20} color="#ef4444" />
              <span>{trendError}</span>
              <Button variant="secondary" size="sm" onClick={loadTrendData}>Tornar a intentar</Button>
            </div>
          ) : trendData.length === 0 ? (
            <div style={styles.trendEmpty}>Sense dades de tendència per al rang de dates.</div>
          ) : (
            <div style={styles.chartWrap}>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={trendData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                  <XAxis dataKey="date" tick={{ fontSize: 12, fill: 'var(--text-2)' }} />
                  <YAxis tick={{ fontSize: 12, fill: 'var(--text-2)' }} tickFormatter={(v) => formatCurrency(v).replace(/\s/g, '')} />
                  <Tooltip formatter={(v) => formatCurrency(v)} labelFormatter={(label) => label} />
                  <Line type="monotone" dataKey="netProfit" name="Net Profit" stroke="var(--color-primary, #2563eb)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        {loading ? (
          <div style={styles.loading}>Carregant profit...</div>
        ) : error ? (
          <div style={styles.errorContainer}>
            <AlertCircle size={24} color="#ef4444" />
            <h3 style={{ color: darkMode ? '#ffffff' : '#111827', margin: '8px 0' }}>Error carregant dades</h3>
            <p style={{ color: '#6b7280', marginBottom: '16px' }}>{error}</p>
            <Button variant="primary" size="sm" onClick={loadData} style={styles.retryButton}>
              <RefreshCw size={16} />
              Tornar a intentar
            </Button>
          </div>
        ) : (
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>ASIN</th>
                  <th style={styles.thRight}>Revenue</th>
                  <th style={styles.thRight}>Net Profit</th>
                  <th style={styles.thRight}>Margin</th>
                  <th style={styles.thRight}>ROI</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={styles.emptyCell}>Cap producte amb ASIN al workspace o sense dades en el rang de dates.</td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.asin}>
                      <td style={styles.td}>{row.asin}</td>
                      <td style={styles.tdRight}>{formatCurrency(row.revenue)}</td>
                      <td style={styles.tdRight}>{formatCurrency(row.netProfit)}</td>
                      <td style={styles.tdRight}>{formatPercent(row.margin)}</td>
                      <td style={styles.tdRight}>{formatPercent(row.roi)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

const styles = {
  container: { flex: 1, display: 'flex', flexDirection: 'column' },
  content: { padding: '32px', overflowY: 'auto' },
  toolbar: { display: 'flex', marginBottom: '24px' },
  filtersRow: { display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' },
  input: {
    height: 'var(--btn-h-sm)',
    padding: '0 12px',
    borderRadius: 'var(--btn-radius)',
    border: '1px solid var(--btn-secondary-border)',
    backgroundColor: 'var(--btn-ghost-bg)',
    color: 'var(--btn-secondary-fg)',
    fontSize: '14px',
    outline: 'none',
    boxShadow: 'var(--btn-shadow)',
  },
  refreshBtn: { padding: '0', width: 'var(--btn-h-sm)', minWidth: 'var(--btn-h-sm)' },
  loading: { padding: '64px', textAlign: 'center', color: '#6b7280' },
  errorContainer: { padding: '64px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' },
  retryButton: { minWidth: '160px' },
  tableWrap: { overflowX: 'auto', border: '1px solid var(--border-color)', borderRadius: 'var(--btn-radius)' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '14px' },
  th: { textAlign: 'left', padding: '12px 16px', borderBottom: '1px solid var(--border-color)', fontWeight: 600, color: 'var(--text-1)' },
  thRight: { textAlign: 'right', padding: '12px 16px', borderBottom: '1px solid var(--border-color)', fontWeight: 600, color: 'var(--text-1)' },
  td: { padding: '12px 16px', borderBottom: '1px solid var(--border-color)', color: 'var(--text-1)' },
  tdRight: { textAlign: 'right', padding: '12px 16px', borderBottom: '1px solid var(--border-color)', color: 'var(--text-1)' },
  emptyCell: { padding: '24px', textAlign: 'center', color: '#6b7280' },
  trendSection: { marginBottom: '32px' },
  trendTitle: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '18px', fontWeight: 600, color: 'var(--text-1)', marginBottom: '16px' },
  trendLoading: { padding: '32px', textAlign: 'center', color: '#6b7280' },
  trendError: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '32px', textAlign: 'center', color: '#6b7280' },
  trendEmpty: { padding: '32px', textAlign: 'center', color: '#6b7280' },
  chartWrap: { width: '100%', border: '1px solid var(--border-color)', borderRadius: 'var(--btn-radius)', padding: '16px', backgroundColor: 'var(--surface-1, #fff)' },
  marginAlertsSection: { marginBottom: '32px' },
  marginAlertsTitle: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px', fontWeight: 600, color: 'var(--margin-alert-coral, #e07a5f)', marginBottom: '12px' },
  marginAlertsLoading: { padding: '16px', textAlign: 'center', color: '#6b7280', fontSize: '14px' },
  marginAlertsError: { display: 'flex', alignItems: 'center', gap: '8px', padding: '16px', fontSize: '14px', color: '#ef4444' },
  marginAlertsEmpty: { padding: '16px', fontSize: '14px', color: '#6b7280', border: '1px solid var(--border-color)', borderRadius: 'var(--btn-radius)', backgroundColor: 'var(--surface-1, #fff)' },
  marginAlertsWrap: { border: '1px solid var(--margin-alert-coral, #e07a5f)', borderRadius: 'var(--btn-radius)', overflow: 'hidden', backgroundColor: 'rgba(224, 122, 95, 0.06)' },
  marginAlertsTable: { width: '100%', borderCollapse: 'collapse', fontSize: '13px' },
  marginAlertsTh: { textAlign: 'left', padding: '8px 12px', borderBottom: '1px solid rgba(224, 122, 95, 0.3)', fontWeight: 600, color: 'var(--margin-alert-coral, #e07a5f)' },
  marginAlertsThR: { textAlign: 'right', padding: '8px 12px', borderBottom: '1px solid rgba(224, 122, 95, 0.3)', fontWeight: 600, color: 'var(--margin-alert-coral, #e07a5f)' },
  marginAlertsTd: { padding: '8px 12px', borderBottom: '1px solid rgba(224, 122, 95, 0.2)', color: 'var(--text-1)' },
  marginAlertsTdR: { textAlign: 'right', padding: '8px 12px', borderBottom: '1px solid rgba(224, 122, 95, 0.2)', color: 'var(--text-1)' },
}
