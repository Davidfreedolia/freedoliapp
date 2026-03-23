/**
 * D19.2 — Widget Reorder candidates a la Home.
 * Consumeix dades del composador (getReorderCandidates); sense càlculs al frontend.
 */
const MAX_ITEMS = 5

function formatDays(value) {
  if (value == null || !Number.isFinite(value)) return '—'
  const n = Number(value)
  if (n < 0) return '—'
  return n <= 1 ? `${n} day` : `${Math.round(n)} days`
}

export default function HomeReorderCandidates({ reorder = {}, loading }) {
  const candidates = Array.isArray(reorder.candidates) ? reorder.candidates.slice(0, MAX_ITEMS) : []
  const isEmpty = candidates.length === 0

  if (loading) {
    return (
      <div className="dashboard-home-card dashboard-home-card--list">
        <div className="dashboard-home-card__title">Reorder candidates</div>
        <div className="dashboard-home-card__placeholder">Carregant…</div>
      </div>
    )
  }

  if (isEmpty) {
    return (
      <div className="dashboard-home-card dashboard-home-card--list">
        <div className="dashboard-home-card__title">Reorder candidates</div>
        <div className="dashboard-home-card__placeholder">No reorder actions needed right now.</div>
      </div>
    )
  }

  return (
    <div className="dashboard-home-card dashboard-home-card--list">
      <div className="dashboard-home-card__title">Reorder candidates</div>
      <ul className="dashboard-home-card__list">
        {candidates.map((row) => (
          <li key={row.asin} className="dashboard-home-card__listRow dashboard-home-card__listRow--stacked">
            <div className="dashboard-home-card__listPrimary">
              {row.productName && row.productName.trim() ? row.productName.trim() : row.asin || '—'}
              {row.confidence === 'low' && (
                <span className="dashboard-home-card__hint" title={Array.isArray(row.issues) ? row.issues.join(', ') : ''}>
                  {' '}(low confidence)
                </span>
              )}
            </div>
            <div className="dashboard-home-card__metaWrap">
              <span title="Suggested reorder units">Reorder: {Number.isFinite(row.reorderUnits) ? row.reorderUnits : '—'}</span>
              <span>Stockout in: {formatDays(row.daysUntilStockout)}</span>
              <span>Stock: {Number.isFinite(row.stockOnHand) ? row.stockOnHand : '—'}</span>
              <span>Incoming: {Number.isFinite(row.incomingUnits) ? row.incomingUnits : '—'}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
