import { useState } from 'react'
import { BookOpen, ChevronRight, Search, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useApp } from '../context/AppContext'
import Header from '../components/Header'
import { getAllSections } from '../help/helpContent'
import { useBreakpoint } from '../hooks/useBreakpoint'

export default function Help() {
  const { darkMode } = useApp()
  const { t } = useTranslation()
  const { isMobile } = useBreakpoint()
  const [selectedSection, setSelectedSection] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')

  const sections = getAllSections()

  // Filter sections by search query
  const filteredSections = sections.filter(section => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    const sectionTitle = t(section.title).toLowerCase()
    const sectionLong = t(section.long).toLowerCase()
    
    // Check section title and description
    if (sectionTitle.includes(query) || sectionLong.includes(query)) {
      return true
    }
    
    // Check fields
    if (section.fields) {
      return Object.values(section.fields).some(field => {
        const fieldTitle = t(field.title).toLowerCase()
        const fieldLong = t(field.long).toLowerCase()
        return fieldTitle.includes(query) || fieldLong.includes(query)
      })
    }
    
    return false
  })

  const handleSectionClick = (sectionKey) => {
    if (selectedSection === sectionKey) {
      setSelectedSection(null)
    } else {
      setSelectedSection(sectionKey)
    }
  }

  const styles = {
    container: {
      minHeight: '100vh',
      backgroundColor: darkMode ? '#0f0f1a' : 'var(--surface-bg-2)',
      padding: isMobile ? '16px' : '24px',
      paddingTop: '80px'
    },
    header: {
      marginBottom: '32px'
    },
    title: {
      fontSize: isMobile ? '24px' : '32px',
      fontWeight: '700',
      color: darkMode ? '#ffffff' : 'var(--text-1)',
      marginBottom: '8px',
      display: 'flex',
      alignItems: 'center',
      gap: '12px'
    },
    subtitle: {
      fontSize: '16px',
      color: darkMode ? 'var(--muted-1)' : 'var(--text-2)',
      marginBottom: '24px'
    },
    searchContainer: {
      marginBottom: '24px',
      position: 'relative'
    },
    searchInput: {
      width: '100%',
      padding: '12px 16px',
      paddingRight: '40px',
      borderRadius: '8px',
      border: `1px solid ${darkMode ? 'var(--text-1)' : 'var(--border-1)'}`,
      backgroundColor: darkMode ? '#1f1f2e' : '#ffffff',
      color: darkMode ? '#ffffff' : 'var(--text-1)',
      fontSize: '14px'
    },
    searchIcon: {
      position: 'absolute',
      right: '12px',
      top: '50%',
      transform: 'translateY(-50%)',
      color: darkMode ? 'var(--muted-1)' : 'var(--text-2)'
    },
    sectionsList: {
      display: 'flex',
      flexDirection: 'column',
      gap: '12px'
    },
    sectionCard: {
      backgroundColor: darkMode ? '#15151f' : '#ffffff',
      border: `1px solid ${darkMode ? '#2a2a3a' : 'var(--border-1)'}`,
      borderRadius: '8px',
      padding: '16px',
      cursor: 'pointer',
      transition: 'all 0.2s'
    },
    sectionHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    },
    sectionTitle: {
      fontSize: '18px',
      fontWeight: '600',
      color: darkMode ? '#ffffff' : 'var(--text-1)',
      marginBottom: '4px'
    },
    sectionShort: {
      fontSize: '14px',
      color: darkMode ? 'var(--muted-1)' : 'var(--text-2)',
      marginBottom: '8px'
    },
    chevron: {
      color: darkMode ? 'var(--muted-1)' : 'var(--text-2)',
      transition: 'transform 0.2s',
      transform: selectedSection ? 'rotate(90deg)' : 'rotate(0deg)'
    },
    fieldsList: {
      marginTop: '16px',
      paddingTop: '16px',
      borderTop: `1px solid ${darkMode ? '#2a2a3a' : 'var(--border-1)'}`,
      display: 'flex',
      flexDirection: 'column',
      gap: '16px'
    },
    fieldItem: {
      padding: '12px',
      backgroundColor: darkMode ? '#1f1f2e' : 'var(--surface-bg-2)',
      borderRadius: '6px',
      border: `1px solid ${darkMode ? '#2a2a3a' : 'var(--border-1)'}`
    },
    fieldTitle: {
      fontSize: '15px',
      fontWeight: '600',
      color: darkMode ? '#ffffff' : 'var(--text-1)',
      marginBottom: '6px'
    },
    fieldLong: {
      fontSize: '13px',
      color: darkMode ? 'var(--border-1)' : 'var(--text-1)',
      lineHeight: '1.6',
      marginBottom: '8px'
    },
    fieldExample: {
      fontSize: '12px',
      color: darkMode ? 'var(--muted-1)' : 'var(--text-2)',
      fontStyle: 'italic',
      padding: '8px',
      backgroundColor: darkMode ? 'var(--text-1)' : 'var(--surface-bg-2)',
      borderRadius: '4px',
      marginTop: '8px'
    },
    emptyState: {
      textAlign: 'center',
      padding: '48px 24px',
      color: darkMode ? 'var(--muted-1)' : 'var(--text-2)'
    },
    emptyTitle: {
      fontSize: '18px',
      fontWeight: '600',
      marginBottom: '8px',
      color: darkMode ? '#ffffff' : 'var(--text-1)'
    }
  }

  return (
    <div style={styles.container}>
      <Header />
      
      <div style={styles.header}>
        <h1 style={styles.title}>
          <BookOpen size={32} />
          Manual d'ús
        </h1>
        <p style={styles.subtitle}>
          Trobareu informació detallada sobre totes les funcionalitats de Freedoliapp
        </p>
      </div>

      {/* Search */}
      <div style={styles.searchContainer}>
        <input
          type="text"
          placeholder={t('help.searchPlaceholder', 'Cerca al manual...')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={styles.searchInput}
        />
        <Search size={18} style={styles.searchIcon} />
      </div>

      {/* Sections List */}
      {filteredSections.length === 0 ? (
        <div style={styles.emptyState}>
          <div style={styles.emptyTitle}>No s'han trobat resultats</div>
          <p>Prova amb altres paraules clau</p>
        </div>
      ) : (
        <div style={styles.sectionsList}>
          {filteredSections.map((section) => {
            const sectionKey = section.key
            const isExpanded = selectedSection === sectionKey
            const sectionTitle = t(section.title)
            const sectionShort = t(section.short)
            const sectionLong = t(section.long)
            const fields = section.fields || {}

            return (
              <div key={sectionKey} style={styles.sectionCard}>
                <div
                  onClick={() => handleSectionClick(sectionKey)}
                  style={styles.sectionHeader}
                >
                  <div style={{ flex: 1 }}>
                    <div style={styles.sectionTitle}>{sectionTitle}</div>
                    <div style={styles.sectionShort}>{sectionShort}</div>
                  </div>
                  <ChevronRight size={20} style={styles.chevron} />
                </div>

                {isExpanded && (
                  <div>
                    <p style={{
                      ...styles.fieldLong,
                      marginBottom: '16px',
                      padding: '12px',
                      backgroundColor: darkMode ? '#1f1f2e' : 'var(--surface-bg-2)',
                      borderRadius: '6px'
                    }}>
                      {sectionLong}
                    </p>

                    {Object.keys(fields).length > 0 && (
                      <div style={styles.fieldsList}>
                        {Object.entries(fields).map(([fieldKey, field]) => {
                          const fieldTitle = t(field.title)
                          const fieldLong = t(field.long)
                          const fieldExample = field.example ? t(field.example) : null

                          return (
                            <div key={fieldKey} style={styles.fieldItem}>
                              <div style={styles.fieldTitle}>{fieldTitle}</div>
                              <div style={styles.fieldLong}>{fieldLong}</div>
                              {fieldExample && (
                                <div style={styles.fieldExample}>
                                  {fieldExample}
                                </div>
                              )}
                            </div>
                          )
                        })}
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
  )
}

