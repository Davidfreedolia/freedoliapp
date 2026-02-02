import { List, Columns, Grid2X2 } from 'lucide-react'
import Button from './Button'

const options = [
  { id: 'list', label: 'Llista', Icon: List },
  { id: 'split', label: 'Split', Icon: Columns },
  { id: 'grid', label: 'Grid', Icon: Grid2X2 }
]

export default function LayoutSwitcher({ value, onChange, compact = false }) {
  return (
    <div style={styles.container}>
      {options.map(option => {
        const isActive = option.id === value
        return (
          <Button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            title={option.label}
            variant={isActive ? 'secondary' : 'ghost'}
            size="sm"
            style={compact ? styles.buttonCompact : null}
          >
            <option.Icon size={compact ? 16 : 18} />
            {!compact && <span>{option.label}</span>}
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
  buttonCompact: {
    minWidth: 'var(--btn-h-sm)',
    padding: '0 10px'
  }
}
