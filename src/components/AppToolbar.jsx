import React from 'react'

function AppToolbar({ children, className = '', style }) {
  return (
    <div className={`app-toolbar ${className}`.trim()} style={style}>
      {children}
    </div>
  )
}

function Group({ align = 'left', children, className = '', style }) {
  const alignClass = align === 'center'
    ? 'app-toolbar__center'
    : align === 'right'
      ? 'app-toolbar__right'
      : 'app-toolbar__left'

  return (
    <div className={`${alignClass} app-toolbar__group ${className}`.trim()} style={style}>
      {children}
    </div>
  )
}

function Item({ children, className = '', style }) {
  return (
    <div className={`app-toolbar__control ${className}`.trim()} style={style}>
      {children}
    </div>
  )
}

AppToolbar.Group = Group
AppToolbar.Item = Item

export default AppToolbar
