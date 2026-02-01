const STATUS_TONES = {
  info: { bg: 'rgba(31, 78, 95, 0.12)', text: '#1F4E5F' },
  success: { bg: 'rgba(107, 199, 181, 0.2)', text: '#2C7A6A' },
  warning: { bg: 'rgba(242, 226, 125, 0.35)', text: '#7A6A2C' },
  error: { bg: 'rgba(242, 108, 99, 0.2)', text: '#B84C44' }
}

const getTone = ({ status, decision }) => {
  if (decision === 'DISCARDED') return 'error'
  if (!status) return 'info'
  const normalized = String(status).toLowerCase()
  if (normalized.includes('blocked') || normalized.includes('error')) return 'error'
  if (['active', 'open'].includes(normalized)) return 'success'
  if (['closed', 'archived', 'paused', 'hold'].includes(normalized)) return 'warning'
  return 'info'
}

const getLabel = ({ status, decision }) => {
  if (decision === 'DISCARDED') return 'Blocked'
  if (!status) return 'Info'
  return String(status).replace(/_/g, ' ')
}

export default function StatusBadge({ status, decision, tone }) {
  const resolvedTone = tone || getTone({ status, decision })
  const palette = STATUS_TONES[resolvedTone] || STATUS_TONES.info

  return (
    <span
      style={{
        ...styles.badge,
        backgroundColor: palette.bg,
        color: palette.text
      }}
    >
      {getLabel({ status, decision })}
    </span>
  )
}

const styles = {
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '4px 10px',
    borderRadius: '999px',
    fontSize: '12px',
    fontWeight: '500',
    letterSpacing: '0.2px',
    textTransform: 'capitalize'
  }
}
