// Component per mostrar i gestionar connexió amb Google Drive
import { useState, useEffect, useCallback } from 'react'
import { Cloud, CloudOff, LogIn, LogOut, RefreshCw, AlertCircle } from 'lucide-react'
import { driveService } from '../lib/googleDrive'

export default function DriveStatus({ compact = false }) {
  const [isConnected, setIsConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [userName, setUserName] = useState('')
  const [error, setError] = useState(null)
  const [initFailed, setInitFailed] = useState(false)

  const getUserInfo = useCallback(async () => {
    if (window.gapi?.client?.drive) {
      try {
        const response = await window.gapi.client.drive.about.get({ fields: 'user' })
        if (response.result?.user) {
          setUserName(response.result.user.displayName || response.result.user.emailAddress || 'Connectat')
        }
      } catch (e) {
        console.log('No s\'ha pogut obtenir info usuari:', e)
        setUserName('Connectat')
      }
    } else {
      setUserName('Connectat')
    }
  }, [])

  const initDrive = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    setInitFailed(false)
    
    try {
      console.log('DriveStatus: Initializing Drive...')
      const success = await driveService.init()
      
      if (!success) {
        console.log('DriveStatus: Init returned false')
        setIsConnected(false)
        setInitFailed(true)
        setIsLoading(false)
        return
      }

      console.log('DriveStatus: Init successful, verifying token...')
      const isValid = await driveService.verifyToken()
      console.log('DriveStatus: Token valid:', isValid)
      setIsConnected(isValid)
      
      if (isValid) {
        await getUserInfo()
      }
    } catch (err) {
      console.error('Error inicialitzant Drive:', err)
      setError(err.message)
      setIsConnected(false)
      setInitFailed(true)
    }
    
    setIsLoading(false)
  }, [getUserInfo])

  useEffect(() => {
    // Petit delay per assegurar que el DOM està llest
    const timer = setTimeout(() => {
      initDrive()
    }, 100)
    
    return () => clearTimeout(timer)
  }, [initDrive])

  const handleConnect = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      console.log('DriveStatus: Starting authentication...')
      await driveService.authenticate()
      console.log('DriveStatus: Authentication successful')
      setIsConnected(true)
      await getUserInfo()
    } catch (err) {
      console.error('Error connectant:', err)
      
      // Millorar missatge d'error per l'usuari
      let errorMsg = 'Error connectant a Google Drive'
      if (err.message?.includes('popup_closed')) {
        errorMsg = 'S\'ha tancat la finestra d\'autenticació'
      } else if (err.message?.includes('access_denied')) {
        errorMsg = 'Accés denegat. Assegura\'t d\'acceptar els permisos.'
      }
      
      setError(errorMsg)
      setIsConnected(false)
    }
    
    setIsLoading(false)
  }

  const handleDisconnect = () => {
    driveService.logout()
    setIsConnected(false)
    setUserName('')
    setError(null)
  }

  const handleRetry = () => {
    setInitFailed(false)
    initDrive()
  }

  // Versió compacta (només icona)
  if (compact) {
    if (isLoading) {
      return (
        <div style={styles.compactContainer}>
          <RefreshCw size={18} color="#9ca3af" className="animate-spin" />
        </div>
      )
    }

    if (initFailed) {
      return (
        <div 
          style={{
            ...styles.compactContainer,
            backgroundColor: 'rgba(251, 191, 36, 0.1)',
            cursor: 'pointer'
          }}
          onClick={handleRetry}
          title="Error inicialitzant Drive. Clica per reintentar."
        >
          <AlertCircle size={18} color="#f59e0b" />
        </div>
      )
    }

    return (
      <div 
        style={{
          ...styles.compactContainer,
          backgroundColor: isConnected ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
          cursor: 'pointer'
        }}
        onClick={isConnected ? handleDisconnect : handleConnect}
        title={isConnected ? `Connectat com ${userName}. Clica per desconnectar.` : 'Clica per connectar amb Google Drive'}
      >
        {isConnected ? (
          <Cloud size={18} color="#22c55e" />
        ) : (
          <CloudOff size={18} color="#ef4444" />
        )}
      </div>
    )
  }

  // Versió completa
  return (
    <div style={styles.wrapper}>
      {isLoading ? (
        <div style={styles.container}>
          <RefreshCw size={18} color="#9ca3af" className="animate-spin" />
          <span style={styles.statusText}>Connectant...</span>
        </div>
      ) : initFailed ? (
        <div style={styles.container}>
          <AlertCircle size={18} color="#f59e0b" />
          <span style={styles.statusText}>Error d'inicialització</span>
          <button onClick={handleRetry} style={styles.buttonRetry}>
            <RefreshCw size={14} />
            Reintentar
          </button>
        </div>
      ) : isConnected ? (
        <div style={styles.container}>
          <Cloud size={18} color="#22c55e" />
          <div style={styles.info}>
            <span style={styles.statusText}>Google Drive</span>
            <span style={styles.userName}>{userName || 'Connectat'}</span>
          </div>
          <button onClick={handleDisconnect} style={styles.buttonSmall} title="Desconnectar">
            <LogOut size={14} />
          </button>
        </div>
      ) : (
        <div style={styles.container}>
          <CloudOff size={18} color="#ef4444" />
          <span style={styles.statusText}>Drive desconnectat</span>
          <button onClick={handleConnect} style={styles.buttonConnect}>
            <LogIn size={14} />
            Connectar
          </button>
        </div>
      )}
      {error && (
        <div style={styles.error}>
          <AlertCircle size={12} />
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}

const styles = {
  wrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  container: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 12px',
    backgroundColor: 'var(--bg-secondary, #f3f4f6)',
    borderRadius: '10px'
  },
  compactContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '10px',
    borderRadius: '10px',
    transition: 'all 0.2s'
  },
  info: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    minWidth: 0
  },
  statusText: {
    fontSize: '13px',
    fontWeight: '500',
    color: 'var(--text-primary, #111827)'
  },
  userName: {
    fontSize: '11px',
    color: 'var(--text-secondary, #6b7280)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  buttonConnect: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    backgroundColor: '#4f46e5',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'background-color 0.2s'
  },
  buttonRetry: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    backgroundColor: '#f59e0b',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'background-color 0.2s'
  },
  buttonSmall: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '28px',
    height: '28px',
    border: 'none',
    borderRadius: '6px',
    backgroundColor: 'transparent',
    color: 'var(--text-secondary, #6b7280)',
    cursor: 'pointer',
    transition: 'background-color 0.2s'
  },
  error: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '11px',
    color: '#ef4444',
    padding: '4px 8px'
  }
}
