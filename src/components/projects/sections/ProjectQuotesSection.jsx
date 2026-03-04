import React, { Suspense, lazy } from 'react'

const QuotesSection = lazy(() => import('../../QuotesSection'))

export default function ProjectQuotesSection({ projectId, darkMode }) {
  return (
    <Suspense fallback={<div style={{ padding: '20px', textAlign: 'center', color: darkMode ? '#9ca3af' : '#6b7280' }}>Carregant...</div>}>
      <QuotesSection projectId={projectId} darkMode={darkMode} />
    </Suspense>
  )
}

