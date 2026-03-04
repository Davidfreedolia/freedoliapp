import React, { Suspense, lazy } from 'react'

const SamplesSection = lazy(() => import('../../SamplesSection'))

export default function ProjectSamplesSection({ projectId, darkMode }) {
  return (
    <div className="samples-phase-wrap">
      <Suspense fallback={<div className="samples-loading-wrap">Carregant...</div>}>
        <SamplesSection projectId={projectId} darkMode={darkMode} />
      </Suspense>
    </div>
  )
}

