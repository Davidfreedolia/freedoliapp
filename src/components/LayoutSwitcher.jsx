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
            style={compact
              ? { ...styles.buttonCompact, ...(isActive ? styles.buttonActive : {}) }
              : { ...styles.buttonBase, ...(isActive ? styles.buttonActive : {}) }
            }
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
    gap: '4px',
    padding: 0,
    border: 'none',
    backgroundColor: 'transparent'
  },
  buttonBase: {
    boxShadow: 'none',
    backgroundColor: 'transparent',
    border: '1.5px solid transparent',
    borderRadius: 8,
    padding: '4px 8px',
    transition: 'background-color 0.12s, border-color 0.12s'
  },
  buttonCompact: {
    minWidth: 'var(--h-btn)',
    padding: '4px',
    boxShadow: 'none',
    backgroundColor: 'transparent',
    border: '1.5px solid transparent',
    borderRadius: 8,
    transition: 'background-color 0.12s, border-color 0.12s'
  },
  buttonActive: {
    backgroundColor: 'rgba(110, 203, 195, 0.15)',
    borderColor: '#6ECBC3'
  }
}
