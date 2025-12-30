import { Sun, Moon, Bell } from 'lucide-react'
import { useApp } from '../context/AppContext'

export default function Header({ title }) {
  const { darkMode, setDarkMode } = useApp()

  return (
    <header style={{
      ...styles.header,
      backgroundColor: darkMode ? '#0a0a0f' : '#ffffff',
      borderColor: darkMode ? '#2a2a3a' : '#e5e7eb'
    }}>
      <h1 style={{
        ...styles.title,
        color: darkMode ? '#ffffff' : '#111827'
      }}>
        {title}
      </h1>

      <div style={styles.actions}>
        {/* Notificacions */}
        <button style={{
          ...styles.iconButton,
          backgroundColor: darkMode ? '#1f1f2e' : '#f3f4f6'
        }}>
          <Bell size={20} color={darkMode ? '#9ca3af' : '#6b7280'} />
        </button>

        {/* Toggle Dark Mode */}
        <button 
          onClick={() => setDarkMode(!darkMode)}
          style={{
            ...styles.iconButton,
            backgroundColor: darkMode ? '#1f1f2e' : '#f3f4f6'
          }}
        >
          {darkMode ? (
            <Sun size={20} color="#fbbf24" />
          ) : (
            <Moon size={20} color="#6b7280" />
          )}
        </button>
      </div>
    </header>
  )
}

const styles = {
  header: {
    height: '70px',
    padding: '0 32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottom: '1px solid',
    position: 'sticky',
    top: 0,
    zIndex: 50
  },
  title: {
    margin: 0,
    fontSize: '24px',
    fontWeight: '600'
  },
  actions: {
    display: 'flex',
    gap: '12px'
  },
  iconButton: {
    width: '40px',
    height: '40px',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease'
  }
}
