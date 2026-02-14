import { Search, Calculator, Factory, Box, Package, Tag, CheckCircle2 } from 'lucide-react'

export const PHASE_META = {
  1: { id: 1, label: 'Recerca', description: 'Investigació de producte i mercat', icon: Search, color: 'var(--phase-1)' },
  2: { id: 2, label: 'Viabilitat', description: 'Anàlisi de costos i rentabilitat', icon: Calculator, color: 'var(--phase-2)' },
  3: { id: 3, label: 'Proveïdors', description: 'Cerca i negociació amb fabricants', icon: Factory, color: 'var(--phase-3)' },
  4: { id: 4, label: 'Mostres', description: 'Sol·licitud i verificació de mostres', icon: Box, color: 'var(--phase-4)' },
  5: { id: 5, label: 'Producció', description: 'Fabricació i control de qualitat', icon: Package, color: 'var(--phase-5)' },
  6: { id: 6, label: 'Listing', description: 'Creació del listing a Amazon', icon: Tag, color: 'var(--phase-6)' },
  7: { id: 7, label: 'Live', description: 'Producte actiu, seguiment vendes', icon: CheckCircle2, color: 'var(--phase-7)' }
}

export const getPhaseMeta = (phaseId) => PHASE_META[phaseId] || PHASE_META[1]

export const PHASE_STYLES = Object.fromEntries(
  Object.values(PHASE_META).map((meta) => ([
    meta.id,
    {
      id: meta.id,
      name: meta.label,
      description: meta.description,
      bg: 'var(--surface-bg)',
      accent: meta.color,
      icon: meta.icon
    }
  ]))
)

export const getPhaseStyle = (phaseId) => PHASE_STYLES[phaseId] || PHASE_STYLES[1]

export const getPhaseSurfaceStyles = (phaseStyle, options = {}) => {
  const { darkMode = false, borderWidth = 2 } = options
  const hasPhaseStyle = Boolean(phaseStyle?.bg && phaseStyle?.accent)
  if (!hasPhaseStyle) {
    return { hasPhaseStyle: false }
  }

  const cardSurface = darkMode ? 'rgba(24, 54, 63, 0.92)' : 'var(--surface-bg)'
  const contentSurface = darkMode ? 'rgba(18, 40, 47, 0.65)' : 'var(--surface-bg-2)'
  const headerHoverBg = 'var(--surface-bg-2)'

  return {
    hasPhaseStyle,
    headerHoverBg,
    wrapperStyle: {
      backgroundColor: 'var(--surface-bg)',
      borderTop: `3px solid var(--border-1)`
    },
    cardStyle: {
      background: cardSurface,
      borderTop: `${borderWidth}px solid var(--border-1)`,
      boxShadow: 'var(--shadow-soft)'
    },
    contentStyle: {
      background: contentSurface
    },
    accentStyle: {
      borderTop: `${borderWidth}px solid var(--border-1)`
    }
  }
}