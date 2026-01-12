import { useState, useEffect, useRef } from 'react'
import { useApp } from '../context/AppContext'
import { Clock, Plus, X } from 'lucide-react'
import { useBreakpoint } from '../hooks/useBreakpoint'

const STORAGE_KEY = 'freedoliapp.timezones'

// Zonas horarias comunes
const COMMON_TIMEZONES = [
  { value: 'America/New_York', label: 'New York (EST)' },
  { value: 'America/Los_Angeles', label: 'Los Angeles (PST)' },
  { value: 'Europe/London', label: 'London (GMT)' },
  { value: 'Europe/Paris', label: 'Paris (CET)' },
  { value: 'Europe/Madrid', label: 'Madrid (CET)' },
  { value: 'Europe/Berlin', label: 'Berlin (CET)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'Asia/Hong_Kong', label: 'Hong Kong (HKT)' },
  { value: 'Asia/Dubai', label: 'Dubai (GST)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEDT)' },
  { value: 'America/Sao_Paulo', label: 'São Paulo (BRT)' },
  { value: 'America/Mexico_City', label: 'Mexico City (CST)' }
]

/**
 * Get local timezone name
 */
function getLocalTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone
  } catch {
    return 'UTC'
  }
}

/**
 * Format time for a timezone
 */
function formatTime(timezone) {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: timezone
    })
    return formatter.format(new Date())
  } catch (err) {
    console.error(`Error formatting time for ${timezone}:`, err)
    return '--:--'
  }
}

/**
 * Get timezone label
 */
function getTimezoneLabel(timezone) {
  if (timezone === 'Asia/Shanghai') return 'China'
  
  // Try to get a short name from common timezones
  const common = COMMON_TIMEZONES.find(tz => tz.value === timezone)
  if (common) {
    // Extract city name (before the parenthesis)
    return common.label.split(' (')[0]
  }
  
  // Extract city name from timezone string (e.g., "America/New_York" -> "New York")
  const parts = timezone.split('/')
  return parts[parts.length - 1].replace(/_/g, ' ')
}

