import { CheckCircle2, Lock, Circle } from 'lucide-react'
import { PHASE_META } from '../../utils/phaseStyles'

/**
 * Vertical phase pipeline shown on the left of ProjectDetail.
 *
 * Props:
 * - currentPhase {1..7}: the project's current phase id.
 * - activePhase {1..7}: which card is selected/visible in the right panel.
 * - completedPhases {Set<number> | number[]}: phases marked completed.
 * - onSelect(phaseId): called when the user clicks a phase card.
 * - onLockedAttempt(targetPhaseId, currentPhaseId): called when user clicks a
 *   future phase that hasn't been unlocked yet.
 */
export default function PhasePanel({
  currentPhase = 1,
  activePhase = 1,
  completedPhases = new Set(),
  onSelect = () => {},
  onLockedAttempt = () => {}
}) {
  const completed = completedPhases instanceof Set
    ? completedPhases
    : new Set(completedPhases || [])

  const isCompleted = (id) => completed.has(id) || id < currentPhase
  const isCurrent = (id) => id === currentPhase
  const isLocked = (id) => id > currentPhase

  return (
    <aside
      aria-label="Pipeline de fases"
      style={{
        background: 'var(--surface-bg)',
        border: '1px solid var(--border-1)',
        borderRadius: 12,
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        position: 'sticky',
        top: 88,
        maxHeight: 'calc(100vh - 110px)',
        overflowY: 'auto'
      }}
    >
      <div style={{
        fontSize: 11,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: 0.6,
        color: 'var(--text-2)',
        marginBottom: 4,
        paddingLeft: 6
      }}>
        Pipeline
      </div>
      {Object.values(PHASE_META).map((meta) => {
        const Icon = meta.icon
        const completedFlag = isCompleted(meta.id)
        const currentFlag = isCurrent(meta.id)
        const lockedFlag = isLocked(meta.id)
        const selected = meta.id === activePhase

        const handleClick = () => {
          if (lockedFlag) {
            onLockedAttempt(meta.id, currentPhase)
            return
          }
          onSelect(meta.id)
        }

        const borderColor = selected
          ? 'var(--accent-primary, #3b82f6)'
          : 'var(--border-1)'
        const bg = selected
          ? 'var(--surface-bg-2)'
          : 'transparent'

        return (
          <button
            key={meta.id}
            type="button"
            onClick={handleClick}
            aria-current={selected ? 'step' : undefined}
            aria-disabled={lockedFlag}
            title={lockedFlag ? `Bloquejat — completa primer la fase ${currentPhase}` : meta.description}
            style={{
              all: 'unset',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 12,
              padding: 12,
              borderRadius: 10,
              border: `1.5px solid ${borderColor}`,
              background: bg,
              cursor: lockedFlag ? 'not-allowed' : 'pointer',
              opacity: lockedFlag ? 0.55 : 1,
              transition: 'background 120ms, border 120ms'
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: completedFlag
                  ? 'var(--success-bg, #10b98122)'
                  : currentFlag
                  ? 'var(--accent-bg, #3b82f622)'
                  : 'var(--surface-bg-2)',
                color: completedFlag
                  ? 'var(--success, #10b981)'
                  : currentFlag
                  ? 'var(--accent-primary, #3b82f6)'
                  : 'var(--text-2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              {completedFlag ? <CheckCircle2 size={18} /> : lockedFlag ? <Lock size={16} /> : <Icon size={18} />}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 11,
                color: 'var(--text-2)',
                fontWeight: 600,
                marginBottom: 2
              }}>
                <span>FASE {meta.id}</span>
                {completedFlag && <span style={{ color: 'var(--success, #10b981)' }}>· Completada</span>}
                {currentFlag && !completedFlag && <span style={{ color: 'var(--accent-primary, #3b82f6)' }}>· Actual</span>}
                {lockedFlag && <span>· Bloquejada</span>}
              </div>
              <div style={{
                fontSize: 14,
                fontWeight: 600,
                color: 'var(--text-1)',
                lineHeight: 1.25,
                marginBottom: 2
              }}>
                {meta.label}
              </div>
              <div style={{
                fontSize: 12,
                color: 'var(--text-2)',
                lineHeight: 1.35
              }}>
                {meta.description}
              </div>
            </div>
            {!completedFlag && !lockedFlag && !currentFlag && (
              <Circle size={16} style={{ color: 'var(--text-2)', flexShrink: 0, marginTop: 6 }} />
            )}
          </button>
        )
      })}
    </aside>
  )
}
