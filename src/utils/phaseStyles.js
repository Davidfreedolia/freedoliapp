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
