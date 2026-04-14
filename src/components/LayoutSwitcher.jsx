import { List, Columns, Grid2X2, LayoutGrid } from 'lucide-react'
import Button from './Button'

const DEFAULT_OPTIONS = [
  { id: 'list', label: 'Llista', Icon: List },
  { id: 'split', label: 'Split', Icon: Columns },
  { id: 'grid', label: 'Graella', Icon: Grid2X2 }
]

export const KANBAN_OPTION = { id: 'kanban', label: 'Kanban', Icon: LayoutGrid }

export default function LayoutSwitcher({ value, onChange, compact = false, options = DEFAULT_OPTIONS }) {
  return (
    <div style={styles.container} className="layout-switcher">
      {options.map(option => {
        const isActive = option.id === value
        return (
          <Button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            title={option.label}
            aria-label={option.label}
            variant="ghost"
            size="sm"
            style={compact ? styles.buttonCompact : styles.buttonBase}
            className={`btn-icon btn-ghost view-btn layout-switcher__btn ${isActive ? 'is-active' : ''}`}
          >
            <option.Icon size={compact ? 16 : 18} />
          </Button>
        )
      })}
    </div>
  )
}

const styles = {
  container: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: 0,
    border: 'none',
    backgroundColor: 'transparent'
  },
  buttonBase: {
    boxShadow: 'none',
    backgroundColor: 'transparent',
    border: 'none',
    padding: 0
  },
  buttonCompact: {
    minWidth: 'var(--h-btn)',
    padding: 0,
    boxShadow: 'none',
    backgroundColor: 'transparent',
    border: 'none'
  }
}
