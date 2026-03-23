import React, { Suspense, lazy } from 'react'
import { useTranslation } from 'react-i18next'

const SamplesSection = lazy(() => import('../../SamplesSection'))

export default function ProjectSamplesSection({ projectId, darkMode }) {
  const { t } = useTranslation()
  return (
    <div className="samples-phase-wrap">
      <Suspense fallback={<div className="samples-loading-wrap">{t('common.loading')}</div>}>
        <SamplesSection projectId={projectId} darkMode={darkMode} />
      </Suspense>
    </div>
  )
}

