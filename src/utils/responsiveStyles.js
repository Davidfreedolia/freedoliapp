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
      borderRadius: '16px',
      border: '1px solid var(--border-color)',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: darkMode ? '#15151f' : '#ffffff',
      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
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

