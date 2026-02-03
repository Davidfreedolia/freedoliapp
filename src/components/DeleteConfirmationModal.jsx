import { X, AlertTriangle } from 'lucide-react'
import Button from './Button'

export default function DeleteConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  entityName,
  entityType,
  isDeleting = false,
  darkMode = false,
  showUsageWarning = false
}) {
  if (!isOpen) return null

  const styles = {
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
      width: '100%',
      maxWidth: '480px',
      backgroundColor: darkMode ? '#15151f' : '#ffffff',
      borderRadius: '16px',
      border: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`,
      overflow: 'hidden',
      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '20px 24px',
      borderBottom: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`
    },
    title: {
      margin: 0,
      fontSize: '18px',
      fontWeight: '600',
      color: darkMode ? '#ffffff' : '#111827',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    closeButton: {
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      color: '#6b7280',
      padding: '4px',
      display: 'flex',
      alignItems: 'center'
    },
    body: {
      padding: '24px'
    },
    warningBox: {
      display: 'flex',
      alignItems: 'flex-start',
      gap: '12px',
      padding: '16px',
      backgroundColor: darkMode ? '#1f1f2e' : '#fef3c7',
      border: `1px solid ${darkMode ? '#374151' : '#fde68a'}`,
      borderRadius: '8px',
      marginBottom: '20px'
    },
    warningIcon: {
      flexShrink: 0,
      color: '#f59e0b'
    },
    warningText: {
      fontSize: '14px',
      color: darkMode ? '#fbbf24' : '#92400e',
      lineHeight: '1.5'
    },
    entityName: {
      fontWeight: '600',
      color: darkMode ? '#ffffff' : '#111827'
    },
    message: {
      fontSize: '14px',
      color: darkMode ? '#9ca3af' : '#6b7280',
      marginBottom: '16px',
      lineHeight: '1.5'
    },
    footer: {
      display: 'flex',
      justifyContent: 'flex-end',
      gap: '12px',
      padding: '20px 24px',
      borderTop: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`
    },
    button: {
      padding: '10px 20px',
      borderRadius: '8px',
      fontSize: '14px',
      fontWeight: '500',
      cursor: 'pointer',
      border: 'none',
      transition: 'opacity 0.2s',
      display: 'flex',
      alignItems: 'center',
      gap: '6px'
    },
    cancelButton: {
      backgroundColor: 'transparent',
      color: darkMode ? '#9ca3af' : '#6b7280',
      border: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`
    },
    confirmButton: {
      backgroundColor: '#ef4444',
      color: '#ffffff',
      border: '1px solid #dc2626'
    },
    buttonDisabled: {
      opacity: 0.5,
      cursor: 'not-allowed'
    }
  }

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <div style={styles.header}>
          <h3 style={styles.title}>
            <AlertTriangle size={20} color="#ef4444" />
            Eliminar {entityType}
          </h3>
          <Button variant="ghost" onClick={onClose} disabled={isDeleting} aria-label="Tancar">
            <X size={20} />
          </Button>
        </div>

        <div style={styles.body}>
          <div style={styles.warningBox}>
            <AlertTriangle size={20} style={styles.warningIcon} />
            <div style={styles.warningText}>
              <div style={{ marginBottom: '8px' }}>
                Estàs a punt d'eliminar: <span style={styles.entityName}>{entityName}</span>
              </div>
              <div style={{ marginBottom: showUsageWarning ? '8px' : '0' }}>
                Aquesta acció no es pot desfer.
              </div>
              {showUsageWarning && (
                <div>
                  Si està en ús (comandes, despeses, projectes), l'eliminació pot fallar.
                </div>
              )}
            </div>
          </div>

          <div style={styles.message}>
            Vols continuar amb l'eliminació?
          </div>
        </div>

        <div style={styles.footer}>
          <button
            onClick={onClose}
            disabled={isDeleting}
            style={{
              ...styles.button,
              ...styles.cancelButton,
              ...(isDeleting ? styles.buttonDisabled : {})
            }}
          >
            Cancel·lar
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            style={{
              ...styles.button,
              ...styles.confirmButton,
              ...(isDeleting ? styles.buttonDisabled : {})
            }}
          >
            {isDeleting ? 'Eliminant...' : 'Sí, eliminar'}
          </button>
        </div>
      </div>
    </div>
  )
}
