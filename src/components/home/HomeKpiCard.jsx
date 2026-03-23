/**
 * D21.4 — KPI card per la Home.
 * Reutilitza tokens existents; sense design system paral·lel.
 */
export default function HomeKpiCard({ title, value, loading }) {
  const displayValue = loading ? '…' : (value ?? '—')
  return (
    <div className="dashboard-home-card dashboard-home-card--kpi">
      <div className="dashboard-home-card__eyebrow">{title}</div>
      <div className="dashboard-home-card__value">{displayValue}</div>
    </div>
  )
}
