/**
 * D21.6 — Active sourcing projects per la Home.
 * Dades reals de projects.active del composador (useProjectsListState + filterActiveProjects).
 * Màxim 5; nom, status, metadada útil (updated_at).
 */
const MAX_ITEMS = 5

function formatDate(v) {
  if (!v) return null
  try {
    return new Date(v).toLocaleDateString('ca-ES', { day: 'numeric', month: 'short' })
  } catch {
    return null
  }
}

export default function HomeActiveProjects({ projects = [], loading }) {
  const list = Array.isArray(projects) ? projects.slice(0, MAX_ITEMS) : []

  if (loading) {
    return (
      <div style={styles.wrap}>
        <div style={styles.title}>Active sourcing projects</div>
        <div style={styles.placeholder}>Carregant…</div>
      </div>
    )
  }

  if (list.length === 0) {
    return (
      <div style={styles.wrap}>
        <div style={styles.title}>Active sourcing projects</div>
        <div style={styles.placeholder}>No hi ha projectes actius.</div>
      </div>
    )
  }

  return (
    <div style={styles.wrap}>
      <div style={styles.title}>Active sourcing projects</div>
      <ul style={styles.list}>
        {list.map((p) => (
          <li key={p.id} style={styles.row}>
            <div style={styles.name}>{p.name || '—'}</div>
            <div style={styles.meta}>
              {p.status != null && p.status !== '' && <span style={styles.status}>{p.status}</span>}
              {formatDate(p.updated_at) && (
                <span style={styles.date}>{formatDate(p.updated_at)}</span>
              )}
            </div>
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
    padding: '6px 0',
    borderBottom: '1px solid var(--border-color, #e5e7eb)',
  },
  name: { fontSize: '0.8125rem', fontWeight: 500, color: 'var(--text-1)' },
  meta: { display: 'flex', gap: 8, marginTop: 2, fontSize: '0.75rem', color: 'var(--text-2, #6b7280)' },
  status: {},
  date: {},
  placeholder: { fontSize: '0.875rem', color: 'var(--text-2, #6b7280)' },
}
