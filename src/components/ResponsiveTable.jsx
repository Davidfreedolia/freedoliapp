import { useBreakpoint } from '../hooks/useBreakpoint'

// Component helper per renderitzar taules responsive
// Mobile: cards, Tablet: taula reduïda, Desktop: taula completa
export function ResponsiveTable({ 
  data, 
  columns, 
  renderRow, 
  renderCard,
  darkMode,
  emptyMessage = 'No hi ha dades'
}) {
  const { isMobile, isTablet } = useBreakpoint()

  if (data.length === 0) {
    return (
      <div style={{
        padding: '48px',
        textAlign: 'center',
        color: darkMode ? '#9ca3af' : '#6b7280'
      }}>
        {emptyMessage}
      </div>
    )
  }

  // Mobile: Cards
  if (isMobile) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
        {data.map((item, index) => (
          <div key={item.id || index} style={{
            padding: '16px',
            borderRadius: '12px',
            border: '1px solid var(--border-color)',
            backgroundColor: darkMode ? '#15151f' : '#ffffff'
          }}>
            {renderCard(item)}
          </div>
        ))}
      </div>
    )
  }

  // Tablet/Desktop: Table
  // En tablet, amagar columnes no essencials
  const visibleColumns = isTablet 
    ? columns.filter(col => !col.hideOnTablet)
    : columns

  return (
    <div style={{
      borderRadius: '16px',
      border: '1px solid var(--border-color)',
      overflow: 'auto',
      backgroundColor: darkMode ? '#15151f' : '#ffffff'
    }}>
      <table style={{
        width: '100%',
        borderCollapse: 'collapse',
        minWidth: isTablet ? '600px' : '800px'
      }}>
        <thead>
          <tr style={{ backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb' }}>
            {visibleColumns.map((col, idx) => (
              <th
                key={idx}
                style={{
                  padding: '14px 16px',
                  textAlign: 'left',
                  fontSize: '12px',
                  fontWeight: '600',
                  textTransform: 'uppercase',
                  borderBottom: '1px solid var(--border-color)',
                  color: darkMode ? '#9ca3af' : '#6b7280'
                }}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((item, index) => (
            <tr
              key={item.id || index}
              style={{
                borderBottom: '1px solid var(--border-color)'
              }}
            >
              {renderRow(item, visibleColumns)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}







