export default function Header({ title, rightSlot }) {
  return (
    <div className="page-header">
      <h1 className="page-header__title">{title}</h1>
      {rightSlot && (
        <div className="page-header__actions">
          {rightSlot}
        </div>
      )}
    </div>
  )
}
