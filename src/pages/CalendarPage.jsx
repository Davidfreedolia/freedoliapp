import { useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Calendar, momentLocalizer } from 'react-big-calendar'
import moment from 'moment'
import 'moment/locale/ca'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import { useBreakpoint } from '../hooks/useBreakpoint'
import { useApp } from '../context/AppContext'
import Header from '../components/Header'
import { useProjectCalendarEvents } from '../features/calendar/useProjectCalendarEvents'
import { getProjects } from '../lib/supabase'
import { Calendar as CalendarIcon, Filter, X } from 'lucide-react'
import { useEffect } from 'react'

// Configure moment for Catalan locale
moment.locale('ca', {
  week: {
    dow: 1, // Monday is the first day of the week
    doy: 4  // The week that contains Jan 4th is the first week of the year
  }
})

const localizer = momentLocalizer(moment)

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
  
  const [view, setView] = useState(isMobile ? 'agenda' : 'month')
  const [date, setDate] = useState(new Date())
  const [projects, setProjects] = useState([])
  const [filterProjectId, setFilterProjectId] = useState(null)
  const [filterType, setFilterType] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  
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
        borderRadius: '999px', // Pill shape
        border: 'none',
        padding: '4px 10px',
        fontSize: '12px',
        fontWeight: '500',
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
      flexDirection: isMobile ? 'column' : 'row',
      gap: isMobile ? '12px' : '0'
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
      padding: '8px 12px',
      borderRadius: '8px',
      border: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`,
      backgroundColor: darkMode ? '#1f1f2e' : '#ffffff',
      color: darkMode ? '#ffffff' : '#111827',
      fontSize: '14px',
      cursor: 'pointer',
      outline: 'none'
    },
    filterButton: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '8px 16px',
      backgroundColor: darkMode ? '#15151f' : '#ffffff',
      border: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`,
      borderRadius: '8px',
      color: darkMode ? '#ffffff' : '#111827',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: '500'
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
      <Header title="Calendari" />
      
      <div style={styles.content}>
        <div style={styles.header}>
          <div style={styles.headerLeft}>
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
          
          <div style={styles.headerRight}>
            <button
              data-filter-button
              onClick={() => setShowFilters(!showFilters)}
              style={styles.filterButton}
            >
              <Filter size={18} />
              Filtres
            </button>
            
            {showFilters && (
              <div data-filter-panel style={styles.filterPanel}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: darkMode ? '#ffffff' : '#111827' }}>
                    Filtres
                  </h3>
                  <button
                    onClick={() => setShowFilters(false)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: darkMode ? '#9ca3af' : '#6b7280',
                      padding: '4px'
                    }}
                  >
                    <X size={18} />
                  </button>
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
        </div>
        
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
          <div style={styles.calendarContainer}>
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
              }}
              culture="ca"
              formats={{
                dayFormat: 'dddd D',
                weekdayFormat: 'ddd',
                monthHeaderFormat: 'MMMM YYYY',
                dayHeaderFormat: 'dddd D MMMM',
                dayRangeHeaderFormat: ({ start, end }) => 
                  `${moment(start).format('D MMMM')} - ${moment(end).format('D MMMM YYYY')}`,
                timeGutterFormat: 'HH:mm',
                eventTimeRangeFormat: ({ start, end }) => 
                  `${moment(start).format('HH:mm')} - ${moment(end).format('HH:mm')}`,
                agendaTimeFormat: 'HH:mm',
                agendaTimeRangeFormat: ({ start, end }) => 
                  `${moment(start).format('HH:mm')} - ${moment(end).format('HH:mm')}`
              }}
              messages={{
                next: 'Següent',
                previous: 'Anterior',
                today: 'Avui',
                month: 'Mes',
                week: 'Setmana',
                day: 'Dia',
                agenda: 'Llista',
                date: 'Data',
                time: 'Hora',
                event: 'Esdeveniment',
                noEventsInRange: 'No hi ha esdeveniments en aquest rang',
                showMore: total => `+${total} més`
              }}
            />
          </div>
        )}
      </div>
      
      <style>{`
        /* Base calendar styles */
        .rbc-calendar {
          font-family: inherit;
          border-radius: 12px;
          overflow: hidden;
        }
        
        /* Toolbar - Modern buttons */
        .rbc-toolbar {
          margin-bottom: 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 8px;
        }
        
        .rbc-toolbar-label {
          font-size: 18px;
          font-weight: 600;
          color: ${darkMode ? '#ffffff' : '#111827'};
          letter-spacing: -0.01em;
        }
        
        .rbc-btn-group {
          display: flex;
          gap: 6px;
        }
        
        .rbc-toolbar button {
          color: ${darkMode ? '#9ca3af' : '#6b7280'};
          background-color: ${darkMode ? '#1f1f2e' : '#f9fafb'};
          border: 1px solid ${darkMode ? '#374151' : '#e5e7eb'};
          padding: 8px 16px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.2s ease;
          cursor: pointer;
        }
        
        .rbc-toolbar button:hover {
          background-color: ${darkMode ? '#2a2a3a' : '#f3f4f6'};
          color: ${darkMode ? '#ffffff' : '#111827'};
          border-color: ${darkMode ? '#4b5563' : '#d1d5db'};
        }
        
        .rbc-toolbar button.rbc-active {
          background-color: ${darkMode ? '#4f46e5' : '#4f46e5'};
          color: #ffffff;
          border-color: ${darkMode ? '#4f46e5' : '#4f46e5'};
          box-shadow: 0 2px 4px rgba(79, 70, 229, 0.2);
        }
        
        /* Headers - Days of week */
        .rbc-header {
          color: ${darkMode ? '#9ca3af' : '#6b7280'};
          border-color: ${darkMode ? '#374151' : '#e5e7eb'};
          padding: 14px 8px;
          font-weight: 600;
          font-size: 13px;
          text-transform: capitalize;
          border-bottom: 2px solid ${darkMode ? '#374151' : '#e5e7eb'};
        }
        
        /* Day cells - Rounded corners */
        .rbc-day-bg {
          border-color: ${darkMode ? '#374151' : '#e5e7eb'};
          border-width: 1px;
        }
        
        .rbc-day-bg:first-child {
          border-left: none;
        }
        
        .rbc-day-bg:last-child {
          border-right: none;
        }
        
        /* Today highlight - Subtle */
        .rbc-today {
          background-color: ${darkMode ? 'rgba(79, 70, 229, 0.1)' : 'rgba(79, 70, 229, 0.05)'};
        }
        
        .rbc-today .rbc-day-bg {
          background-color: ${darkMode ? 'rgba(79, 70, 229, 0.1)' : 'rgba(79, 70, 229, 0.05)'};
        }
        
        /* Off-range days */
        .rbc-off-range-bg {
          background-color: ${darkMode ? '#0f0f15' : '#fafafa'};
          opacity: 0.5;
        }
        
        /* Events - Pill shape */
        .rbc-event {
          border-radius: 999px !important;
          padding: 4px 10px !important;
          border: none !important;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
          transition: all 0.2s ease;
        }
        
        .rbc-event:hover {
          transform: translateY(-1px);
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
        }
        
        .rbc-event:focus {
          outline: 2px solid #4f46e5;
          outline-offset: 2px;
        }
        
        .rbc-event-label {
          font-size: 11px;
          opacity: 0.9;
        }
        
        /* Month view - Day numbers */
        .rbc-date-cell {
          padding: 8px;
        }
        
        .rbc-date-cell > a {
          color: ${darkMode ? '#ffffff' : '#111827'};
          font-weight: 500;
          font-size: 14px;
          padding: 4px 8px;
          border-radius: 6px;
          transition: all 0.2s ease;
        }
        
        .rbc-date-cell > a:hover {
          background-color: ${darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)'};
        }
        
        .rbc-off-range > a {
          color: ${darkMode ? '#4b5563' : '#9ca3af'};
          opacity: 0.4;
        }
        
        .rbc-now > a {
          color: #4f46e5;
          font-weight: 700;
          background-color: ${darkMode ? 'rgba(79, 70, 229, 0.2)' : 'rgba(79, 70, 229, 0.1)'};
        }
        
        /* Week/Day view - Time slots */
        .rbc-time-slot {
          border-color: ${darkMode ? '#2a2a3a' : '#f3f4f6'};
          border-top-width: 1px;
        }
        
        .rbc-time-header-content {
          border-color: ${darkMode ? '#374151' : '#e5e7eb'};
        }
        
        .rbc-time-content {
          border-color: ${darkMode ? '#374151' : '#e5e7eb'};
        }
        
        .rbc-time-header-gutter {
          border-color: ${darkMode ? '#374151' : '#e5e7eb'};
        }
        
        .rbc-time-gutter {
          border-color: ${darkMode ? '#374151' : '#e5e7eb'};
        }
        
        .rbc-time-gutter .rbc-timeslot-group {
          border-color: ${darkMode ? '#2a2a3a' : '#f3f4f6'};
        }
        
        .rbc-label {
          color: ${darkMode ? '#6b7280' : '#9ca3af'};
          font-size: 11px;
          font-weight: 500;
          padding: 4px 8px;
        }
        
        /* Current time indicator */
        .rbc-current-time-indicator {
          background-color: #ef4444;
          height: 2px;
          box-shadow: 0 0 4px rgba(239, 68, 68, 0.5);
        }
        
        .rbc-current-time-indicator::before {
          content: '';
          position: absolute;
          width: 8px;
          height: 8px;
          background-color: #ef4444;
          border-radius: 50%;
          left: -4px;
          top: -3px;
          box-shadow: 0 0 4px rgba(239, 68, 68, 0.5);
        }
        
        /* Agenda/List view */
        .rbc-agenda-view {
          color: ${darkMode ? '#ffffff' : '#111827'};
        }
        
        .rbc-agenda-table {
          border-radius: 8px;
          overflow: hidden;
        }
        
        .rbc-agenda-date-cell,
        .rbc-agenda-time-cell {
          border-color: ${darkMode ? '#374151' : '#e5e7eb'};
          color: ${darkMode ? '#9ca3af' : '#6b7280'};
          padding: 12px 16px;
          font-size: 13px;
        }
        
        .rbc-agenda-event-cell {
          border-color: ${darkMode ? '#374151' : '#e5e7eb'};
          padding: 12px 16px;
        }
        
        .rbc-agenda-event-cell:hover {
          background-color: ${darkMode ? '#1f1f2e' : '#f9fafb'};
        }
        
        /* Month view - Show more link */
        .rbc-show-more {
          background-color: ${darkMode ? '#1f1f2e' : '#f9fafb'};
          color: ${darkMode ? '#9ca3af' : '#6b7280'};
          border-radius: 6px;
          padding: 4px 8px;
          font-size: 12px;
          font-weight: 500;
          margin-top: 4px;
          transition: all 0.2s ease;
        }
        
        .rbc-show-more:hover {
          background-color: ${darkMode ? '#2a2a3a' : '#f3f4f6'};
          color: ${darkMode ? '#ffffff' : '#111827'};
        }
        
        /* Remove harsh borders */
        .rbc-month-row {
          border-color: ${darkMode ? '#374151' : '#e5e7eb'};
        }
        
        .rbc-month-view {
          border: none;
        }
        
        .rbc-time-view {
          border: none;
        }
        
        /* Smooth transitions */
        .rbc-day-slot .rbc-time-slot {
          transition: background-color 0.2s ease;
        }
        
        .rbc-day-slot .rbc-time-slot:hover {
          background-color: ${darkMode ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.01)'};
        }
      `}</style>
    </div>
  )
}
