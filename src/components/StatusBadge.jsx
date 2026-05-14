import { useTranslation } from 'react-i18next'

// Tonal palette aligned with brand tokens.
// Text uses AA-compliant darker shades of the brand color over the soft bg.
// rgba uses the same RGB triples as --brand-1, --success-1, --warning-1, --danger-1.
const STATUS_TONES = {
  info:    { bg: 'rgba(31, 95, 99, 0.10)',   text: 'var(--brand-1)',          border: 'rgba(31, 95, 99, 0.22)' },
  success: { bg: 'rgba(63, 191, 154, 0.14)', text: 'var(--success-ink, #2B7A66)', border: 'rgba(63, 191, 154, 0.32)' },
  warning: { bg: 'rgba(240, 180, 41, 0.18)', text: 'var(--warning-ink, #7A5F22)', border: 'rgba(240, 180, 41, 0.40)' },
  error:   { bg: 'rgba(229, 83, 83, 0.12)',  text: 'var(--danger-ink, #B0413F)',  border: 'rgba(229, 83, 83, 0.32)' }
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

const getLabel = ({ status, decision, t }) => {
  if (decision === 'DISCARDED') return t('statusBadge.blocked')
  if (!status) return t('statusBadge.info')
  return String(status).replace(/_/g, ' ')
}

export default function StatusBadge({ status, decision, tone }) {
  const { t } = useTranslation()
  const resolvedTone = tone || getTone({ status, decision })
  const palette = STATUS_TONES[resolvedTone] || STATUS_TONES.info

  return (
    <span
      style={{
        ...styles.badge,
        backgroundColor: palette.bg,
        color: palette.text,
        border: `1px solid ${palette.border}`
      }}
    >
      {getLabel({ status, decision, t })}
    </span>
  )
}

const styles = {
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '3px 10px',
    borderRadius: '999px',
    fontSize: '11.5px',
    fontWeight: '600',
    letterSpacing: '0.01em',
    textTransform: 'capitalize',
    lineHeight: 1.4
  }
}
