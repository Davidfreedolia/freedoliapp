export default function Input({
  label,
  hint,
  error,
  className = '',
  ...inputProps
}) {
  const fieldClass = ['ui-input', error ? 'ui-input--error' : '', className]
    .filter(Boolean)
    .join(' ')

  return (
    <div className="ui-field">
      {label && <label className="ui-field__label">{label}</label>}
      <input className={fieldClass} {...inputProps} />
      {hint && !error && <div className="ui-field__hint">{hint}</div>}
      {error && <div className="ui-field__error">{error}</div>}
    </div>
  )
}

