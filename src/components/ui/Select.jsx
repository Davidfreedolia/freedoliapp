export default function Select({
  label,
  hint,
  error,
  className = '',
  children,
  ...selectProps
}) {
  const fieldClass = ['ui-select', error ? 'ui-select--error' : '', className]
    .filter(Boolean)
    .join(' ')

  return (
    <div className="ui-field">
      {label && <label className="ui-field__label">{label}</label>}
      <select className={fieldClass} {...selectProps}>
        {children}
      </select>
      {hint && !error && <div className="ui-field__hint">{hint}</div>}
      {error && <div className="ui-field__error">{error}</div>}
    </div>
  )
}

