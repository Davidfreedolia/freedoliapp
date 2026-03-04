import React from 'react'

/**
 * Simple responsive stepper for the activation wizard.
 * Desktop: labels + progress bar.
 * Mobile: dots only (labels hidden via CSS).
 */
export default function Stepper({ steps, currentIndex = 0 }) {
  if (!Array.isArray(steps) || steps.length === 0) return null

  const clampedIndex = Math.min(Math.max(currentIndex, 0), steps.length - 1)

  return (
    <div className="wizard-stepper" aria-label="Wizard progress">
      {steps.map((step, idx) => {
        const isActive = idx === clampedIndex
        const isCompleted = idx < clampedIndex
        const state = isActive ? 'active' : isCompleted ? 'completed' : 'upcoming'
        return (
          <div
            key={step.id || step.label || idx}
            className={`wizard-stepper__step wizard-stepper__step--${state}`}
          >
            <div className="wizard-stepper__dot" />
            <div className="wizard-stepper__label">
              <span className="wizard-stepper__label-text">{step.label}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

