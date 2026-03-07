/**
 * D11.8 Slice 4 — Reusable upsell card for a locked feature.
 * Uses canonical hasOrgFeature(entitlements, featureCode); does not duplicate gating logic.
 */
import { Lock } from 'lucide-react'
import { hasOrgFeature } from '../../lib/billing/entitlements'
import Button from '../ui/Button'

/**
 * @param {object} props
 * @param {string} props.title
 * @param {string} props.description
 * @param {string} props.featureCode - e.g. 'analytics', 'amazon_ingest', 'profit_engine'
 * @param {object | null} props.entitlements - row from getOrgEntitlements (null = treat as locked)
 * @param {() => void} props.onUpgrade - e.g. () => handleUpgrade('growth')
 * @param {boolean} [props.upgradeDisabled] - disable button while upgrade in progress
 */
export default function FeatureLockedCard({ title, description, featureCode, entitlements, onUpgrade, upgradeDisabled = false }) {
  if (entitlements && hasOrgFeature(entitlements, featureCode)) return null

  return (
    <div
      style={{
        padding: '16px',
        border: '1px solid var(--border)',
        borderRadius: 8,
        background: 'var(--card-bg, #fafafa)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <Lock size={20} style={{ color: 'var(--text-secondary)', flexShrink: 0, marginTop: 2 }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>{title}</div>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: '0 0 12px 0', lineHeight: 1.4 }}>{description}</p>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 10 }}>Locked</div>
          <Button variant="primary" size="sm" onClick={onUpgrade} disabled={upgradeDisabled}>
            Upgrade to unlock
          </Button>
        </div>
      </div>
    </div>
  )
}
