import { List, Columns, Grid2X2 } from 'lucide-react'

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
    borderRadius: 'var(--btn-radius)',
    border: '1px solid var(--btn-secondary-border)',
    backgroundColor: 'var(--btn-ghost-bg)'
  },
  button: {
    height: 'var(--btn-h-sm)',
    border: '1px solid var(--btn-ghost-border)',
    background: 'var(--btn-ghost-bg)',
    color: 'var(--btn-ghost-fg)',
    boxShadow: 'var(--btn-shadow)',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '0 var(--btn-pad-x)',
    borderRadius: 'var(--btn-radius)',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '600',
    transition: 'all 0.15s ease'
  },
  buttonCompact: {
    padding: '0 10px'
  },
  buttonActive: {
    backgroundColor: 'var(--btn-secondary-bg)',
    color: 'var(--btn-secondary-fg)',
    border: '1px solid var(--btn-secondary-border)',
    boxShadow: 'var(--btn-shadow)'
  }
}
