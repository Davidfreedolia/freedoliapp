import React from 'react'

const VARIANTS = ['primary', 'secondary', 'danger', 'ghost']
const SIZES = ['sm', 'md', 'lg']

export default function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  disabled = false,
  loading = false,
  className = '',
  type = 'button',
  children,
  ...rest
}) {
  const v = VARIANTS.includes(variant) ? variant : 'primary'
  const s = SIZES.includes(size) ? size : 'md'
  const isDisabled = disabled || loading

  const { style, ...props } = rest // style is intentionally ignored (no inline styles)

  const classes = [
    'ui-btn',
    `ui-btn--${v}`,
    `ui-btn--${s}`,
    fullWidth ? 'ui-btn--full' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <button
      type={type}
      className={classes}
      disabled={isDisabled}
      aria-busy={loading ? 'true' : undefined}
      {...props}
    >
      {loading && <span className="ui-btn__spinner" aria-hidden="true" />}
      {children}
    </button>
  )
}

