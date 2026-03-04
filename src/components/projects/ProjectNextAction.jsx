import React, { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../ui/Button'
import useT from '../../hooks/useT'

/**
 * F8.3.3 — CTA de propera acció per a un projecte segons fase.
 */
export default function ProjectNextAction({ project, size = 'sm' }) {
  const t = useT()
  const navigate = useNavigate()

  const phase = project?.phase ?? project?.phase_id ?? project?.current_phase ?? 1

  const { labelKey, href } = useMemo(() => {
    const baseHref = project?.id ? `/app/projects/${project.id}` : '/app/projects'
    switch (phase) {
      case 1:
        return { labelKey: 'projects.nextAction.viability', href: baseHref }
      case 2:
        return { labelKey: 'projects.nextAction.addQuote', href: baseHref }
      case 3:
        return { labelKey: 'projects.nextAction.requestSamples', href: baseHref }
      case 4:
        return { labelKey: 'projects.nextAction.createPO', href: baseHref }
      case 5:
        return { labelKey: 'projects.nextAction.prepareShipment', href: baseHref }
      case 6:
      case 7:
        return { labelKey: 'projects.nextAction.sendToAmazon', href: baseHref }
      default:
        return { labelKey: 'projects.nextAction.open', href: baseHref }
    }
  }, [phase, project?.id])

  const label = t(labelKey)

  return (
    <Button
      variant="primary"
      size={size}
      onClick={(e) => {
        e.stopPropagation()
        navigate(href)
      }}
    >
      {label}
    </Button>
  )
}

