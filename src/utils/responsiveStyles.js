// Helpers per estils responsive
// Retorna estils segons breakpoint sense dependències externes

export const getModalStyles = (isMobile, darkMode) => {
  if (isMobile) {
    // Mobile: fullscreen
    return {
      overlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: darkMode ? '#0a0a0f' : '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 1000,
        padding: 0
      },
      modal: {
        width: '100%',
        height: '100%',
        maxWidth: 'none',
        maxHeight: 'none',
        borderRadius: 0,
        border: 'none',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: darkMode ? '#0a0a0f' : '#ffffff'
      }
    }
  }
  
  // Desktop: modal centrat
  return {
    overlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    },
    modal: {
      width: '90%',
      maxWidth: '600px',
      maxHeight: '90vh',
      borderRadius: 'var(--radius-ui)', // Unified radius
      border: 'none', // No border - use shadow
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: 'var(--surface-bg)',
      boxShadow: 'var(--shadow-lg)' // Stronger shadow for modals
    },
    header: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '20px 24px',
      borderBottom: 'none', // No border - use subtle background difference
      backgroundColor: 'var(--surface-bg-2)'
    },
    body: {
      padding: '24px',
      overflowY: 'auto'
    },
    closeButton: {
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      color: darkMode ? '#9ca3af' : '#6b7280',
      padding: '4px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 'var(--radius-ui)', // Unified radius
      transition: 'background-color 0.2s'
    }
  }
}

export const getTableStyles = (isMobile, isTablet) => {
  if (isMobile) {
    // Mobile: cards
    return {
      container: {
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      },
      useCards: true
    }
  }
  
  if (isTablet) {
    // Tablet: taula reduïda (menys columnes)
    return {
      container: {
        overflowX: 'auto'
      },
      useCards: false,
      hideColumns: ['notes', 'details'] // Columnes a amagar en tablet
    }
  }
  
  // Desktop: taula completa
  return {
    container: {
      overflowX: 'auto'
    },
    useCards: false,
    hideColumns: []
  }
}






