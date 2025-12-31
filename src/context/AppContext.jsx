import { createContext, useContext, useState, useEffect } from 'react'
import { getProjects, getDashboardStats } from '../lib/supabase'
import { driveService } from '../lib/googleDrive'

const AppContext = createContext()

export function AppProvider({ children }) {
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode')
    return saved ? JSON.parse(saved) : false
  })
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [projects, setProjects] = useState([])
  const [stats, setStats] = useState({
    totalProjects: 0,
    activeProjects: 0,
    completedProjects: 0,
    totalInvested: 0
  })
  const [loading, setLoading] = useState(true)
  const [driveConnected, setDriveConnected] = useState(false)

  // Carregar dades inicials
  useEffect(() => {
    loadInitialData()
    initDrive()
  }, [])

  // Guardar preferència dark mode
  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(darkMode))
    document.body.classList.toggle('dark', darkMode)
  }, [darkMode])

  const loadInitialData = async () => {
    setLoading(true)
    try {
      const [projectsData, statsData] = await Promise.all([
        getProjects(),
        getDashboardStats()
      ])
      setProjects(projectsData || [])
      setStats(statsData)
    } catch (err) {
      console.error('Error carregant dades:', err)
    }
    setLoading(false)
  }

  const initDrive = async () => {
    try {
      await driveService.init()
      const isValid = await driveService.verifyToken()
      setDriveConnected(isValid)
      
      // Escoltar canvis d'autenticació (token expirat, etc.)
      driveService.onAuthChange = (connected) => {
        setDriveConnected(connected)
      }
    } catch (err) {
      // No mostrar stacktrace d'errors d'autenticació (són gestionats centralitzadament)
      if (err.message !== 'AUTH_REQUIRED' && !err.message?.includes('401')) {
        console.error('Error inicialitzant Drive:', err)
      }
      // Sempre marcar com desconnectat si hi ha error
      setDriveConnected(false)
    }
  }

  const refreshProjects = async () => {
    const data = await getProjects()
    setProjects(data || [])
    const statsData = await getDashboardStats()
    setStats(statsData)
  }

  const value = {
    darkMode,
    setDarkMode,
    sidebarCollapsed,
    setSidebarCollapsed,
    projects,
    setProjects,
    stats,
    loading,
    refreshProjects,
    driveConnected,
    setDriveConnected
  }

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error('useApp must be used within AppProvider')
  }
  return context
}

export default AppContext
