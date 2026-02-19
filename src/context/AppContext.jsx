import { createContext, useContext, useState, useEffect } from 'react'
import { supabase, getProjects, getDashboardStats, getCompanySettings, updateCompanySettings } from '../lib/supabase'
import { generateDemoData, checkDemoExists, checkRealDataExists } from '../lib/demoSeed'
import { showToast } from '../components/Toast'
import { safeJsonParse } from '../lib/safeJson'

const AppContext = createContext()

const EMPTY_STATS = {
  totalProjects: 0,
  activeProjects: 0,
  completedProjects: 0,
  totalInvested: 0
}

export function AppProvider({ children }) {
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode')
    return safeJsonParse(saved, false)
  })
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [projects, setProjects] = useState([])
  const [stats, setStats] = useState(EMPTY_STATS)
  const [loading, setLoading] = useState(true)
  const [demoMode, setDemoMode] = useState(false)

  const isInvalidRefreshTokenError = (err) => {
    const message = err?.message || ''
    const code = err?.code || err?.name || ''
    return (
      message.includes('Invalid Refresh Token') ||
      message.includes('Refresh Token Not Found') ||
      code === 'invalid_refresh_token'
    )
  }

  const clearAuthSession = async () => {
    try {
      await supabase.auth.signOut()
    } catch (err) {
      console.warn('Error clearing auth session:', err)
    }
    try {
      localStorage.removeItem('freedoliapp-auth')
    } catch (err) {
      console.warn('Error clearing auth storage:', err)
    }
  }

  const handleAuthFailure = async (err) => {
    if (!isInvalidRefreshTokenError(err)) return false
    await clearAuthSession()
    setDemoMode(false)
    setProjects([])
    setStats(EMPTY_STATS)
    showToast('Sessió caducada. Torna a iniciar sessió.', 'error', 5000)
    return true
  }

  // Carregar dades inicials
  useEffect(() => {
    let mounted = true
    
    const initialize = async () => {
      await loadInitialData()
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
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError) {
        const handled = await handleAuthFailure(sessionError)
        if (handled) return
      }
      if (!session?.user) {
        setDemoMode(false)
        return
      }

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
      const handled = await handleAuthFailure(err)
      if (!handled) {
        console.error('Error in auto-seed:', err)
        showToast('Demo failed to load', 'error', 5000)
      }
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
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError) {
        const handled = await handleAuthFailure(sessionError)
        if (handled) return
      }
      if (!session?.user) {
        setDemoMode(false)
        setProjects([])
        setStats(EMPTY_STATS)
        return
      }

      // Load demo mode first and clear cache
      const settings = await getCompanySettings()
      const currentDemoMode = settings?.demo_mode || false
      setDemoMode(currentDemoMode)
      
      // Clear demo mode cache to ensure fresh data
      const { clearDemoModeCache } = await import('../lib/demoModeFilter')
      clearDemoModeCache()
      
      const [projectsData, statsData] = await Promise.all([
        getProjects(),
        getDashboardStats()
      ])
      setProjects(projectsData || [])
      setStats(statsData)
    } catch (err) {
      const handled = await handleAuthFailure(err)
      if (!handled) {
        console.error('Error carregant dades:', err)
        setProjects([])
        setStats(EMPTY_STATS)
        showToast('Sessió caducada. Torna a iniciar sessió.', 'error', 5000)
      }
    } finally {
      setLoading(false)
    }
  }
  
  const toggleDemoMode = async (newValue) => {
    try {
      // Dev-only log for debugging
      if (import.meta.env.DEV) {
        console.info('[demoMode] Toggling to:', newValue)
      }
      
      await updateCompanySettings({ demo_mode: newValue })
      setDemoMode(newValue)
      
      // Clear cache and reload data
      const { clearDemoModeCache } = await import('../lib/demoModeFilter')
      clearDemoModeCache()
      
      // Reload all data
      await loadInitialData()
      
      // Force page reload to ensure all components refresh
      // CRITICAL: This ensures no stale cache and all queries refetch with new demoMode
      window.location.reload()
    } catch (err) {
      console.error('Error toggling demo mode:', err)
      throw err
    }
  }


  const refreshProjects = async () => {
    try {
      const data = await getProjects()
      setProjects(data || [])
      const statsData = await getDashboardStats()
      setStats(statsData)
    } catch (err) {
      const handled = await handleAuthFailure(err)
      if (!handled) {
        console.error('Error refrescant projectes:', err)
        setProjects([])
        setStats(EMPTY_STATS)
        showToast('Sessió caducada. Torna a iniciar sessió.', 'error', 5000)
      }
    }
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
    demoMode,
    toggleDemoMode
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
