import { Link } from 'react-router-dom'

export default function Landing() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        backgroundColor: 'var(--page-bg)',
      }}
    >
      <div
        style={{
          textAlign: 'center',
          maxWidth: 360,
          padding: 32,
          background: 'var(--surface-bg-2)',
          borderRadius: 12,
          border: '1px solid var(--border-1)',
        }}
      >
        <div
          style={{
            fontSize: 28,
            fontWeight: 700,
            letterSpacing: '-0.02em',
            color: 'var(--text-1)',
            marginBottom: 24,
          }}
        >
          FREEDOLIAPP
        </div>
        <p
          style={{
            fontSize: 16,
            color: 'var(--text-secondary, #6b7280)',
            margin: '0 0 32px',
          }}
        >
          En construcció
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
          <Link
            to="/login"
            style={{
              display: 'inline-block',
              padding: '12px 24px',
              borderRadius: 8,
              background: 'var(--primary-1)',
              color: '#fff',
              fontWeight: 600,
              textDecoration: 'none',
              minWidth: 160,
              textAlign: 'center',
            }}
          >
            Inicia sessió
          </Link>
          <Link
            to="/login"
            style={{
              display: 'inline-block',
              padding: '12px 24px',
              borderRadius: 8,
              border: '1px solid var(--border-1)',
              background: 'var(--surface-bg-2)',
              color: 'var(--text-1)',
              fontWeight: 500,
              textDecoration: 'none',
              minWidth: 160,
              textAlign: 'center',
            }}
          >
            Obrir app
          </Link>
        </div>
      </div>
    </div>
  )
}
