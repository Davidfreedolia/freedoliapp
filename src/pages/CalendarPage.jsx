import { useState, useMemo, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Calendar, momentLocalizer } from 'react-big-calendar'
import moment from 'moment'
import 'moment/locale/ca'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import { useTranslation } from 'react-i18next'
import { useBreakpoint } from '../hooks/useBreakpoint'
import { useApp } from '../context/AppContext'
import Header from '../components/Header'
import Button from '../components/Button'
import AppToolbar from '../components/ui/AppToolbar'
import { useProjectCalendarEvents } from '../features/calendar/useProjectCalendarEvents'
import { getProjects } from '../lib/supabase'
import { Calendar as CalendarIcon, Filter, X } from 'lucide-react'

// Create localizer (locale will be set dynamically based on i18n)
const localizer = momentLocalizer(moment)

// Map i18n language codes to moment locale codes
const getMomentLocale = (i18nLang) => {
  const langMap = { ca: 'ca', en: 'en', es: 'es' }
  return langMap[i18nLang] || 'ca'
}

// Configure locales for week starting Monday
const configureLocale = (locale) => {
  moment.updateLocale(locale, {
    week: {
      dow: 1, // Monday is the first day of the week
      doy: 4  // The week that contains Jan 4th is the first week of the year
    }
  })
}

// Configure default locale
moment.locale('ca')
configureLocale('ca')

const VIEWS = {
  MONTH: 'month',
  WEEK: 'week',
  DAY: 'day',
  AGENDA: 'agenda'
}

