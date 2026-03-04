export default function Badge({ variant = 'neutral', className = '', children, ...rest }) {
  const allowed = ['neutral', 'success', 'warning', 'danger', 'info']
  const v = allowed.includes(variant) ? variant : 'neutral'
  const classes = ['ui-badge', `ui-badge--${v}`, className].filter(Boolean).join(' ')

  return (
    <span className={classes} {...rest}>
      {children}
    </span>
  )
}

