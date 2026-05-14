import React, { Suspense, lazy } from 'react'

const QuotesSection = lazy(() => import('../../QuotesSection'))

export default function ProjectQuotesSection({ projectId, darkMode }) {
  return (
    <Suspense fallback={<div style={{ padding: '20px', textAlign: 'center', color: darkMode ? 'var(--muted-1)' : 'var(--text-2)' }}>Carregant...</div>}>
      <QuotesSection projectId={projectId} darkMode={darkMode} />
    </Suspense>
  )
}

