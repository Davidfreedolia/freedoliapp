/**
 * Canonical evidence check row: icon (coral) + label left, field middle, checkbox (20px) right.
 * Used in Research, Viability, etc.
 */

export default function EvidenceCheckRow({
  icon: Icon,
  label,
  value,
  onChange,
  checked,
  onCheckedChange,
  placeholder = 'Link o nota breu (mín. 8 caràcters)',
  autoCheck = false
}) {
  return (
    <div className="evidence-row">
      <div className="evidence-row__left">
        {Icon && <Icon className="evidence-row__icon" size={18} strokeWidth={2} />}
        <span>{label}</span>
      </div>
      <div className="evidence-row__field">
        <input
          type="text"
          value={value || ''}
          onChange={(e) => {
            const val = e.target.value
            onChange(val)
            if (autoCheck) {
              const len = val.trim().length
              if (len >= 8) {
                onCheckedChange(true)
              } else if (len < 8 && checked) {
                onCheckedChange(false)
              }
            }
          }}
          placeholder={placeholder}
        />
      </div>
      <div className="evidence-row__check">
        <input
          id={label ? `ev-check-${label.replace(/\s+/g, '-')}` : undefined}
          type="checkbox"
          checked={!!checked}
          disabled={!value || value.trim().length < 8}
          onChange={(e) => onCheckedChange(e.target.checked)}
          aria-label={label}
        />
      </div>
    </div>
  )
}
