/**
 * D17 Slice 3 — Cashflow UI.
 * Dades de getCashflowForecast(supabase, activeOrgId, { forecastDays: 30 }).
 * KPIs: Cash today, Cash in 30 days. Gràfic: cashBalance per date.
 * No es recalcula res al frontend.
 */
import { useState, useEffect, useCallback } from 'react'
import { Wallet, AlertCircle, RefreshCw } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { supabase } from '../lib/supabase'
import { getCashflowForecast } from '../lib/finance/getCashflowForecast'
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
import { DataState } from '../components/dataStates'
import { useTranslation } from 'react-i18next'

const formatCurrency = (amount, currency = 'EUR') =>
  new Intl.NumberFormat('ca-ES', { style: 'currency', currency }).format(amount ?? 0)

const styles = {
  container: { minHeight: '100vh', display: 'flex', flexDirection: 'column' },
  content: { flex: 1, padding: '1rem 1.5rem', maxWidth: 960, margin: '0 auto', width: '100%' },
  kpiRow: { display: 'flex', gap: '1.5rem', flexWrap: 'wrap', marginBottom: '1.5rem' },
  kpiCard: {
    flex: '1 1 200px',
    minWidth: 160,
    padding: '1rem 1.25rem',
    borderRadius: 8,
    background: 'var(--card-bg, #f9fafb)',
    border: '1px solid var(--border-color, #e5e7eb)',
  },
  kpiLabel: { fontSize: '0.875rem', color: 'var(--text-2, #6b7280)', marginBottom: 4 },
  kpiValue: { fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-1, #111827)' },
  chartSection: { marginTop: '1rem' },
  chartTitle: { fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--text-1)' },
  chartWrap: { width: '100%', height: 280, marginTop: 8 },
  loading: { padding: '2rem', textAlign: 'center', color: 'var(--text-2)' },
  errorContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem',
    textAlign: 'center',
    gap: 12,
  },
  empty: { padding: '2rem', textAlign: 'center', color: 'var(--text-2)' },
}

export default function Cashflow() {
  const { t } = useTranslation()
  const { darkMode, activeOrgId } = useApp()
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const loadData = useCallback(async () => {
    if (!activeOrgId) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const result = await getCashflowForecast(supabase, activeOrgId, { forecastDays: 30 })
      setData(Array.isArray(result) ? result : [])
    } catch (err) {
      setError(err?.message ?? 'Error carregant forecast.')
      setData([])
    } finally {
      setLoading(false)
    }
  }, [activeOrgId])

  useEffect(() => {
    loadData()
  }, [loadData])

  const cashToday = data.length > 0 ? data[0].cashBalance : null
  const cashIn30 = data.length > 0 ? data[data.length - 1].cashBalance : null

  return (
    <div style={styles.container}>
      <Header
        title={
          <span className="page-title-with-icon">
            <Wallet size={22} />
            Cashflow
          </span>
        }
      />
      <div style={styles.content}>
        <DataState
          loading={loading}
          error={error}
          isEmpty={data.length === 0}
          loadingMessage={t('dataStates.loading', { defaultValue: 'Loading data…' })}
          errorMessage={error}
          emptyMessage={t('dataStates.emptyCashflow', { defaultValue: 'No forecast data. Connect data to see cashflow.' })}
          onRetry={loadData}
        >
          <>
            <div style={styles.kpiRow}>
              <div style={styles.kpiCard}>
                <div style={styles.kpiLabel}>Cash today</div>
                <div style={styles.kpiValue}>{formatCurrency(cashToday)}</div>
              </div>
              <div style={styles.kpiCard}>
                <div style={styles.kpiLabel}>Cash in 30 days</div>
                <div style={styles.kpiValue}>{formatCurrency(cashIn30)}</div>
              </div>
            </div>

            <section style={styles.chartSection} aria-labelledby="cashflow-chart-heading">
              <h2 id="cashflow-chart-heading" style={styles.chartTitle}>
                Forecast de caixa
              </h2>
              <div style={styles.chartWrap}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                    <XAxis dataKey="date" tick={{ fontSize: 12, fill: 'var(--text-2)' }} />
                    <YAxis
                      tick={{ fontSize: 12, fill: 'var(--text-2)' }}
                      tickFormatter={(v) => formatCurrency(v).replace(/\s/g, '')}
                    />
                    <Tooltip
                      formatter={(v) => formatCurrency(v)}
                      labelFormatter={(label) => label}
                    />
                    <Line
                      type="monotone"
                      dataKey="cashBalance"
                      name="Caixa"
                      stroke="var(--color-primary, #2563eb)"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </section>
          </>
        </DataState>
      </div>
    </div>
  )
}
