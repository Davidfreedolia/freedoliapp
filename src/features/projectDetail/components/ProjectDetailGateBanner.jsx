/**
 * Gate warning/blocked banner shown when commercial gate is warning or blocked.
 */
export default function ProjectDetailGateBanner({ gate, darkMode }) {
  if (!gate || gate.gateId === 'NONE' || (gate.status !== 'warning' && gate.status !== 'blocked')) {
    return null
  }
  return (
    <div
      className={`project-detail-gate project-detail-gate--${gate.tone === 'danger' ? 'danger' : 'warn'}`}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        padding: '10px 14px',
        marginBottom: 8,
        borderRadius: 'var(--radius-ui)',
        border: '1px solid var(--border-1)',
        background: 'var(--surface-bg-2)',
        color: gate.tone === 'danger' ? 'var(--danger-1)' : 'var(--warning-1)'
      }}
    >
      <span className="project-detail-gate__icon" style={{ fontSize: 18 }} aria-hidden>{gate.status === 'blocked' ? '🔒' : '⚠'}</span>
      <div className="project-detail-gate__copy" style={{ flex: 1, minWidth: 0 }}>
        <div className="project-detail-gate__title" style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>
          {gate.gateId} {gate.label}
        </div>
        {gate.reasons && gate.reasons.length > 0 && (
          <ul className="project-detail-gate__list" style={{ margin: 0, paddingLeft: 18, fontSize: 12, opacity: 0.9 }}>
            {gate.reasons.slice(0, 4).map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
