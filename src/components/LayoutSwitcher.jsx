import { List, Columns2, Grid2X2 } from 'lucide-react'

const options = [
  { id: 'list', label: 'Llista', Icon: List },
  { id: 'split', label: 'Split', Icon: Columns2 },
  { id: 'grid', label: 'Grid', Icon: Grid2X2 }
]

export default function LayoutSwitcher({ value, onChange, compact = false }) {
  return (
    <div style={styles.container}>
      {options.map(option => {
        const isActive = option.id === value
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            title={option.label}
            style={{
              ...styles.button,
              ...(isActive ? styles.buttonActive : null),
              ...(compact ? styles.buttonCompact : null)
            }}
          >
            <option.Icon size={compact ? 16 : 18} />
            {!compact && <span>{option.label}</span>}
          </button>
        )
      })}
    </div>
  )
}

const styles = {
  container: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px',
    borderRadius: '12px',
    border: '1px solid var(--border-color)',
    backgroundColor: 'var(--surface-bg)'
  },
  button: {
    border: 'none',
    background: 'transparent',
    color: 'var(--text)',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 10px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '500'
  },
  buttonCompact: {
    padding: '6px'
  },
  buttonActive: {
    backgroundColor: 'rgba(31, 78, 95, 0.08)',
    color: 'var(--color-primary)',
    boxShadow: 'var(--shadow-soft)'
  }
}
