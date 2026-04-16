import { Link } from 'react-router-dom'
import { useWorkspace } from '../../contexts/WorkspaceContext'
import { useOrgBilling } from '../../hooks/useOrgBilling'
import Button from '../ui/Button'
import useT from '../../hooks/useT'
import { isBillingLimitsDisabled } from '../../lib/featureFlags'

export default function BillingBanner() {
  const { activeOrgId } = useWorkspace()
  const { loading, billing, isTrialExpired } = useOrgBilling(activeOrgId ?? null)
  const t = useT()

  // Beta bypass: no billing gates during closed beta
  if (isBillingLimitsDisabled()) return null

  if (loading || !billing) return null

  const showBanner =
    ['past_due', 'canceled'].includes(billing?.status) || isTrialExpired
  if (!showBanner) return null

  const isPastDue = billing?.status === 'past_due'
  const message = isTrialExpired
    ? t('billing.banner.trialEnded')
    : t('billing.banner.pastDue')

  return (
    <div className="billing-banner">
      <span className="billing-banner__message">
        {message}
      </span>
      <Link to="/app/settings/billing">
        <Button variant="primary" size="sm">
          {t('billing.banner.upgradeCta')}
        </Button>
      </Link>
    </div>
  )
}

