import { CloudOff } from 'lucide-react'

export default function ArtsFinalsSection({ project, darkMode, onProjectUpdated }) {
  return (
    <div style={{
      padding: '24px',
      backgroundColor: darkMode ? '#15151f' : '#ffffff',
      borderRadius: '12px',
      border: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`,
      marginBottom: '24px'
    }}>
      <h3 style={{
        margin: '0 0 16px 0',
        fontSize: '18px',
        fontWeight: '600',
        color: darkMode ? '#ffffff' : '#111827'
      }}>
        Arts Finals
      </h3>
      <div style={{
        padding: '24px',
        backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb',
        borderRadius: '8px',
        border: `1px dashed ${darkMode ? '#374151' : '#d1d5db'}`,
        textAlign: 'center'
      }}>
        <CloudOff size={32} color={darkMode ? '#9ca3af' : '#6b7280'} style={{ marginBottom: '12px' }} />
        <p style={{
          margin: '0',
          fontSize: '14px',
          color: darkMode ? '#9ca3af' : '#6b7280'
        }}>
          Aquesta funcionalitat no està disponible.
        </p>
      </div>
    </div>
  )
}
