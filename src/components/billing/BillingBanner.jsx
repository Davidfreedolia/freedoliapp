import { Link } from 'react-router-dom'
import { useWorkspace } from '../../contexts/WorkspaceContext'
import { useOrgBilling } from '../../hooks/useOrgBilling'

export default function BillingBanner() {
  const { activeOrgId } = useWorkspace()
  const { loading, billing, isTrialExpired } = useOrgBilling(activeOrgId ?? null)

  if (loading || !billing) return null

  const showBanner =
    ['past_due', 'canceled'].includes(billing?.status) || isTrialExpired
  if (!showBanner) return null

  const isPastDue = billing?.status === 'past_due'
  const message = isTrialExpired
    ? 'Trial ended — upgrade to keep creating seats/connections and unlock Pro features.'
    : 'Payment issue — update billing to restore Pro actions.'

  return (
    <div
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        backgroundColor: 'var(--warning-bg, #fef3c7)',
        borderBottom: '1px solid var(--warning-border, #f59e0b)',
        padding: '10px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        flexWrap: 'wrap',
      }}
    >
      <span style={{ color: 'var(--text-primary, #1f2937)', fontSize: '14px' }}>
        {message}
      </span>
      <Link
        to="/app/settings/billing"
        style={{
          padding: '6px 14px',
          backgroundColor: 'var(--primary, #2563eb)',
          color: '#fff',
          borderRadius: '6px',
          fontSize: '14px',
          fontWeight: '500',
          textDecoration: 'none',
          whiteSpace: 'nowrap',
        }}
      >
        Upgrade
      </Link>
    </div>
  )
}
