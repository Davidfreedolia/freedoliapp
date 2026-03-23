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
import { useTranslation } from 'react-i18next'

const formatCurrency = (amount) =>
  (amount != null && Number.isFinite(amount))
    ? new Intl.NumberFormat('ca-ES', { style: 'currency', currency: 'EUR' }).format(amount)
    : '—'

export default function HomeProfitTrend({ data = [], loading }) {
  const { t } = useTranslation()
  const list = Array.isArray(data) ? data : []

  if (loading) {
    return (
      <div className="dashboard-home-card dashboard-home-card--chart">
        <div className="dashboard-home-card__title">{t('home.profitTrend.title')}</div>
        <div className="dashboard-home-card__placeholder dashboard-home-card__placeholder--chart">{t('common.loading')}</div>
      </div>
    )
  }

  if (list.length === 0) {
    return (
      <div className="dashboard-home-card dashboard-home-card--chart">
        <div className="dashboard-home-card__title">{t('home.profitTrend.title')}</div>
        <div className="dashboard-home-card__placeholder dashboard-home-card__placeholder--chart">{t('home.profitTrend.empty')}</div>
      </div>
    )
  }

  return (
    <div className="dashboard-home-card dashboard-home-card--chart">
      <div className="dashboard-home-card__title">{t('home.profitTrend.title')}</div>
      <div className="dashboard-home-card__chart">
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
