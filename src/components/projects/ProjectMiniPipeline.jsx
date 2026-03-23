import React from 'react'

/**
 * F8.3.3 — Mini pipeline visual per a un projecte.
 * Mostra 7 punts amb estat completed / current / upcoming.
 */
export default function ProjectMiniPipeline({ phase, totalSteps = 7 }) {
  const current = Number(phase) || 0
  const steps = Array.from({ length: totalSteps }, (_, idx) => idx + 1)

  return (
    <div className="mini-pipeline" data-current-step={current} aria-hidden="true">
      {steps.map((step) => {
        const status =
          step < current ? 'is-done' :
          step === current ? 'is-current' :
          'is-upcoming'
        const className = ['mini-pipeline__dot', status].join(' ')
        return <span key={step} className={className} />
      })}
    </div>
  )
}

