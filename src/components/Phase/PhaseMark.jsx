import { getPhaseMeta } from '../../utils/phaseStyles'

export default function PhaseMark({ phaseId, size = 18, showLabel = true, className = '' }) {
  const meta = getPhaseMeta(phaseId)
  const Icon = meta.icon

  return (
    <span className={`phase-title ${className}`.trim()}>
      <span className="phase-title__icon" style={{ color: meta.color }}>
        <Icon size={size} />
      </span>
      {showLabel ? (
        <span className="phase-title__text" style={{ color: meta.color }} title={meta.label}>
          {meta.label}
        </span>
      ) : null}
    </span>
  )
}
