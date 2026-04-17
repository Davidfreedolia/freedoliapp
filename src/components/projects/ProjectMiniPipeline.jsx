import React from 'react'

/**
 * F8.3.3 — Mini pipeline visual per a un projecte.
 * Mostra 7 punts amb un gradient de color vermell→verd
 * per reflectir la progressió de fases.
 */

// Gradient de colors per fase: vermell (inici) → verd/menta (final)
const STEP_COLORS = [
  '#e53e3e', // Fase 1 - Vermell     (Recerca)
  '#dd6b20', // Fase 2 - Taronja     (Viabilitat)
  '#d4a017', // Fase 3 - Ambre       (Proveïdors)
  '#8db33a', // Fase 4 - Verd-groc   (Mostres)
  '#38a169', // Fase 5 - Verd        (Producció)
  '#2fa4a9', // Fase 6 - Teal        (Listing)
  '#6ecbc3', // Fase 7 - Menta       (Live)
]

export default function ProjectMiniPipeline({ phase, totalSteps = 7 }) {
  const current = Number(phase) || 0
  const steps = Array.from({ length: totalSteps }, (_, idx) => idx + 1)

  return (
    <div className="mini-pipeline" data-current-step={current} aria-hidden="true">
      {steps.map((step) => {
        const status =
          step < current  ? 'is-done'     :
          step === current ? 'is-current' :
          'is-upcoming'

        const color = STEP_COLORS[step - 1] || '#6ecbc3'

        const inlineStyle =
          status === 'is-done'
            ? { backgroundColor: color, borderColor: color }
            : status === 'is-current'
            ? {
                backgroundColor: `${color}22`,
                borderColor: color,
                boxShadow: `0 0 0 3px ${color}28`
              }
            : {}

        return (
          <span
            key={step}
            className={`mini-pipeline__dot ${status}`}
            style={inlineStyle}
            title={`Fase ${step}`}
          />
        )
      })}
    </div>
  )
}
