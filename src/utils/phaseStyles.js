import { Search, BarChart3, Factory, Package, Settings, FileText, Rocket } from 'lucide-react'

export const PHASE_STYLES = {
  1: {
    id: 1,
    name: 'Recerca',
    description: 'Investigació de producte i mercat',
    bg: '#FDECEC',
    accent: '#E57373',
    icon: Search
  },
  2: {
    id: 2,
    name: 'Viabilitat',
    description: 'Anàlisi de costos i rentabilitat',
    bg: '#FFF4E5',
    accent: '#FFB74D',
    icon: BarChart3
  },
  3: {
    id: 3,
    name: 'Proveïdors',
    description: 'Cerca i negociació amb fabricants',
    bg: '#FFF9DB',
    accent: '#FFD54F',
    icon: Factory
  },
  4: {
    id: 4,
    name: 'Mostres',
    description: 'Sol·licitud i verificació de mostres',
    bg: '#F1FAD9',
    accent: '#C0E67A',
    icon: Package
  },
  5: {
    id: 5,
    name: 'Producció',
    description: 'Fabricació i control de qualitat',
    bg: '#E8F8EC',
    accent: '#81C784',
    icon: Settings
  },
  6: {
    id: 6,
    name: 'Listing',
    description: 'Creació del listing a Amazon',
    bg: '#E3F7F4',
    accent: '#4DB6AC',
    icon: FileText
  },
  7: {
    id: 7,
    name: 'Live',
    description: 'Producte actiu, seguiment vendes',
    bg: '#E8F5E9',
    accent: '#66BB6A',
    icon: Rocket
  }
}

export const getPhaseStyle = (phaseId) => PHASE_STYLES[phaseId] || PHASE_STYLES[1]

const hexToRgba = (hex, alpha) => {
  if (!hex) return ''
  const normalized = hex.replace('#', '')
  const isShort = normalized.length === 3
  const expanded = isShort
    ? normalized.split('').map((ch) => ch + ch).join('')
    : normalized
  const r = parseInt(expanded.slice(0, 2), 16)
  const g = parseInt(expanded.slice(2, 4), 16)
  const b = parseInt(expanded.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export const getPhaseSurfaceStyles = (phaseStyle, options = {}) => {
  const { darkMode = false, borderWidth = 2 } = options
  const hasPhaseStyle = Boolean(phaseStyle?.bg && phaseStyle?.accent)
  if (!hasPhaseStyle) {
    return { hasPhaseStyle: false }
  }

  const cardSurface = darkMode ? 'rgba(24, 54, 63, 0.92)' : 'var(--surface-bg)'
  const contentSurface = darkMode ? 'rgba(18, 40, 47, 0.65)' : 'var(--surface-bg-2)'
  const headerHoverBg = hexToRgba(phaseStyle.accent, darkMode ? 0.16 : 0.1)

  return {
    hasPhaseStyle,
    headerHoverBg,
    wrapperStyle: {
      backgroundColor: 'var(--surface-bg)',
      borderTop: `3px solid ${phaseStyle.accent}`
    },
    cardStyle: {
      background: cardSurface,
      borderTop: `${borderWidth}px solid ${phaseStyle.accent}`,
      boxShadow: 'var(--shadow-soft)'
    },
    contentStyle: {
      background: contentSurface
    },
    accentStyle: {
      borderTop: `${borderWidth}px solid ${phaseStyle.accent}`
    }
  }
}