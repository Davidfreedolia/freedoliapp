import { lazy, Suspense } from 'react'

// Lazy load the actual implementation to isolate module initialization
const ProjectDetailImpl = lazy(() => import('./ProjectDetailImpl'))

/**
 * Route wrapper for ProjectDetail to isolate module initialization.
 * This wrapper has minimal imports to prevent circular dependencies
 * during route module initialization.
 */
export default function ProjectDetailRoute() {
  return (
    <Suspense fallback={
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f8f9fc'
      }}>
        <div style={{
          textAlign: 'center',
          padding: '48px'
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            border: '4px solid #e5e7eb',
            borderTop: '4px solid #4f46e5',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }} />
          <p style={{
            margin: 0,
            fontSize: '14px',
            color: '#6b7280'
          }}>
            Carregant projecte...
          </p>
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </div>
    }>
      <ProjectDetailImpl />
    </Suspense>
  )
}

