// Component per mostrar i gestionar connexió amb Google Drive
import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, AlertCircle } from 'lucide-react'
import driveIcon from '../assets/google-drive.svg'
import Button from './Button'
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
      const success = await driveService.init()
      
      if (!success) {
        setIsConnected(false)
        setInitFailed(true)
        setIsLoading(false)
        return
      }

      const isValid = await driveService.verifyToken()
      setIsConnected(isValid)
      
      if (isValid) {
        await getUserInfo()
      } else {
        // Token no vàlid - mostrar estat desconnectat
        setIsConnected(false)
      }
    } catch (err) {
      // No mostrar stacktrace d'errors d'autenticació
      if (err.message === 'AUTH_REQUIRED' || err.message?.includes('401')) {
        setError(null) // No mostrar error, només estat desconnectat
        setIsConnected(false)
      } else {
        setError(err.message)
        setIsConnected(false)
        setInitFailed(true)
      }
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
      await driveService.authenticate()
      setIsConnected(true)
      await getUserInfo()
    } catch (err) {
      // Millorar missatge d'error per l'usuari (no mostrar stacktrace)
      let errorMsg = null // Per defecte, no mostrar error si és només popup tancat
      if (err.message?.includes('popup_closed')) {
        // No mostrar error si l'usuari simplement tanca el popup
        errorMsg = null
      } else if (err.message?.includes('access_denied')) {
        errorMsg = 'Accés denegat. Assegura\'t d\'acceptar els permisos.'
      } else if (err.message && !err.message.includes('popup')) {
        errorMsg = 'Error connectant a Google Drive'
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

  const driveButtonClass = `drive-btn ${compact ? 'drive-btn--compact' : ''} ${isConnected ? 'drive--on' : 'drive--off'}`
  const driveStatusText = isConnected ? (userName || 'Connectat') : 'Desconnectat'
  const driveActionText = isConnected ? 'Desconnectar' : 'Connectar'

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
      <Button
        variant="secondary"
        onClick={isConnected ? handleDisconnect : handleConnect}
        className={driveButtonClass}
        title={isConnected ? `Connectat com ${userName}. Clica per desconnectar.` : 'Clica per connectar amb Google Drive'}
      >
        <span className="drive-btn__left">
          <img
            src={driveIcon}
            alt="Google Drive"
            width={18}
            height={18}
            className="drive-btn__icon"
          />
          <span className="drive-btn__text">
            <span className="drive-btn__title">Drive</span>
            <span className="drive-btn__sub">{driveStatusText}</span>
          </span>
        </span>
        <span className="drive-btn__cta">{driveActionText}</span>
      </Button>
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
          <Button variant="secondary" onClick={handleRetry}>
            <RefreshCw size={14} />
            Reintentar
          </Button>
        </div>
      ) : (
        <Button
          variant="secondary"
          onClick={isConnected ? handleDisconnect : handleConnect}
          disabled={!isConnected && isLoading}
          className={driveButtonClass}
          title={isConnected ? `Connectat com ${userName}. Clica per desconnectar.` : 'Clica per connectar amb Google Drive'}
        >
          <span className="drive-btn__left">
            <img
              src={driveIcon}
              alt="Google Drive"
              width={18}
              height={18}
              className="drive-btn__icon"
            />
            <span className="drive-btn__text">
              <span className="drive-btn__title">Drive</span>
              <span className="drive-btn__sub">{driveStatusText}</span>
            </span>
          </span>
          <span className="drive-btn__cta">{driveActionText}</span>
        </Button>
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
    border: '1px solid #3730a3',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'background-color 0.2s'
  },
  buttonConnectDisabled: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    backgroundColor: '#9ca3af',
    color: 'white',
    border: '1px solid #78716c',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '500',
    cursor: 'not-allowed',
    opacity: 0.6
  },
  buttonRetry: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    backgroundColor: '#f59e0b',
    color: 'white',
    border: '1px solid #d97706',
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
    border: '1px solid var(--border-color, #e5e7eb)',
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
