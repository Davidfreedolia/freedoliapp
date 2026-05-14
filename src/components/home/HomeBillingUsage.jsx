/**
 * D21.6 — Billing usage per la Home.
 */
import { useTranslation } from 'react-i18next'

function formatDate(v, lng) {
  if (!v) return null
  try {
    const locale = lng === 'es' ? 'es-ES' : lng === 'en' ? 'en-US' : 'ca-ES'
    return new Date(v).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })
  } catch {
    return null
  }
}

function Row({ label, value }) {
  if (value == null || value === '') return null
  return (
    <div style={styles.row}>
      <span style={styles.label}>{label}</span>
      <span style={styles.value}>{value}</span>
    </div>
  )
}

export default function HomeBillingUsage({ billingUsage, loading }) {
  const { t, i18n } = useTranslation()
  const hasData = billingUsage != null && (billingUsage.usage != null || billingUsage.billing != null)

  if (loading) {
    return (
      <div style={styles.wrap}>
        <div style={styles.title}>{t('home.billingUsage.title')}</div>
        <div style={styles.placeholder}>{t('common.loading')}</div>
      </div>
    )
  }

  if (!hasData) {
    return (
      <div style={styles.wrap}>
        <div style={styles.title}>{t('home.billingUsage.title')}</div>
        <div style={styles.placeholder}>{t('home.billingUsage.empty')}</div>
      </div>
    )
  }

  const { usage, billing } = billingUsage
  const plan = billing?.plan != null && billing.plan !== '' ? String(billing.plan) : null
  const status = billing?.status != null && billing.status !== '' ? String(billing.status) : null
  const trialEndsAt = billing?.trial_ends_at ? formatDate(billing.trial_ends_at, i18n.language) : null
  const periodEndsAt = billing?.current_period_end_at ? formatDate(billing.current_period_end_at, i18n.language) : null
  const seatsUsed = usage?.seats?.used
  const seatsLimit = usage?.seats?.limit
  const projectsUsed = usage?.projects?.used
  const projectsLimit = usage?.projects?.limit

  const seatsText =
    seatsUsed != null && seatsLimit != null
      ? `${seatsUsed} / ${seatsLimit}`
      : seatsUsed != null
        ? String(seatsUsed)
        : null
  const projectsText =
    projectsUsed != null && projectsLimit != null
      ? `${projectsUsed} / ${projectsLimit}`
      : projectsUsed != null
        ? String(projectsUsed)
        : null

  return (
    <div style={styles.wrap}>
      <div style={styles.title}>{t('home.billingUsage.title')}</div>
      <div style={styles.body}>
        <Row label={t('home.billingUsage.plan')} value={plan} />
        <Row label={t('home.billingUsage.status')} value={status} />
        <Row label={t('home.billingUsage.trialEnds')} value={trialEndsAt} />
        <Row label={t('home.billingUsage.periodEnds')} value={periodEndsAt} />
        <Row label={t('home.billingUsage.seats')} value={seatsText} />
        <Row label={t('home.billingUsage.projects')} value={projectsText} />
      </div>
    </div>
  )
}

const styles = {
  wrap: {
    flex: '1 1 260px',
    minWidth: 220,
    padding: '1rem 1.25rem',
    borderRadius: 8,
    background: 'var(--card-bg, #f9fafb)',
    border: '1px solid var(--border-color, #e5e7eb)',
  },
  title: {
    fontSize: '0.9375rem',
    fontWeight: 600,
    color: 'var(--text-1, #111827)',
    marginBottom: 10,
  },
  body: { display: 'flex', flexDirection: 'column', gap: 6 },
  row: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, fontSize: '0.8125rem' },
  label: { color: 'var(--text-2, #6b7280)' },
  value: { fontWeight: 500, color: 'var(--text-1, #111827)' },
  placeholder: { fontSize: '0.875rem', color: 'var(--text-2, #6b7280)' },
}
