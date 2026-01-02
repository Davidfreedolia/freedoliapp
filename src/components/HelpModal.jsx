import React, { useState } from 'react'
import { X, Search, BookOpen, ChevronRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useApp } from '../context/AppContext'
import { getAllSections } from '../help/helpContent'
import { useBreakpoint } from '../hooks/useBreakpoint'
import { getModalStyles } from '../utils/responsiveStyles'

export default function HelpModal({ isOpen, onClose, darkMode }) {
  const { t } = useTranslation()
  const { isMobile } = useBreakpoint()
  const [selectedSection, setSelectedSection] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const modalStyles = getModalStyles(isMobile, darkMode)

  // Safe translation helper
  const tSafe = (key, fallback) => {
    try {
      const translated = t(key)
      return translated !== key ? translated : fallback
    } catch {
      return fallback
    }
  }

  if (!isOpen) return null

  const sections = getAllSections()

  // Filter sections by search query - simplified to avoid bundling issues
  const getFilteredSections = () => {
    if (!searchQuery) return sections
    const query = searchQuery.toLowerCase()
    return sections.filter(section => {
      const sectionTitle = (section.title || '').toLowerCase()
      const sectionLong = (section.long || '').toLowerCase()
      
      if (sectionTitle.includes(query) || sectionLong.includes(query)) {
        return true
      }
      
      if (section.fields) {
        return Object.values(section.fields).some(field => {
          const fieldTitle = (field.title || '').toLowerCase()
          const fieldLong = (field.long || '').toLowerCase()
          return fieldTitle.includes(query) || fieldLong.includes(query)
        })
      }
      
      return false
    })
  }
  
  const filteredSections = getFilteredSections()

  const handleSectionClick = (sectionKey) => {
    if (selectedSection === sectionKey) {
      setSelectedSection(null)
    } else {
      setSelectedSection(sectionKey)
    }
  }

  return (
    <div style={modalStyles.overlay} onClick={onClose}>
      <div 
        style={modalStyles.modal}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={modalStyles.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <BookOpen size={24} color={darkMode ? '#ffffff' : '#111827'} />
            <h2 style={{
              margin: 0,
              fontSize: '20px',
              fontWeight: '600',
              color: darkMode ? '#ffffff' : '#111827'
            }}>
              {tSafe('help.title', 'Help & Documentation')}
            </h2>
          </div>
          <button
            onClick={onClose}
            style={modalStyles.closeButton}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = darkMode ? '#2a2a3a' : '#f3f4f6'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent'
            }}
            aria-label={tSafe('common.close', 'Close')}
          >
            <X size={20} />
          </button>
        </div>

        {/* Search */}
        <div style={{
          padding: '16px 24px',
          borderBottom: `1px solid ${darkMode ? '#2a2a3a' : '#e5e7eb'}`
        }}>
          <div style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center'
          }}>
            <Search 
              size={18} 
              style={{
                position: 'absolute',
                left: '12px',
                color: darkMode ? '#9ca3af' : '#6b7280'
              }}
            />
            <input
              type="text"
              placeholder={tSafe('help.searchPlaceholder', 'Search help...')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px 10px 40px',
                borderRadius: '8px',
                border: `1px solid ${darkMode ? '#374151' : '#d1d5db'}`,
                backgroundColor: darkMode ? '#15151f' : '#f9fafb',
                color: darkMode ? '#ffffff' : '#111827',
                fontSize: '14px',
                outline: 'none'
              }}
            />
          </div>
        </div>

        {/* Content */}
        <div style={{
          ...modalStyles.body,
          maxHeight: '60vh',
          overflowY: 'auto'
        }}>
          {filteredSections.length === 0 ? (
            <div style={{
              padding: '48px',
              textAlign: 'center',
              color: darkMode ? '#9ca3af' : '#6b7280'
            }}>
              {tSafe('help.noResults', 'No results found')}
            </div>
          ) : (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              {filteredSections.map((section) => {
                const isOpen = selectedSection === section.key
                return (
                  <div key={section.key}>
                    <button
                      onClick={() => handleSectionClick(section.key)}
                      style={{
                        width: '100%',
                        padding: '16px',
                        textAlign: 'left',
                        backgroundColor: isOpen 
                          ? (darkMode ? '#1f1f2e' : '#f3f4f6')
                          : 'transparent',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        color: darkMode ? '#ffffff' : '#111827',
                        fontSize: '16px',
                        fontWeight: '500',
                        transition: 'background-color 0.2s'
                      }}
                    >
                      <span>{tSafe(section.title, section.title)}</span>
                      <ChevronRight 
                        size={20} 
                        style={{
                          transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
                          transition: 'transform 0.2s'
                        }}
                      />
                    </button>
                    {isOpen && (
                      <div style={{
                        padding: '0 16px 16px 16px',
                        color: darkMode ? '#d1d5db' : '#6b7280',
                        fontSize: '14px',
                        lineHeight: '1.6'
                      }}>
                        <p style={{ margin: '0 0 12px' }}>
                          {tSafe(section.long, section.long)}
                        </p>
                        {section.fields && (
                          <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '12px'
                          }}>
                            {Object.entries(section.fields).map(([key, field]) => (
                              <div key={key} style={{
                                padding: '12px',
                                backgroundColor: darkMode ? '#15151f' : '#ffffff',
                                borderRadius: '8px',
                                border: `1px solid ${darkMode ? '#2a2a3a' : '#e5e7eb'}`
                              }}>
                                <h4 style={{
                                  margin: '0 0 4px',
                                  fontSize: '14px',
                                  fontWeight: '600',
                                  color: darkMode ? '#ffffff' : '#111827'
                                }}>
                                  {tSafe(field.title, field.title)}
                                </h4>
                                <p style={{
                                  margin: 0,
                                  fontSize: '13px',
                                  color: darkMode ? '#9ca3af' : '#6b7280'
                                }}>
                                  {tSafe(field.long, field.long)}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

