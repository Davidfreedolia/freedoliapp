import { Sun, Moon, Bell, LogOut } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { supabase } from '../lib/supabase'
import { logSuccess } from '../lib/auditLog'

export default function Header({ title }) {
  const { darkMode, setDarkMode } = useApp()
  const navigate = useNavigate()

  const handleLogout = async () => {
    try {
      // Obtenir user_id abans de fer logout
      const { data: { session } } = await supabase.auth.getSession()
      const userId = session?.user?.id

      await supabase.auth.signOut()
      
      // Audit log: logout
      if (userId) {
        try {
          await logSuccess('user', 'logout', userId, 'User logged out successfully')
        } catch (err) {
          console.warn('[Header] Failed to log audit:', err)
        }
      }
      
      navigate('/login')
    } catch (err) {
      console.error('Error during logout:', err)
      // Continuar amb logout encara que falli l'audit log
      navigate('/login')
    }
  }

  return (
    <header style={{
      ...styles.header,
      backgroundColor: darkMode ? '#0a0a0f' : '#ffffff',
      borderBottom: 'none',
      boxShadow: 'none'
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

        {/* Logout */}
        <button 
          onClick={handleLogout}
          style={{
            ...styles.iconButton,
            backgroundColor: darkMode ? '#1f1f2e' : '#f3f4f6'
          }}
          title="Tancar sessió"
        >
          <LogOut size={20} color={darkMode ? '#9ca3af' : '#6b7280'} />
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
    border: '1px solid var(--border-color, #e5e7eb)',
    borderRadius: '10px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease'
  }
}
