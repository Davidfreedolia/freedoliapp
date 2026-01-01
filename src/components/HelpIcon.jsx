import { useState, useRef, useEffect } from 'react'
import { HelpCircle, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { getHelpContent } from '../help/helpContent'
import { useBreakpoint } from '../hooks/useBreakpoint'

/**
 * HelpIcon Component
 * 
 * Reusable help icon with tooltip (hover) and popover (click)
 * 
 * @param {string} helpKey - Help key (e.g., 'profitability.cogs')
 * @param {string} size - Icon size ('small' | 'medium' | 'large')
 * @param {object} style - Additional styles
 */
export default function HelpIcon({ helpKey, size = 'small', style = {}, darkMode = false }) {
  const { t } = useTranslation()
  const { isMobile } = useBreakpoint()
  const [showTooltip, setShowTooltip] = useState(false)
  const [showPopover, setShowPopover] = useState(false)
  const iconRef = useRef(null)
  const popoverRef = useRef(null)
  const tooltipTimeoutRef = useRef(null)

  const helpContent = getHelpContent(helpKey)

  // Icon size mapping
  const iconSizes = {
    small: 16,
    medium: 18,
    large: 20
  }

  const iconSize = iconSizes[size] || iconSizes.small

  // Handle click outside to close popover
  useEffect(() => {
    if (showPopover) {
      const handleClickOutside = (event) => {
        if (
          popoverRef.current &&
          !popoverRef.current.contains(event.target) &&
          iconRef.current &&
          !iconRef.current.contains(event.target)
        ) {
          setShowPopover(false)
        }
      }

      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [showPopover])

  const handleMouseEnter = () => {
    if (!isMobile && !showPopover) {
      tooltipTimeoutRef.current = setTimeout(() => {
        setShowTooltip(true)
      }, 300) // Small delay to avoid accidental tooltips
    }
  }

  const handleMouseLeave = () => {
    if (tooltipTimeoutRef.current) {
      clearTimeout(tooltipTimeoutRef.current)
    }
    setShowTooltip(false)
  }

  const handleClick = () => {
    setShowTooltip(false)
    setShowPopover(!showPopover)
  }

  if (!helpContent) {
    console.warn(`Help content not found for key: ${helpKey}`)
    return null
  }

  const title = t(helpContent.title)
  const short = t(helpContent.short)
  const long = t(helpContent.long)
  const example = helpContent.example ? t(helpContent.example) : null

  return (
    <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      <span
        ref={iconRef}
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          cursor: 'pointer',
          marginLeft: '4px',
          color: darkMode ? '#9ca3af' : '#6b7280',
          transition: 'color 0.2s',
          ...style
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.color = darkMode ? '#d1d5db' : '#374151'
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.color = darkMode ? '#9ca3af' : '#6b7280'
        }}
        aria-label={title}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            handleClick()
          }
        }}
      >
        <HelpCircle size={iconSize} />
      </span>

      {/* Tooltip (desktop hover) */}
      {showTooltip && !isMobile && !showPopover && (
        <div
          style={{
            position: 'absolute',
            bottom: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            marginBottom: '8px',
            zIndex: 1000,
            backgroundColor: darkMode ? '#1f2937' : '#111827',
            color: darkMode ? '#f3f4f6' : '#ffffff',
            padding: '8px 12px',
            borderRadius: '6px',
            fontSize: '13px',
            maxWidth: '250px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            pointerEvents: 'none',
            whiteSpace: 'nowrap'
          }}
        >
          {short}
          <div
            style={{
              position: 'absolute',
              top: '100%',
              left: '50%',
              transform: 'translateX(-50%) rotate(45deg)',
              width: '8px',
              height: '8px',
              backgroundColor: darkMode ? '#1f2937' : '#111827',
              marginTop: '-4px'
            }}
          />
        </div>
      )}

      {/* Popover (click) */}
      {showPopover && (
        <div
          ref={popoverRef}
          style={{
            position: 'absolute',
            bottom: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            marginBottom: '8px',
            zIndex: 1001,
            backgroundColor: darkMode ? '#1f2937' : '#ffffff',
            border: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`,
            borderRadius: '8px',
            padding: '16px',
            maxWidth: '320px',
            minWidth: '280px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
            <h4
              style={{
                margin: 0,
                fontSize: '15px',
                fontWeight: '600',
                color: darkMode ? '#f3f4f6' : '#111827'
              }}
            >
              {title}
            </h4>
            <button
              onClick={() => setShowPopover(false)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: darkMode ? '#9ca3af' : '#6b7280',
                padding: '0',
                display: 'flex',
                alignItems: 'center',
                marginLeft: '8px'
              }}
              aria-label="Tancar"
            >
              <X size={16} />
            </button>
          </div>
          <p
            style={{
              margin: '0 0 8px 0',
              fontSize: '13px',
              lineHeight: '1.5',
              color: darkMode ? '#d1d5db' : '#374151'
            }}
          >
            {long}
          </p>
          {example && (
            <div
              style={{
                marginTop: '8px',
                padding: '8px',
                backgroundColor: darkMode ? '#111827' : '#f3f4f6',
                borderRadius: '4px',
                fontSize: '12px',
                color: darkMode ? '#9ca3af' : '#6b7280',
                fontStyle: 'italic'
              }}
            >
              {example}
            </div>
          )}
        </div>
      )}
    </span>
  )
}

