/**
 * D11.8 Slice 5 — UX banner when usage is at or over plan limit.
 * Informational only; real enforcement stays in guards / gating engine.
 */
import Button from '../ui/Button'

const TEXTS = {
  projects: {
    title: 'Projects',
    message: 'You reached the limit of projects.',
    cta: 'Upgrade your plan to create more projects.',
  },
  seats: {
    title: 'Seats',
    message: 'Your workspace exceeded the seat limit.',
    cta: 'Upgrade your plan to add more team members.',
  },
}

/**
 * @param {object} props
 * @param {'projects' | 'seats'} props.resource
 * @param {number} props.used
 * @param {number | null} props.limit
 * @param {() => void} props.onUpgrade
 * @param {boolean} [props.upgradeDisabled]
 */
export default function LimitReachedBanner({ resource, used, limit, onUpgrade, upgradeDisabled = false }) {
  if (limit == null || used < limit) return null

  const { title, message, cta } = TEXTS[resource] || TEXTS.projects

  return (
    <div
      role="alert"
      style={{
        padding: '14px 16px',
        border: '1px solid var(--border)',
        borderRadius: 8,
        background: 'var(--warning-bg, #fffbeb)',
        marginBottom: 12,
      }}
    >
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{title}</div>
      <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: '0 0 10px 0', lineHeight: 1.4 }}>{message}</p>
      <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: '0 0 12px 0', lineHeight: 1.4 }}>{cta}</p>
      <Button variant="primary" size="sm" onClick={onUpgrade} disabled={upgradeDisabled}>
        Upgrade
      </Button>
    </div>
  )
}
