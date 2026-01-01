import { createContext, useContext, useState, useEffect } from 'react'
import { getProjects, getDashboardStats, getCompanySettings, updateCompanySettings } from '../lib/supabase'
import { driveService } from '../lib/googleDrive'
import { generateDemoData, checkDemoExists, checkRealDataExists } from '../lib/demoSeed'
import { showToast } from '../components/Toast'

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
    let mounted = true
    
    const initialize = async () => {
      await loadInitialData()
      await initDrive()
      // Auto-seed demo data if enabled (only once)
      if (!window._demoSeedInitialized) {
        window._demoSeedInitialized = true
        await autoSeedDemoData()
      }
    }
    
    if (mounted) {
      initialize()
    }
    
    return () => {
      mounted = false
    }
  }, [])

  // Auto-seed demo data on app load (only in DEV environment)
  const autoSeedDemoData = async () => {
    try {
      // Safety check: Only seed in DEV, never in PROD
      const env = import.meta.env.VITE_ENV || 'dev'
      if (env === 'prod') {
        console.log('PROD environment detected, skipping auto-seed')
        return
      }

      // Get company settings to check demo_mode
      const settings = await getCompanySettings()
      const isDemoMode = settings?.demo_mode !== false // Default to true if not set
      
      // If demo_mode is false, skip
      if (isDemoMode === false) {
        console.log('Demo mode is disabled')
        return
      }

      // If demo_mode is not set, set it to true by default
      if (settings?.demo_mode === undefined || settings?.demo_mode === null) {
        await updateCompanySettings({ demo_mode: true })
        console.log('Demo mode enabled by default')
      }

      // Check if real data exists
      const hasRealData = await checkRealDataExists()
      if (hasRealData) {
        console.log('Real data detected, demo seed skipped')
        showToast('Real data detected, demo seed skipped', 'warning', 3000)
        return
      }

      // Check if demo data already exists
      const hasDemo = await checkDemoExists()
      if (hasDemo) {
        console.log('Demo data already exists, skipping seed')
        return
      }

      // Generate demo data
      console.log('Auto-generating demo data...')
      const result = await generateDemoData()
      
      if (result.success) {
        if (result.skipped) {
          console.log('Demo data already exists')
        } else {
          console.log('Demo data generated successfully')
          showToast('Demo data loaded', 'success', 3000)
          // Refresh data after seed - use a ref to prevent multiple calls
          if (!window._demoDataRefreshScheduled) {
            window._demoDataRefreshScheduled = true
            setTimeout(() => {
              loadInitialData()
              window._demoDataRefreshScheduled = false
            }, 1000)
          }
        }
      } else {
        console.error('Failed to generate demo data:', result.message)
        showToast('Demo failed to load', 'error', 5000)
      }
    } catch (err) {
      console.error('Error in auto-seed:', err)
      showToast('Demo failed to load', 'error', 5000)
    }
  }

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
