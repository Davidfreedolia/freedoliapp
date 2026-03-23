/**
 * D21.5 — Top ASINs per profit a la Home.
 * Dades del composador (getWorkspaceProfit, ja ordenat per netProfit DESC). Màxim 5.
 */
const MAX_ITEMS = 5

const formatCurrency = (amount) =>
  amount != null && Number.isFinite(amount)
    ? new Intl.NumberFormat('ca-ES', { style: 'currency', currency: 'EUR' }).format(amount)
    : '—'

const formatPercent = (ratio) =>
  ratio != null && Number.isFinite(ratio)
    ? new Intl.NumberFormat('ca-ES', { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(ratio)
    : '—'

export default function HomeTopAsins({ items = [], loading }) {
  const list = Array.isArray(items) ? items.slice(0, MAX_ITEMS) : []

  if (loading) {
    return (
      <div className="dashboard-home-card dashboard-home-card--list">
        <div className="dashboard-home-card__title">Top ASINs</div>
        <div className="dashboard-home-card__placeholder">Carregant…</div>
      </div>
    )
  }

  if (list.length === 0) {
    return (
      <div className="dashboard-home-card dashboard-home-card--list">
        <div className="dashboard-home-card__title">Top ASINs</div>
        <div className="dashboard-home-card__placeholder">No hi ha dades de productes.</div>
      </div>
    )
  }

  return (
    <div className="dashboard-home-card dashboard-home-card--list">
      <div className="dashboard-home-card__title">Top ASINs</div>
      <ul className="dashboard-home-card__list">
        {list.map((row, index) => (
          <li key={row.asin ? `${row.asin}` : `row-${index}`} className="dashboard-home-card__listRow">
            <span className="dashboard-home-card__listPrimary">{row.asin || '—'}</span>
            <span className="dashboard-home-card__listValue">{formatCurrency(row.netProfit)}</span>
            <span className="dashboard-home-card__listMeta">{formatPercent(row.margin)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
