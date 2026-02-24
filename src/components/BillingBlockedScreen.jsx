import { Link } from 'react-router-dom'

/**
 * Pantalla de bloqueig quan la subscripció del workspace no és activa.
 * S7.2: billing gate UI — no es renderitza la resta de l'app.
 */
export default function BillingBlockedScreen({ org, hasBillingPage = true }) {
  const trialEndsAt = org?.trial_ends_at ? new Date(org.trial_ends_at) : null
  const now = new Date()
  const isTrialExpired = org?.billing_status === 'trialing' && trialEndsAt != null && trialEndsAt <= now

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        backgroundColor: 'var(--page-bg)',
      }}
    >
      <div
        style={{
          maxWidth: 420,
          width: '100%',
          padding: 32,
          background: 'var(--surface-bg-2)',
          border: '1px solid var(--border-1)',
          borderRadius: 12,
          textAlign: 'center',
        }}
      >
        <h1
          style={{
            margin: '0 0 16px',
            fontSize: 22,
            fontWeight: 600,
            color: 'var(--danger-1)',
          }}
        >
          Subscription inactive
        </h1>
        <p
          style={{
            margin: 0,
            fontSize: 15,
            lineHeight: 1.5,
            color: 'var(--text-secondary, #6b7280)',
          }}
        >
          {isTrialExpired
            ? 'Your trial has ended.'
            : 'Your workspace subscription is not active. Please update billing to continue using FREEDOLIAPP.'}
        </p>
        <div style={{ marginTop: 24 }}>
          {hasBillingPage ? (
            <Link
              to="/settings"
              style={{
                display: 'inline-block',
                padding: '10px 20px',
                borderRadius: 8,
                background: 'var(--danger-1)',
                color: '#fff',
                fontWeight: 600,
                textDecoration: 'none',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Go to billing
            </Link>
          ) : (
            <button
              type="button"
              disabled
              title="Billing not configured yet"
              style={{
                padding: '10px 20px',
                borderRadius: 8,
                background: 'var(--surface-bg-2)',
                color: 'var(--muted-1)',
                border: '1px solid var(--border-1)',
                cursor: 'not-allowed',
                fontWeight: 600,
              }}
            >
              Go to billing
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
