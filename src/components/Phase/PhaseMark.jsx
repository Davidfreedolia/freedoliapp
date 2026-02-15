import { getPhaseMeta } from '../../utils/phaseStyles'

export default function PhaseMark({ phaseId, size = 16, showLabel = true, className = '' }) {
  const meta = getPhaseMeta(phaseId)
  const Icon = meta.icon

  return (
    <span className={`phase-mark ${className}`.trim()}>
      <span className="phase-mark__icon" style={{ color: meta.color }}>
        <Icon size={size} />
      </span>
      {showLabel ? (
        <span className="phase-mark__label" style={{ color: meta.color }} title={meta.label}>
          {meta.label}
        </span>
      ) : null}
    </span>
  )
}
