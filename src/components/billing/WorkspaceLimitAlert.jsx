/**
 * D12 Slice 4 — Global workspace limit alert (compact, dismissible).
 * Informational only; real enforcement stays in guards.
 * Consumes usage from useWorkspaceUsage(); receives onUpgrade from parent.
 */
import { useState } from 'react'
import { X } from 'lucide-react'
import Button from '../ui/Button'
import useT from '../../hooks/useT'

/**
 * @param {object} props
 * @param {{ projects: { used, limit }, seats: { used, limit } } | null} props.usage
 * @param {() => void} props.onUpgrade
 */
export default function WorkspaceLimitAlert({ usage, onUpgrade }) {
  const t = useT()
  const [dismissedProjects, setDismissedProjects] = useState(false)
  const [dismissedSeats, setDismissedSeats] = useState(false)

  if (!usage) return null

  const projectsReached =
    usage.projects?.limit != null && usage.projects.used >= usage.projects.limit
  const seatsReached =
    usage.seats?.limit != null && usage.seats.used > usage.seats.limit

  const showProjects = projectsReached && !dismissedProjects
  const showSeats = seatsReached && !dismissedSeats

  if (!showProjects && !showSeats) return null

  const bannerStyle = {
    padding: '10px 12px',
    border: '1px solid var(--border)',
    borderRadius: 6,
    background: 'var(--warning-bg, #fffbeb)',
    marginBottom: 8,
    display: 'flex',
    alignItems: 'flex-start',
    gap: 10,
    fontSize: 14,
  }

  return (
    <div style={{ padding: '0 16px 8px', marginTop: 4 }}>
      {showProjects && (
        <div role="alert" style={bannerStyle}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, color: 'var(--text-primary)', fontWeight: 500 }}>
              {t('billing.limits.workspaceAlert.projects.message')}
            </p>
            <p style={{ margin: '4px 0 8px 0', color: 'var(--text-secondary)', lineHeight: 1.35 }}>
              {t('billing.limits.workspaceAlert.projects.cta')}
            </p>
            <Button variant="primary" size="sm" onClick={onUpgrade}>
              {t('billing.limits.upgrade')}
            </Button>
          </div>
          <button
            type="button"
            onClick={() => setDismissedProjects(true)}
            aria-label={t('billing.limits.dismissAria')}
            style={{
              background: 'none',
              border: 'none',
              padding: 4,
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              flexShrink: 0,
            }}
          >
            <X size={18} />
          </button>
        </div>
      )}
      {showSeats && (
        <div role="alert" style={bannerStyle}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, color: 'var(--text-primary)', fontWeight: 500 }}>
              {t('billing.limits.workspaceAlert.seats.message')}
            </p>
            <p style={{ margin: '4px 0 8px 0', color: 'var(--text-secondary)', lineHeight: 1.35 }}>
              {t('billing.limits.workspaceAlert.seats.cta')}
            </p>
            <Button variant="primary" size="sm" onClick={onUpgrade}>
              {t('billing.limits.upgrade')}
            </Button>
          </div>
          <button
            type="button"
            onClick={() => setDismissedSeats(true)}
            aria-label={t('billing.limits.dismissAria')}
            style={{
              background: 'none',
              border: 'none',
              padding: 4,
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              flexShrink: 0,
            }}
          >
            <X size={18} />
          </button>
        </div>
      )}
    </div>
  )
}
