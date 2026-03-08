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
      <div style={styles.wrap}>
        <div style={styles.title}>Reorder candidates</div>
        <div style={styles.placeholder}>Carregant…</div>
      </div>
    )
  }

  if (isEmpty) {
    return (
      <div style={styles.wrap}>
        <div style={styles.title}>Reorder candidates</div>
        <div style={styles.placeholder}>No reorder actions needed right now.</div>
      </div>
    )
  }

  return (
    <div style={styles.wrap}>
      <div style={styles.title}>Reorder candidates</div>
      <ul style={styles.list}>
        {candidates.map((row) => (
          <li key={row.asin} style={styles.row}>
            <div style={styles.label}>
              {row.productName && row.productName.trim() ? row.productName.trim() : row.asin || '—'}
            </div>
            <div style={styles.meta}>
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

const styles = {
  wrap: {
    width: '100%',
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
  list: { margin: 0, padding: 0, listStyle: 'none' },
  row: {
    padding: '6px 0',
    borderBottom: '1px solid var(--border-color, #e5e7eb)',
  },
  label: { fontSize: '0.8125rem', fontWeight: 500, color: 'var(--text-1)' },
  meta: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px 12px',
    marginTop: 2,
    fontSize: '0.75rem',
    color: 'var(--text-2, #6b7280)',
  },
  placeholder: { fontSize: '0.875rem', color: 'var(--text-2, #6b7280)' },
}
