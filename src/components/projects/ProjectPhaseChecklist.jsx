import React, { useMemo } from 'react'
import Card from '../ui/Card'
import useT from '../../hooks/useT'

const PHASE_KEYS = ['idea', 'viability', 'quotes', 'samples', 'po', 'shipment', 'amazon']

/**
 * F8.3.4 — Checklist de següents passos segons fase del projecte.
 */
export default function ProjectPhaseChecklist({ phase }) {
  const t = useT()

  const phaseKey = useMemo(() => {
    const numeric = Number(phase) || 1
    const idx = Math.min(Math.max(numeric - 1, 0), PHASE_KEYS.length - 1)
    return PHASE_KEYS[idx]
  }, [phase])

  const base = `projects.phase.${phaseKey}`
  const title = t(`${base}.title`)
  const items = t(`${base}.items`, { returnObjects: true }) || []

  if (!title && (!items || items.length === 0)) {
    return null
  }

  return (
    <Card className="project-phase-checklist">
      <h3 className="project-phase-checklist__title">{title}</h3>
      <ul className="project-phase-checklist__list">
        {Array.isArray(items) &&
          items.map((item, index) => (
            <li key={index} className="project-phase-checklist__item">
              {item}
            </li>
          ))}
      </ul>
    </Card>
  )
}

