import { Search } from 'lucide-react'
import Button from '../../../components/Button'

/**
 * Action bar: section search input + dropdown and action buttons (Crear PO, Despesa, Document, etc.).
 */
export default function ProjectDetailActionBar({
  isMobile,
  sectionSearchRef,
  sectionSearchTerm,
  onSectionSearchChange,
  onSectionSearchFocus,
  showSectionDropdown,
  filteredSections,
  onScrollToSection,
  onSectionSearchKeyDown,
  onCreatePO,
  onCreateExpense,
  onAddDocument,
  btnStateStyle
}) {
  return (
    <div
      className="project-actions actionbar--turquoise"
      style={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        justifyContent: 'space-between',
        alignItems: 'stretch',
        gap: isMobile ? 8 : 12,
        padding: '8px 0',
        marginBottom: 8,
        width: '100%',
        boxSizing: 'border-box'
      }}
    >
      <div
        ref={sectionSearchRef}
        className="actionbar__search"
        style={{ position: 'relative', flex: isMobile ? '1 1 100%' : '0 0 auto' }}
      >
        <div className="actionbar__searchInputWrap" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <Search
            size={16}
            className="actionbar__searchIcon"
            style={{
              position: 'absolute',
              left: '10px',
              color: 'var(--muted-1)',
              pointerEvents: 'none'
            }}
          />
          <input
            type="text"
            placeholder="Cerca secció..."
            value={sectionSearchTerm}
            onChange={(e) => onSectionSearchChange(e.target.value)}
            onFocus={() => sectionSearchTerm.trim().length > 0 && onSectionSearchFocus?.()}
            onKeyDown={onSectionSearchKeyDown}
            className="actionbar__searchInput"
            style={{
              width: '100%',
              height: '34px',
              padding: '0 10px 0 34px',
              borderRadius: '10px',
              border: '1px solid var(--border-1)',
              background: 'var(--surface-bg)',
              color: 'var(--text-1)',
              fontSize: '13px',
              outline: 'none'
            }}
          />
        </div>
        {showSectionDropdown && filteredSections && filteredSections.length > 0 && (
          <div
            className="actionbar__searchDropdown"
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              marginTop: '4px',
              background: 'var(--surface-bg)',
              border: '1px solid var(--border-1)',
              borderRadius: '10px',
              boxShadow: 'var(--shadow-soft)',
              zIndex: 1000,
              maxHeight: '200px',
              overflowY: 'auto'
            }}
          >
            {filteredSections.map((section) => (
              <button
                key={section.id}
                type="button"
                onClick={() => onScrollToSection(section.id)}
                className="actionbar__searchOption"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  textAlign: 'left',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-1)',
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--surface-bg-2)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent'
                }}
              >
                <span className="actionbar__searchOptionTitle" style={{ fontWeight: 600 }}>{section.name}</span>
                {section.description && (
                  <span className="actionbar__searchOptionMeta" style={{ fontSize: '11px', color: 'var(--muted-1)' }}>{section.description}</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
      <div
        className="actionbar__buttons"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 8,
          justifyContent: isMobile ? 'flex-start' : 'flex-end',
          flex: isMobile ? '1 1 100%' : '0 0 auto'
        }}
      >
        <Button variant="secondary" size="sm" disabled style={btnStateStyle('inactive')} className="btn-secondary">
          Crear Proveïdor
        </Button>
        <Button variant="secondary" size="sm" disabled style={btnStateStyle('inactive')} className="btn-secondary">
          Crear Transitari
        </Button>
        <Button variant="secondary" size="sm" disabled style={btnStateStyle('inactive')} className="btn-secondary">
          Crear Magatzem
        </Button>
        <Button variant="primary" size="sm" style={btnStateStyle('active')} onClick={onCreatePO} className="btn-primary project-actions__button project-actions__button--primary">
          Crear Comanda (PO)
        </Button>
        <Button variant="secondary" size="sm" style={btnStateStyle('active')} onClick={onCreateExpense} className="btn-secondary project-actions__button">
          Crear Despesa
        </Button>
        <Button variant="ghost" size="sm" style={btnStateStyle('active')} onClick={onAddDocument} className="btn-ghost project-actions__button">
          + Document
        </Button>
      </div>
    </div>
  )
}
