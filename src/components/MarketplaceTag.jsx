const STOCK_DOT = {
  ok: 'var(--success-1)',
  low: 'var(--warning-1)',
  out: 'var(--danger-1)',
  none: 'var(--muted-1)',
}

export function MarketplaceTagGroup({ children, style }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        flexWrap: 'wrap',
        ...style,
      }}
    >
      {children}
    </div>
  )
}

export default function MarketplaceTag({ code, isPrimary = false, stockState = 'none', style }) {
  const state = (stockState || 'none').toString().toLowerCase()
  const dot = STOCK_DOT[state] || STOCK_DOT.none

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 10px',
        borderRadius: '999px',
        border: '1px solid var(--border-1)',
        background: 'var(--surface-bg)',
        color: 'var(--text-1)',
        fontSize: 12,
        lineHeight: 1,
        userSelect: 'none',
        whiteSpace: 'nowrap',
        ...style,
      }}
      title={`Marketplace ${code}${isPrimary ? ' (primary)' : ''} · stock: ${state}`}
    >
      <span
        aria-hidden="true"
        style={{
          width: 8,
          height: 8,
          borderRadius: 999,
          background: dot,
          boxShadow: '0 0 0 2px color-mix(in srgb, var(--surface-bg) 65%, transparent)',
        }}
      />
      <span style={{ fontWeight: 600, letterSpacing: '0.02em' }}>{code || '—'}</span>
      {isPrimary ? (
        <span aria-hidden="true" style={{ opacity: 0.75, fontSize: 12, transform: 'translateY(-0.5px)' }}>
          ★
        </span>
      ) : null}
    </span>
  )
}
