import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Calendar, momentLocalizer } from 'react-big-calendar'
import moment from 'moment'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import { useTranslation } from 'react-i18next'
import { useBreakpoint } from '../hooks/useBreakpoint'
import { useApp } from '../context/AppContext'
import { getCalendarEvents, getProjects, getDashboardPreferences, updateDashboardPreferences, updateTask } from '../lib/supabase'
import { Filter, X } from 'lucide-react'
import Button from '../components/Button'
import QuickCreateTaskModal from '../components/QuickCreateTaskModal'
import { showToast } from '../components/Toast'

const localizer = momentLocalizer(moment)

// Set moment locale based on i18n
moment.locale('ca')

export default function CalendarPage() {
  const { darkMode } = useApp()
  const navigate = useNavigate()
  const { isMobile } = useBreakpoint()
  const { t, i18n } = useTranslation()
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState(isMobile ? 'agenda' : 'month')
  const [date, setDate] = useState(new Date())
  const [projects, setProjects] = useState([])
  const [filters, setFilters] = useState({
    projectId: null,
    types: ['task', 'shipment', 'manufacturer', 'quote', 'purchase_order'],
    showCompleted: false,
    showStickyDerived: true // ON default
  })
  const [showFilters, setShowFilters] = useState(false)
  const [showQuickCreate, setShowQuickCreate] = useState(false)
  const [quickCreateDate, setQuickCreateDate] = useState(null)

  useEffect(() => {
    // Update moment locale when i18n language changes
    const langMap = { ca: 'ca', en: 'en', es: 'es' }
    moment.locale(langMap[i18n.language] || 'ca')
  }, [i18n.language])

  useEffect(() => {
    loadProjects()
    loadFilters()
  }, [])

  useEffect(() => {
    loadEvents()
  }, [filters])

  const loadProjects = async () => {
    try {
      const projs = await getProjects()
      setProjects(projs || [])
    } catch (err) {
      console.error('Error loading projects:', err)
    }
  }

  const loadFilters = async () => {
    try {
      const prefs = await getDashboardPreferences()
      if (prefs?.calendar_preferences) {
        setFilters({
          ...filters,
          ...prefs.calendar_preferences
        })
      }
    } catch (err) {
      console.error('Error loading calendar preferences:', err)
    }
  }

  const loadEvents = async () => {
    setLoading(true)
    try {
      const calendarEvents = await getCalendarEvents(filters)
      setEvents(calendarEvents || [])
    } catch (err) {
      console.error('Error loading calendar events:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleEventClick = (event) => {
    const { entity_type, entity_id, type, resource } = event
    
    if (entity_type === 'project') {
      navigate(`/projects/${entity_id}`)
    } else if (entity_type === 'purchase_order') {
      navigate(`/orders?open=${entity_id}`)
    } else if (type === 'shipment') {
      // Navigate to PO detail for shipment
      navigate(`/orders?open=${entity_id}`)
    } else if (type === 'task') {
      // Navigate to entity and highlight task
      if (resource.entity_type === 'project') {
        navigate(`/projects/${resource.entity_id}?highlightTask=${resource.id}`)
      } else if (resource.entity_type === 'purchase_order') {
        navigate(`/orders?open=${resource.entity_id}&highlightTask=${resource.id}`)
      }
    } else if (type === 'quote') {
      // Navigate to project with quote
      if (resource.project_id) {
        navigate(`/projects/${resource.project_id}`)
      }
    }
  }

  // Drag & drop handler - only for tasks
  const handleEventDrop = async ({ event, start, end }) => {
    // Only allow drag & drop for tasks
    if (event.type !== 'task') {
      showToast(t('calendar.dragNotAllowed', 'Només es poden arrossegar tasques'), 'warning')
      return
    }

    try {
      const taskId = event.taskId || event.resource?.id
      if (!taskId) {
        showToast(t('calendar.taskNotFound', 'Tasca no trobada'), 'error')
        return
      }

      // Update task due_date to the new date
      const newDate = moment(start).format('YYYY-MM-DD')
      await updateTask(taskId, { due_date: newDate })
      
      showToast(t('calendar.taskRescheduled', 'Tasca reprogramada'), 'success')
      
      // Reload events to reflect the change
      loadEvents()
    } catch (err) {
      console.error('Error rescheduling task:', err)
      showToast(t('calendar.rescheduleError', 'Error al reprogramar la tasca'), 'error')
      // Reload events to revert UI
      loadEvents()
    }
  }

  // Quick create handler - click on empty slot
  const handleSelectSlot = ({ start, end }) => {
    const clickedDate = moment(start).format('YYYY-MM-DD')
    setQuickCreateDate(clickedDate)
    setShowQuickCreate(true)
  }

  // Only allow dragging tasks
  const draggableAccessor = (event) => {
    return event.type === 'task'
  }

  const handleQuickCreateSave = () => {
    loadEvents() // Reload events to show new task
  }

  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value }
    setFilters(newFilters)
    saveFilters(newFilters)
  }

  const saveFilters = async (newFilters) => {
    try {
      await updateDashboardPreferences({ 
        calendar_preferences: newFilters 
      })
    } catch (err) {
      console.error('Error saving calendar preferences:', err)
    }
  }

  const eventStyleGetter = (event) => {
    let backgroundColor = '#3174ad'
    let borderColor = '#3174ad'
    
    switch (event.type) {
      case 'task':
        backgroundColor = event.priority === 'high' ? '#ef4444' : 
                          event.priority === 'normal' ? '#f59e0b' : '#6b7280'
        borderColor = backgroundColor
        // Add purple border for tasks from sticky notes
        if (event.source === 'sticky_note') {
          borderColor = '#a855f7'
        }
        break
      case 'shipment':
        backgroundColor = '#3b82f6'
        borderColor = '#3b82f6'
        break
      case 'manufacturer':
        backgroundColor = event.status === 'sent' ? '#22c55e' : '#f59e0b'
        borderColor = backgroundColor
        break
      case 'quote':
        backgroundColor = '#8b5cf6'
        borderColor = '#8b5cf6'
        break
      case 'purchase_order':
        backgroundColor = event.status === 'expected' ? '#f59e0b' : '#3b82f6'
        borderColor = backgroundColor
        break
    }
    
    return {
      style: {
        backgroundColor,
        borderColor,
        color: '#ffffff',
        borderRadius: '4px',
        border: event.type === 'task' && event.source === 'sticky_note' ? '2px solid #a855f7' : 'none',
        padding: '2px 4px',
        fontSize: '12px',
        position: 'relative'
      }
    }
  }

  // Custom event title component to show badge for sticky note tasks
  const CustomEvent = ({ event }) => {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', width: '100%' }}>
        {event.type === 'task' && event.source === 'sticky_note' && (
          <span style={{
            fontSize: '10px',
            backgroundColor: '#a855f7',
            borderRadius: '50%',
            width: '8px',
            height: '8px',
            display: 'inline-block',
            flexShrink: 0
          }} title={t('calendar.fromNote', 'Des de nota')} />
        )}
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {event.title}
        </span>
      </div>
    )
  }

  const styles = {
    container: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: darkMode ? '#0a0a0f' : '#f8f9fc',
      padding: isMobile ? '16px' : '32px'
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '24px'
    },
    title: {
      fontSize: isMobile ? '24px' : '32px',
      fontWeight: '700',
      color: darkMode ? '#ffffff' : '#111827',
      margin: 0
    },
    filterButton: {
      minWidth: '140px'
    },
    closeButton: {
      padding: '0',
      width: 'var(--btn-h-sm)',
      minWidth: 'var(--btn-h-sm)'
    },
    filterPanel: {
      position: isMobile ? 'relative' : 'absolute',
      top: isMobile ? 'auto' : '60px',
      right: isMobile ? 'auto' : '0',
      zIndex: 100,
      backgroundColor: darkMode ? '#15151f' : '#ffffff',
      border: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`,
      borderRadius: '12px',
      padding: '20px',
      minWidth: isMobile ? '100%' : '300px',
      boxShadow: darkMode ? '0 4px 6px rgba(0,0,0,0.3)' : '0 4px 6px rgba(0,0,0,0.1)',
      marginBottom: isMobile ? '20px' : '0'
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
      letterSpacing: '0.5px'
    },
    select: {
      width: '100%',
      padding: '8px 12px',
      backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb',
      border: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`,
      borderRadius: '6px',
      color: darkMode ? '#ffffff' : '#111827',
      fontSize: '14px',
      cursor: 'pointer'
    },
    checkboxGroup: {
      display: 'flex',
      flexDirection: 'column',
      gap: '8px'
    },
    checkboxLabel: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      fontSize: '14px',
      color: darkMode ? '#ffffff' : '#111827',
      cursor: 'pointer'
    },
    checkbox: {
      width: '18px',
      height: '18px',
      cursor: 'pointer'
    },
    calendarContainer: {
      flex: 1,
      backgroundColor: darkMode ? '#15151f' : '#ffffff',
      borderRadius: '12px',
      padding: isMobile ? '12px' : '20px',
      border: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`,
      overflow: 'hidden'
    },
    loading: {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '400px',
      color: darkMode ? '#9ca3af' : '#6b7280',
      fontSize: '16px'
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.header} className="toolbar-row">
        <h1 style={styles.title}>{t('calendar.title', 'Calendari')}</h1>
        <div style={{ position: 'relative' }}>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            style={styles.filterButton}
          >
            <Filter size={18} />
            {t('calendar.filters', 'Filtres')}
          </Button>
          
          {showFilters && (
            <div style={styles.filterPanel}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: darkMode ? '#ffffff' : '#111827' }}>
                  {t('calendar.filters', 'Filtres')}
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowFilters(false)}
                  style={styles.closeButton}
                >
                  <X size={18} />
                </Button>
              </div>
              
              {/* Project Filter */}
              <div style={styles.filterSection}>
                <label style={styles.filterLabel}>
                  {t('calendar.project', 'Projecte')}
                </label>
                <select
                  value={filters.projectId || ''}
                  onChange={(e) => handleFilterChange('projectId', e.target.value || null)}
                  style={styles.select}
                >
                  <option value="">{t('calendar.allProjects', 'Tots els projectes')}</option>
                  {projects.map(project => (
                    <option key={project.id} value={project.id}>
                      {project.name} {project.sku_internal ? `(${project.sku_internal})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Type Filters */}
              <div style={styles.filterSection}>
                <label style={styles.filterLabel}>
                  {t('calendar.eventTypes', 'Tipus d\'esdeveniments')}
                </label>
                <div style={styles.checkboxGroup}>
                  {['task', 'shipment', 'manufacturer', 'quote', 'purchase_order'].map(type => (
                    <label key={type} style={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={filters.types.includes(type)}
                        onChange={(e) => {
                          const newTypes = e.target.checked
                            ? [...filters.types, type]
                            : filters.types.filter(t => t !== type)
                          handleFilterChange('types', newTypes)
                        }}
                        style={styles.checkbox}
                      />
                      <span>{t(`calendar.type.${type}`, type)}</span>
                    </label>
                  ))}
                </div>
              </div>
              
              {/* Show Completed */}
              <div style={styles.filterSection}>
                <label style={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={filters.showCompleted}
                    onChange={(e) => handleFilterChange('showCompleted', e.target.checked)}
                    style={styles.checkbox}
                  />
                  <span>{t('calendar.showCompleted', 'Mostrar completats')}</span>
                </label>
              </div>
              
              {/* Show Sticky-Derived Tasks */}
              <div style={styles.filterSection}>
                <label style={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={filters.showStickyDerived !== false}
                    onChange={(e) => handleFilterChange('showStickyDerived', e.target.checked)}
                    style={styles.checkbox}
                  />
                  <span>{t('calendar.showStickyDerived', 'Mostrar tasques de notes')}</span>
                </label>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <div style={styles.calendarContainer}>
        {loading ? (
          <div style={styles.loading}>{t('common.loading', 'Carregant...')}</div>
        ) : (
          <Calendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            style={{ height: isMobile ? '500px' : '600px' }}
            view={view}
            onView={setView}
            date={date}
            onNavigate={setDate}
            onSelectEvent={handleEventClick}
            onEventDrop={handleEventDrop}
            onSelectSlot={handleSelectSlot}
            selectable
            draggableAccessor={draggableAccessor}
            eventPropGetter={eventStyleGetter}
            components={{
              event: CustomEvent
            }}
            messages={{
              next: t('calendar.next', 'Següent'),
              previous: t('calendar.previous', 'Anterior'),
              today: t('calendar.today', 'Avui'),
              month: t('calendar.month', 'Mes'),
              week: t('calendar.week', 'Setmana'),
              day: t('calendar.day', 'Dia'),
              agenda: t('calendar.agenda', 'Agenda'),
              date: t('calendar.date', 'Data'),
              time: t('calendar.time', 'Hora'),
              event: t('calendar.event', 'Esdeveniment'),
              noEventsInRange: t('calendar.noEvents', 'No hi ha esdeveniments en aquest rang')
            }}
            className={darkMode ? 'rbc-dark' : 'rbc-light'}
          />
        )}
      </div>
      
      {/* Quick Create Task Modal */}
      <QuickCreateTaskModal
        isOpen={showQuickCreate}
        onClose={() => {
          setShowQuickCreate(false)
          setQuickCreateDate(null)
        }}
        onSave={handleQuickCreateSave}
        defaultDate={quickCreateDate}
        projects={projects}
      />
      
      <style>{`
        .rbc-dark {
          color: #ffffff;
        }
        .rbc-dark .rbc-header {
          color: #9ca3af;
          border-color: #374151;
        }
        .rbc-dark .rbc-day-bg {
          border-color: #374151;
        }
        .rbc-dark .rbc-today {
          background-color: #1f1f2e;
        }
        .rbc-dark .rbc-off-range-bg {
          background-color: #0a0a0f;
        }
        .rbc-dark .rbc-toolbar button {
          color: #ffffff;
          background-color: #1f1f2e;
          border-color: #374151;
        }
        .rbc-dark .rbc-toolbar button:hover {
          background-color: #2a2a3a;
        }
        .rbc-dark .rbc-toolbar button.rbc-active {
          background-color: #4f46e5;
          color: #ffffff;
        }
        .rbc-light .rbc-header {
          color: #6b7280;
          border-color: #e5e7eb;
        }
        .rbc-light .rbc-day-bg {
          border-color: #e5e7eb;
        }
        .rbc-light .rbc-today {
          background-color: #f3f4f6;
        }
        .rbc-light .rbc-off-range-bg {
          background-color: #f9fafb;
        }
        .rbc-light .rbc-toolbar button {
          color: #111827;
          background-color: #ffffff;
          border-color: #e5e7eb;
        }
        .rbc-light .rbc-toolbar button:hover {
          background-color: #f3f4f6;
        }
        .rbc-light .rbc-toolbar button.rbc-active {
          background-color: #4f46e5;
          color: #ffffff;
        }
      `}</style>
    </div>
  )
}

