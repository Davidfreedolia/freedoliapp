/**
 * D21.4 — KPI card per la Home.
 * Reutilitza tokens existents; sense design system paral·lel.
 */
export default function HomeKpiCard({ title, value, loading }) {
  const displayValue = loading ? '…' : (value ?? '—')
  return (
    <div
      style={{
        flex: '1 1 180px',
        minWidth: 140,
        padding: '1rem 1.25rem',
        borderRadius: 8,
        background: 'var(--card-bg, #f9fafb)',
        border: '1px solid var(--border-color, #e5e7eb)',
      }}
    >
      <div
        style={{
          fontSize: '0.875rem',
          color: 'var(--text-2, #6b7280)',
          marginBottom: 4,
        }}
      >
        {title}
      </div>
      <div
        style={{
          fontSize: '1.25rem',
          fontWeight: 600,
          color: 'var(--text-1, #111827)',
        }}
      >
        {displayValue}
      </div>
    </div>
  )
}
