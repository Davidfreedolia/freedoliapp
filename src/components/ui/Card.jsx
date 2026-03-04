export default function Card({ elevated = false, className = '', children, ...rest }) {
  const classes = ['ui-card', elevated && 'ui-card--elevated', className].filter(Boolean).join(' ')
  return (
    <div className={classes} {...rest}>
      {children}
    </div>
  )
}