export default function WorldClocks() {
  const { darkMode } = useApp()
  const { isMobile } = useBreakpoint()
  const [currentTime, setCurrentTime] = useState(new Date())
  const [customTimezones, setCustomTimezones] = useState([])
  const [showAddDropdown, setShowAddDropdown] = useState(false)
  const intervalRef = useRef(null)
  const dropdownRef = useRef(null)

  const localTimezone = getLocalTimezone()

  // Load custom timezones from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed)) {
          setCustomTimezones(parsed)
        }
      }
    } catch (err) {
      console.error('Error loading timezones from localStorage:', err)
    }
  }, [])

  // Save custom timezones to localStorage
  const saveTimezones = (timezones) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(timezones))
      setCustomTimezones(timezones)
    } catch (err) {
      console.error('Error saving timezones to localStorage:', err)
    }
  }

  // Update time every minute
  useEffect(() => {
    // Update immediately
    setCurrentTime(new Date())

    // Then update every minute
    intervalRef.current = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000) // 60000ms = 1 minute

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!showAddDropdown) return

    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowAddDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showAddDropdown])

  // Build list of timezones to display
  const displayTimezones = [
    { timezone: localTimezone, label: 'Local', isRequired: true },
    { timezone: 'Asia/Shanghai', label: 'China', isRequired: true },
    ...customTimezones.map(tz => ({
      timezone: tz,
      label: getTimezoneLabel(tz),
      isRequired: false
    }))
  ]

  // Available timezones for adding (exclude already added ones)
  const availableTimezones = COMMON_TIMEZONES.filter(
    tz => !customTimezones.includes(tz.value) && 
          tz.value !== localTimezone && 
          tz.value !== 'Asia/Shanghai'
  )

  const handleAddTimezone = (timezone) => {
    if (!customTimezones.includes(timezone)) {
      saveTimezones([...customTimezones, timezone])
    }
    setShowAddDropdown(false)
  }

  const handleRemoveTimezone = (timezone) => {
    saveTimezones(customTimezones.filter(tz => tz !== timezone))
  }

  const styles = {
    container: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      flexWrap: 'wrap'
    },
    clock: {
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      padding: '6px 10px',
      borderRadius: '8px',
      backgroundColor: darkMode ? '#1f1f2e' : '#f3f4f6',
      border: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`,
      fontSize: '13px',
      color: darkMode ? '#ffffff' : '#111827',
      position: 'relative'
    },
    clockLabel: {
      fontWeight: '500',
      color: darkMode ? '#9ca3af' : '#6b7280',
      fontSize: '12px'
    },
    clockTime: {
      fontFamily: 'monospace',
      fontWeight: '600',
      color: darkMode ? '#ffffff' : '#111827'
    },
    removeButton: {
      marginLeft: '4px',
      padding: '2px',
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      color: darkMode ? '#9ca3af' : '#6b7280',
      borderRadius: '4px',
      transition: 'all 0.2s'
    },
    addButton: {
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      padding: '6px 10px',
      borderRadius: '8px',
      backgroundColor: darkMode ? '#1f1f2e' : '#f3f4f6',
      border: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`,
      cursor: 'pointer',
      fontSize: '13px',
      color: darkMode ? '#ffffff' : '#111827',
      position: 'relative'
    },
    dropdown: {
      position: 'absolute',
      top: '100%',
      right: 0,
      marginTop: '8px',
      backgroundColor: darkMode ? '#15151f' : '#ffffff',
      border: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`,
      borderRadius: '8px',
      boxShadow: darkMode ? '0 4px 6px rgba(0,0,0,0.3)' : '0 4px 6px rgba(0,0,0,0.1)',
      minWidth: '200px',
      maxHeight: '300px',
      overflowY: 'auto',
      zIndex: 1000
    },
    dropdownItem: {
      padding: '10px 14px',
      cursor: 'pointer',
      fontSize: '13px',
      color: darkMode ? '#ffffff' : '#111827',
      borderBottom: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`,
      transition: 'background-color 0.2s'
    },
    dropdownItemLast: {
      borderBottom: 'none'
    }
  }

  // Don't render on mobile if too many clocks (space constraint)
  if (isMobile && displayTimezones.length > 2) {
    return null
  }

  return (
    <div style={styles.container}>
      {displayTimezones.map(({ timezone, label, isRequired }) => (
        <div key={timezone} style={styles.clock}>
          <Clock size={14} color={darkMode ? '#9ca3af' : '#6b7280'} />
          <span style={styles.clockLabel}>{label}:</span>
          <span style={styles.clockTime}>{formatTime(timezone)}</span>
          {!isRequired && (
            <button
              onClick={() => handleRemoveTimezone(timezone)}
              style={styles.removeButton}
              title="Eliminar"
              aria-label="Eliminar zona horaria"
            >
              <X size={12} />
            </button>
          )}
        </div>
      ))}
      
      {availableTimezones.length > 0 && (
        <div ref={dropdownRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setShowAddDropdown(!showAddDropdown)}
            style={styles.addButton}
            title="Afegir zona horaria"
            aria-label="Afegir zona horaria"
          >
            <Plus size={14} />
            {!isMobile && <span>Afegir</span>}
          </button>
          
          {showAddDropdown && (
            <div style={styles.dropdown}>
              {availableTimezones.map((tz, index) => (
                <div
                  key={tz.value}
                  onClick={() => handleAddTimezone(tz.value)}
                  style={{
                    ...styles.dropdownItem,
                    ...(index === availableTimezones.length - 1 ? styles.dropdownItemLast : {}),
                    backgroundColor: 'transparent'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = darkMode ? '#1f1f2e' : '#f3f4f6'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent'
                  }}
                >
                  {tz.label}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
