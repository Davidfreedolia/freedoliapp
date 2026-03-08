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
      <div style={styles.wrap}>
        <div style={styles.title}>Top ASINs</div>
        <div style={styles.placeholder}>Carregant…</div>
      </div>
    )
  }

  if (list.length === 0) {
    return (
      <div style={styles.wrap}>
        <div style={styles.title}>Top ASINs</div>
        <div style={styles.placeholder}>No hi ha dades de productes.</div>
      </div>
    )
  }

  return (
    <div style={styles.wrap}>
      <div style={styles.title}>Top ASINs</div>
      <ul style={styles.list}>
        {list.map((row, index) => (
          <li key={row.asin ? `${row.asin}` : `row-${index}`} style={styles.row}>
            <span style={styles.asin}>{row.asin || '—'}</span>
            <span style={styles.profit}>{formatCurrency(row.netProfit)}</span>
            <span style={styles.margin}>{formatPercent(row.margin)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

const styles = {
  wrap: {
    flex: '1 1 280px',
    minWidth: 240,
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
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '6px 0',
    borderBottom: '1px solid var(--border-color, #e5e7eb)',
    fontSize: '0.8125rem',
  },
  asin: { fontWeight: 500, color: 'var(--text-1)', minWidth: 0, flex: '1 1 auto' },
  profit: { color: 'var(--text-1)', flexShrink: 0 },
  margin: { color: 'var(--text-2, #6b7280)', flexShrink: 0 },
  placeholder: {
    fontSize: '0.875rem',
    color: 'var(--text-2, #6b7280)',
  },
}
