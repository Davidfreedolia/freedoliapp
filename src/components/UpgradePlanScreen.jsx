import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Lock, ArrowUpRight } from 'lucide-react'
import Button from './Button'
import { getUpgradePlanForFeature } from '../lib/billing/planFeatures'

/**
 * Screen shown when a user visits a page they don't have plan access to.
 *
 * Props:
 *   featureKey: string — the feature key from planFeatures.js (e.g. 'automations')
 *   currentPlan?: string — current plan code (for display)
 *   pageLabel?: string — human-readable page label
 */
export default function UpgradePlanScreen({ featureKey, currentPlan, pageLabel }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const requiredPlan = getUpgradePlanForFeature(featureKey)

  return (
    <div style={{
      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 40, minHeight: 'calc(100vh - 200px)',
    }}>
      <div style={{
        maxWidth: 480, textAlign: 'center',
        backgroundColor: 'var(--surface-bg, #ffffff)',
        border: '1px solid var(--border-1, rgba(31,95,99,0.14))',
        borderRadius: 16, padding: 40,
        boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
      }}>
        <div style={{
          width: 64, height: 64, borderRadius: '50%',
          backgroundColor: 'rgba(31,95,99,0.12)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 16,
        }}>
          <Lock size={28} color="var(--brand-1,#1F5F63)" />
        </div>
        <h1 style={{ margin: '0 0 8px', fontSize: 22, color: 'var(--ink-1,#1f2937)', fontWeight: 700 }}>
          {t('upgrade.title', 'Funció no disponible al teu pla')}
        </h1>
        {pageLabel && (
          <p style={{ margin: '0 0 16px', color: 'var(--muted-1,#6b7280)', fontSize: 14 }}>
            <strong>{pageLabel}</strong>
          </p>
        )}
        <p style={{ margin: '0 0 24px', color: 'var(--muted-1,#6b7280)', fontSize: 14, lineHeight: 1.55 }}>
          {t('upgrade.description', {
            defaultValue: 'Aquesta funcionalitat forma part del pla {{requiredPlan}}. Actualitza el teu pla per accedir-hi.',
            requiredPlan: requiredPlan.charAt(0).toUpperCase() + requiredPlan.slice(1),
          })}
        </p>
        {currentPlan && (
          <div style={{
            display: 'inline-block', padding: '6px 12px', borderRadius: 999,
            backgroundColor: 'rgba(31,95,99,0.08)', color: 'var(--brand-1,#1F5F63)',
            fontSize: 12, fontWeight: 600, marginBottom: 16,
          }}>
            {t('upgrade.currentPlan', 'Pla actual')}: {currentPlan}
          </div>
        )}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Button variant="primary" onClick={() => navigate('/app/billing')}>
            <ArrowUpRight size={16} style={{ marginRight: 6 }} />
            {t('upgrade.cta', 'Actualitzar pla')}
          </Button>
          <Button variant="ghost" onClick={() => navigate('/app')}>
            {t('upgrade.back', 'Tornar al dashboard')}
          </Button>
        </div>
      </div>
    </div>
  )
}