export default function CalendarPage() {
  const { darkMode, projects: contextProjects } = useApp()
  const navigate = useNavigate()
  const { isMobile } = useBreakpoint()
  const { t, i18n } = useTranslation()
  
  const [view, setView] = useState(isMobile ? 'agenda' : 'month')
  const [date, setDate] = useState(new Date())
  const [projects, setProjects] = useState([])
  const [filterProjectId, setFilterProjectId] = useState(null)
  const [filterType, setFilterType] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  
  // Update moment locale when i18n language changes
  useEffect(() => {
    const momentLocale = getMomentLocale(i18n.language)
    moment.locale(momentLocale)
    configureLocale(momentLocale)
  }, [i18n.language])
  
  // Get current moment locale
  const currentMomentLocale = getMomentLocale(i18n.language)
  
  // Calculate date range based on current view and date
  const { fromDate, toDate } = useMemo(() => {
    const start = moment(date).startOf(view === 'month' ? 'month' : view === 'week' ? 'isoWeek' : 'day')
    const end = moment(date).endOf(view === 'month' ? 'month' : view === 'week' ? 'isoWeek' : 'day')
    
    // Extend range for week/month views to ensure we fetch enough data
    if (view === 'month') {
      start.subtract(7, 'days') // Include previous week
      end.add(7, 'days') // Include next week
    } else if (view === 'week') {
      start.subtract(1, 'day') // Include previous day
      end.add(1, 'day') // Include next day
    }
    
    return {
      fromDate: start.toDate(),
      toDate: end.toDate()
    }
  }, [date, view])
  
  const { data, loading, error } = useProjectCalendarEvents({
    from: fromDate,
    to: toDate,
    projectId: filterProjectId
  })
  
  // Load projects if not available in context
  useEffect(() => {
    const loadProjects = async () => {
      if (contextProjects && contextProjects.length > 0) {
        setProjects(contextProjects)
      } else {
        try {
          const projectsData = await getProjects()
          setProjects(projectsData || [])
        } catch (err) {
          console.error('Error loading projects:', err)
        }
      }
    }
    loadProjects()
  }, [contextProjects])
  
  // Convert project_events to react-big-calendar format
  const calendarEvents = useMemo(() => {
    if (!data || !Array.isArray(data)) return []
    
    let filtered = data
    
    // Client-side filtering by type
    if (filterType) {
      filtered = filtered.filter(event => event.type === filterType)
    }
    
    // Client-side filtering by search term
    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      filtered = filtered.filter(event => 
        event.title?.toLowerCase().includes(search) ||
        event.notes?.toLowerCase().includes(search) ||
        event.project?.name?.toLowerCase().includes(search) ||
        event.project?.code?.toLowerCase().includes(search)
      )
    }
    
    return filtered.map(event => ({
      id: event.id,
      title: event.title,
      start: new Date(event.event_date + 'T00:00:00'),
      end: new Date(event.event_date + 'T23:59:59'),
      resource: event // Store full event data for click handler
    }))
  }, [data, filterType, searchTerm])
  
  const handleEventClick = useCallback((event) => {
    if (event.resource?.project?.id) {
      navigate(`/projects/${event.resource.project.id}`)
    }
  }, [navigate])
  
  const handleViewChange = useCallback((newView) => {
    setView(newView)
  }, [])
  
  const handleNavigate = useCallback((newDate) => {
    setDate(newDate)
  }, [])
  
  const eventStyleGetter = (event) => {
    const type = event.resource?.type || 'milestone'
    let backgroundColor = '#4f46e5'
    
    switch (type) {
      case 'milestone':
        backgroundColor = '#4f46e5'
        break
      case 'meeting':
        backgroundColor = '#3b82f6'
        break
      case 'deadline':
        backgroundColor = '#ef4444'
        break
      case 'delivery':
        backgroundColor = '#10b981'
        break
      default:
        backgroundColor = '#6b7280'
    }
    
    return {
      style: {
        backgroundColor,
        borderColor: backgroundColor,
        color: '#ffffff',
        borderRadius: '10px', // Same as --radius-base, consistent with day tiles
        border: 'none',
        padding: '6px 10px',
        fontSize: '13px',
        fontWeight: '500',
        lineHeight: '1.2',
        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)'
      }
    }
  }
  
  // Custom event component to show project info
  const CustomEvent = ({ event }) => {
    const project = event.resource?.project
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '2px',
        width: '100%',
        overflow: 'hidden'
      }}>
        <span style={{ 
          fontWeight: '600',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}>
          {event.title}
        </span>
        {project && (
          <span style={{ 
            fontSize: '10px',
            opacity: 0.9,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            {project.code || project.name}
          </span>
        )}
      </div>
    )
  }
  
  
  const styles = {
    container: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column'
    },
    content: {
      padding: isMobile ? '16px' : '32px',
      overflowY: 'auto'
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '24px',
      flexDirection: 'row',
      flexWrap: 'nowrap'
    },
    headerLeft: {
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
      flex: 1
    },
    headerRight: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      position: 'relative'
    },
    viewSelector: {
      height: 'var(--btn-h-sm)',
      padding: '0 12px',
      borderRadius: 'var(--btn-radius)',
      border: '1px solid var(--btn-ghost-border)',
      backgroundColor: 'var(--btn-ghost-bg)',
      color: 'var(--btn-ghost-fg)',
      fontSize: '14px',
      cursor: 'pointer',
      outline: 'none',
      boxShadow: 'var(--btn-shadow)'
    },
    filterButton: {
      minWidth: '120px'
    },
    filterPanel: {
      position: 'absolute',
      top: '100%',
      right: 0,
      marginTop: '8px',
      zIndex: 100,
      backgroundColor: darkMode ? '#15151f' : '#ffffff',
      border: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`,
      borderRadius: '12px',
      padding: '20px',
      minWidth: '300px',
      boxShadow: darkMode ? '0 4px 6px rgba(0,0,0,0.3)' : '0 4px 6px rgba(0,0,0,0.1)'
    },
    filterSection: {
      marginBottom: '20px'
    },
    filterLabel: {
      fontSize: '13px',
      fontWeight: '600',
      color: darkMode ? '#9ca3af' : '#6b7280',
      marginBottom: '8px',
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
      display: 'block'
    },
    select: {
      width: '100%',
      padding: '8px 12px',
      backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb',
      border: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`,
      borderRadius: '6px',
      color: darkMode ? '#ffffff' : '#111827',
      fontSize: '14px',
      cursor: 'pointer',
      outline: 'none'
    },
    input: {
      width: '100%',
      padding: '8px 12px',
      backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb',
      border: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`,
      borderRadius: '6px',
      color: darkMode ? '#ffffff' : '#111827',
      fontSize: '14px',
      outline: 'none'
    },
    calendarContainer: {
      flex: 1,
      backgroundColor: darkMode ? '#15151f' : '#ffffff',
      borderRadius: '16px',
      padding: isMobile ? '16px' : '24px',
      border: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`,
      overflow: 'hidden',
      minHeight: isMobile ? '500px' : '600px',
      boxShadow: darkMode ? '0 1px 3px rgba(0, 0, 0, 0.2)' : '0 1px 3px rgba(0, 0, 0, 0.05)'
    },
    loading: {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '400px',
      color: darkMode ? '#9ca3af' : '#6b7280',
      fontSize: '16px'
    },
    error: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '60px 20px',
      color: darkMode ? '#ef4444' : '#dc2626',
      fontSize: '14px',
      backgroundColor: darkMode ? '#15151f' : '#ffffff',
      borderRadius: '12px',
      border: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`,
      marginBottom: '24px'
    }
  }
  
  // Close filters when clicking outside
  useEffect(() => {
    if (!showFilters) return
    
    const handleClickOutside = (e) => {
      if (!e.target.closest('[data-filter-panel]') && !e.target.closest('[data-filter-button]')) {
        setShowFilters(false)
      }
    }
    
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [showFilters])
  
  return (
    <div style={styles.container}>
      <Header
        title={
          <span className="page-title-with-icon">
            <CalendarIcon size={22} />
            Calendari
          </span>
        }
      />
      
      <div style={styles.content}>
        <AppToolbar style={styles.header} className="toolbar-row">
          <AppToolbar.Left>
            <div style={styles.headerLeft} className="toolbar-group">
              <select
                value={view}
                onChange={(e) => handleViewChange(e.target.value)}
                style={styles.viewSelector}
              >
                <option value={VIEWS.MONTH}>Mes</option>
                <option value={VIEWS.WEEK}>Setmana</option>
                <option value={VIEWS.DAY}>Dia</option>
                <option value={VIEWS.AGENDA}>Llista</option>
              </select>
            </div>
          </AppToolbar.Left>

          <AppToolbar.Right>
            <div style={styles.headerRight} className="toolbar-group">
            <Button
              variant="secondary"
              size="sm"
              data-filter-button
              onClick={() => setShowFilters(!showFilters)}
              style={styles.filterButton}
            >
              <Filter size={18} />
              Filtres
            </Button>
            
            {showFilters && (
              <div data-filter-panel style={styles.filterPanel}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: darkMode ? '#ffffff' : '#111827' }}>
                    Filtres
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowFilters(false)}
                    style={{ padding: '4px', minWidth: 'unset' }}
                  >
                    <X size={18} />
                  </Button>
                </div>
                
                {/* Project Filter */}
                <div style={styles.filterSection}>
                  <label style={styles.filterLabel}>Projecte</label>
                  <select
                    value={filterProjectId || ''}
                    onChange={(e) => setFilterProjectId(e.target.value || null)}
                    style={styles.select}
                  >
                    <option value="">Tots els projectes</option>
                    {projects.map(project => (
                      <option key={project.id} value={project.id}>
                        {project.name} {project.code ? `(${project.code})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                
                {/* Type Filter */}
                <div style={styles.filterSection}>
                  <label style={styles.filterLabel}>Tipus</label>
                  <select
                    value={filterType || ''}
                    onChange={(e) => setFilterType(e.target.value || null)}
                    style={styles.select}
                  >
                    <option value="">Tots els tipus</option>
                    <option value="milestone">Milestone</option>
                    <option value="meeting">Meeting</option>
                    <option value="deadline">Deadline</option>
                    <option value="delivery">Delivery</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                
                {/* Search Filter */}
                <div style={styles.filterSection}>
                  <label style={styles.filterLabel}>Cercar</label>
                  <input
                    type="text"
                    placeholder="Cercar en títol, notes, projecte..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={styles.input}
                  />
                </div>
              </div>
            )}
            </div>
          </AppToolbar.Right>
        </AppToolbar>
        
        {/* Loading State */}
        {loading && (
          <div style={styles.loading}>
            Carregant esdeveniments...
          </div>
        )}
        
        {/* Error State */}
        {!loading && error && (
          <div style={styles.error}>
            <p style={{ margin: 0, marginBottom: '8px' }}>Error carregant esdeveniments</p>
            <p style={{ margin: 0, fontSize: '12px', opacity: 0.8 }}>{error}</p>
          </div>
        )}
        
        {/* Calendar */}
        {!loading && !error && (
          <div style={styles.calendarContainer} className="fd-calendar-asana">
            <Calendar
              localizer={localizer}
              events={calendarEvents}
              startAccessor="start"
              endAccessor="end"
              style={{ height: isMobile ? '500px' : '600px' }}
              view={view}
              onView={handleViewChange}
              date={date}
              onNavigate={handleNavigate}
              onSelectEvent={handleEventClick}
              eventPropGetter={eventStyleGetter}
              components={{
                event: CustomEvent
                // Removed header component - it was causing timestamp rendering
                // Weekday headers are handled by weekdayFormat in formats prop
              }}
              culture={currentMomentLocale}
              // Ensure week starts on Monday (dow: 1 is set in configureLocale)
              // react-big-calendar uses moment's locale configuration
              formats={{
                // Weekday headers in month/week/day views - short format based on current locale
                weekdayFormat: (date, culture, localizer) => {
                  const locale = currentMomentLocale
                  const weekday = moment(date).locale(locale).format('dd')
                  return weekday.charAt(0).toUpperCase() + weekday.slice(1)
                },
                // Day format for month view day numbers (just the number)
                dayFormat: (date, culture, localizer) => {
                  return moment(date).locale(currentMomentLocale).format('D')
                },
                // Month header format - full month name in current locale
                monthHeaderFormat: (date, culture, localizer) => {
                  const formatted = moment(date).locale(currentMomentLocale).format('MMMM YYYY')
                  return formatted.charAt(0).toUpperCase() + formatted.slice(1)
                },
                // Day header format for week/day views
                dayHeaderFormat: (date, culture, localizer) => {
                  return moment(date).locale(currentMomentLocale).format('dddd D MMMM')
                },
                // Day range header format
                dayRangeHeaderFormat: ({ start, end }, culture, localizer) => {
                  const locale = currentMomentLocale
                  return `${moment(start).locale(locale).format('D MMMM')} - ${moment(end).locale(locale).format('D MMMM YYYY')}`
                },
                // Time formats (24h format)
                timeGutterFormat: (date, culture, localizer) => {
                  return moment(date).locale(currentMomentLocale).format('HH:mm')
                },
                eventTimeRangeFormat: ({ start, end }, culture, localizer) => {
                  const locale = currentMomentLocale
                  return `${moment(start).locale(locale).format('HH:mm')} - ${moment(end).locale(locale).format('HH:mm')}`
                },
                agendaTimeFormat: (date, culture, localizer) => {
                  return moment(date).locale(currentMomentLocale).format('HH:mm')
                },
                agendaTimeRangeFormat: ({ start, end }, culture, localizer) => {
                  const locale = currentMomentLocale
                  return `${moment(start).locale(locale).format('HH:mm')} - ${moment(end).locale(locale).format('HH:mm')}`
                }
              }}
              messages={{
                next: t('calendar.next'),
                previous: t('calendar.previous'),
                today: t('calendar.today'),
                month: t('calendar.month'),
                week: t('calendar.week'),
                day: t('calendar.day'),
                agenda: t('calendar.agenda'),
                date: t('calendar.date'),
                time: t('calendar.time'),
                event: t('calendar.event'),
                noEventsInRange: t('calendar.noEvents'),
                showMore: total => `+${total} ${t('common.more')}`
              }}
              key={i18n.language} // Force re-render on language change
            />
          </div>
        )}
      </div>
    </div>
  )
}
