import React from 'react'

function cx(...parts) {
  return parts.filter(Boolean).join(' ')
}

export default function AppToolbar({ children, className = '', ...props }) {
  return (
    <div className={cx('app-toolbar', className)} {...props}>
      {children}
    </div>
  )
}

function Group({ align = 'left', className = '', children, ...props }) {
  const slot =
    align === 'center'
      ? 'app-toolbar__center'
      : align === 'right'
      ? 'app-toolbar__right'
      : 'app-toolbar__left'

  return (
    <div className={cx(slot, className)} {...props}>
      {children}
    </div>
  )
}

function Item({ className = '', children, ...props }) {
  return (
    <div className={cx('app-toolbar__control', className)} {...props}>
      {children}
    </div>
  )
}

AppToolbar.Group = Group
AppToolbar.Item = Item
