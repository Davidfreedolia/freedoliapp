import React, { useState, useEffect, useRef } from 'react'
import { Clock, Plus, X } from 'lucide-react'
import { useApp } from '../context/AppContext'
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

function getLocalTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone
  } catch {
    return 'UTC'
  }
}

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

function getTimezoneLabel(timezone) {
  if (timezone === 'Asia/Shanghai') return 'China'
  const common = COMMON_TIMEZONES.find(tz => tz.value === timezone)
  if (common) {
    return common.label.split(' (')[0]
  }
  const parts = timezone.split('/')
  return parts[parts.length - 1].replace(/_/g, ' ')
}

/**
 * HeaderTimeWidget - Compact time widget for navbar
 * Shows Local + China time + "Add timezone" button
 */
export default function HeaderTimeWidget() {
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
    setCurrentTime(new Date())
    intervalRef.current = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000)
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

  // Build list of timezones to display (Local + China + custom)
  const displayTimezones = [
    { timezone: localTimezone, label: 'Local', isRequired: true },
    { timezone: 'Asia/Shanghai', label: 'China', isRequired: true },
    ...customTimezones.map(tz => ({
      timezone: tz,
      label: getTimezoneLabel(tz),
      isRequired: false
    }))
  ]

  // Available timezones for adding
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

  const widgetStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--spacing-xs)',
    padding: 'var(--spacing-xs) var(--spacing-sm)',
    borderRadius: 'var(--radius-ui)',
    backgroundColor: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    fontSize: '13px'
  }

  const clockStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    color: 'var(--color-text)'
  }

  const clockLabelStyle = {
    fontWeight: '500',
    color: 'var(--color-muted)',
    fontSize: '12px'
  }

  const clockTimeStyle = {
    fontFamily: 'monospace',
    fontWeight: '600',
    color: 'var(--color-text)'
  }

  const addButtonStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px 8px',
    borderRadius: 'var(--radius-ui)',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    fontSize: '12px',
    color: 'var(--color-muted)',
    transition: 'all 0.15s ease',
    position: 'relative'
  }

  const removeButtonStyle = {
    marginLeft: '4px',
    padding: '2px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    color: 'var(--color-muted)',
    borderRadius: '4px',
    transition: 'all 0.15s ease'
  }

  const dropdownStyle = {
    position: 'absolute',
    top: '100%',
    right: 0,
    marginTop: 'var(--spacing-xs)',
    backgroundColor: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-ui)',
    boxShadow: 'var(--shadow-md)',
    minWidth: '200px',
    maxHeight: '300px',
    overflowY: 'auto',
    zIndex: 1000
  }

  const dropdownItemStyle = {
    padding: '10px 14px',
    cursor: 'pointer',
    fontSize: '13px',
    color: 'var(--color-text)',
    borderBottom: '1px solid var(--color-border)',
    transition: 'background-color 0.15s ease'
  }

  // On mobile, show only Local + China (no custom timezones)
  const visibleTimezones = isMobile 
    ? displayTimezones.filter(tz => tz.isRequired)
    : displayTimezones.slice(0, 3) // Max 3 timezones in widget

  return (
    <div style={widgetStyle}>
      {visibleTimezones.map(({ timezone, label, isRequired }) => (
        <div key={timezone} style={clockStyle}>
          <Clock size={14} color="var(--color-muted)" />
          <span style={clockLabelStyle}>{label}:</span>
          <span style={clockTimeStyle}>{formatTime(timezone)}</span>
          {!isRequired && !isMobile && (
            <button
              onClick={() => handleRemoveTimezone(timezone)}
              style={removeButtonStyle}
              title="Eliminar"
              aria-label="Eliminar zona horaria"
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--color-bg)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent'
              }}
            >
              <X size={12} />
            </button>
          )}
        </div>
      ))}
      
      {availableTimezones.length > 0 && !isMobile && (
        <div ref={dropdownRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setShowAddDropdown(!showAddDropdown)}
            style={addButtonStyle}
            title="Afegir zona horaria"
            aria-label="Afegir zona horaria"
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-bg)'
              e.currentTarget.style.color = 'var(--color-text)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent'
              e.currentTarget.style.color = 'var(--color-muted)'
            }}
          >
            <Plus size={14} />
            <span>Afegir</span>
          </button>
          
          {showAddDropdown && (
            <div style={dropdownStyle}>
              {availableTimezones.map((tz, index) => (
                <div
                  key={tz.value}
                  onClick={() => handleAddTimezone(tz.value)}
                  style={{
                    ...dropdownItemStyle,
                    ...(index === availableTimezones.length - 1 ? { borderBottom: 'none' } : {})
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--color-bg)'
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
