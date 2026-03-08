/**
 * D21.5 — Profit trend per la Home.
 * Reutilitza la mateixa shape que /app/profit (getProfitTimeseries): [{ date, netProfit, revenue, margin, roi }].
 * Sense controls ni selector temporal; finestra 30d prové del composador.
 */
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'

const formatCurrency = (amount) =>
  (amount != null && Number.isFinite(amount))
    ? new Intl.NumberFormat('ca-ES', { style: 'currency', currency: 'EUR' }).format(amount)
    : '—'

export default function HomeProfitTrend({ data = [], loading }) {
  const list = Array.isArray(data) ? data : []

  if (loading) {
    return (
      <div style={styles.wrap}>
        <div style={styles.title}>Profit trend (30d)</div>
        <div style={styles.placeholder}>Carregant…</div>
      </div>
    )
  }

  if (list.length === 0) {
    return (
      <div style={styles.wrap}>
        <div style={styles.title}>Profit trend (30d)</div>
        <div style={styles.placeholder}>Sense dades de tendència.</div>
      </div>
    )
  }

  return (
    <div style={styles.wrap}>
      <div style={styles.title}>Profit trend (30d)</div>
      <div style={styles.chartWrap}>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={list} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color, #e5e7eb)" />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--text-2, #6b7280)' }} />
            <YAxis
              tick={{ fontSize: 11, fill: 'var(--text-2, #6b7280)' }}
              tickFormatter={(v) => formatCurrency(v).replace(/\s/g, '')}
            />
            <Tooltip formatter={(v) => formatCurrency(v)} labelFormatter={(label) => label} />
            <Line
              type="monotone"
              dataKey="netProfit"
              name="Net Profit"
              stroke="var(--color-primary, #2563eb)"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

const styles = {
  wrap: {
    flex: '1 1 320px',
    minWidth: 280,
    padding: '1rem 1.25rem',
    borderRadius: 8,
    background: 'var(--card-bg, #f9fafb)',
    border: '1px solid var(--border-color, #e5e7eb)',
  },
  title: {
    fontSize: '0.9375rem',
    fontWeight: 600,
    color: 'var(--text-1, #111827)',
    marginBottom: 10,
  },
  chartWrap: { width: '100%', height: 220 },
  placeholder: {
    height: 220,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.875rem',
    color: 'var(--text-2, #6b7280)',
  },
}
