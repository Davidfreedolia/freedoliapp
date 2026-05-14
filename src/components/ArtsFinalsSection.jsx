import { CloudOff } from 'lucide-react'

export default function ArtsFinalsSection({ project, darkMode, onProjectUpdated }) {
  return (
    <div style={{
      padding: '24px',
      backgroundColor: darkMode ? '#15151f' : '#ffffff',
      borderRadius: '12px',
      border: `1px solid ${darkMode ? 'var(--text-1)' : 'var(--border-1)'}`,
      marginBottom: '24px'
    }}>
      <h3 style={{
        margin: '0 0 16px 0',
        fontSize: '18px',
        fontWeight: '600',
        color: darkMode ? '#ffffff' : 'var(--text-1)'
      }}>
        Arts Finals
      </h3>
      <div style={{
        padding: '24px',
        backgroundColor: darkMode ? '#1f1f2e' : 'var(--surface-bg-2)',
        borderRadius: '8px',
        border: `1px dashed ${darkMode ? 'var(--text-1)' : 'var(--border-1)'}`,
        textAlign: 'center'
      }}>
        <CloudOff size={32} color={darkMode ? 'var(--muted-1)' : 'var(--text-2)'} style={{ marginBottom: '12px' }} />
        <p style={{
          margin: '0',
          fontSize: '14px',
          color: darkMode ? 'var(--muted-1)' : 'var(--text-2)'
        }}>
          Aquesta funcionalitat no està disponible.
        </p>
      </div>
    </div>
  )
}
