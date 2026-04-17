import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Calendar, momentLocalizer } from 'react-big-calendar'
import moment from 'moment'
import 'moment/locale/ca'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import { useTranslation } from 'react-i18next'
import { useBreakpoint } from '../hooks/useBreakpoint'
import { useApp } from '../context/AppContext'
import Header from '../components/Header'
import { useProjectCalendarEvents } from '../features/calendar/useProjectCalendarEvents'
import { getProjects } from '../lib/supabase'
import {
  Calendar as CalendarIcon, ChevronLeft, ChevronRight,
  Filter, X, BarChart2
} from 'lucide-react'

/* ─── Localizer ──────────────────────────────────────────────────────────── */
const localizer = momentLocalizer(moment)
const getMomentLocale = (lang) => ({ ca: 'ca', en: 'en', es: 'es' }[lang] || 'ca')
const configureLocale = (locale) => moment.updateLocale(locale, { week: { dow: 1, doy: 4 } })
moment.locale('ca'); configureLocale('ca')

/* ─── Color scheme per tipus ─────────────────────────────────────────────── */
export const TYPE_META = {
  milestone:  { bg: '#7c3aed', fg: '#fff', label: 'Milestone' },
  meeting:    { bg: '#3b82f6', fg: '#fff', label: 'Reunió' },
  deadline:   { bg: '#ef4444', fg: '#fff', label: 'Deadline' },
  delivery:   { bg: '#10b981', fg: '#fff', label: 'Lliurament' },
  production: { bg: '#f59e0b', fg: '#fff', label: 'Producció' },
  sample:     { bg: '#0891b2', fg: '#fff', label: 'Mostres' },
  launch:     { bg: '#ec4899', fg: '#fff', label: 'Llançament' },
  review:     { bg: '#8b5cf6', fg: '#fff', label: 'Revisió' },
  other:      { bg: '#64748b', fg: '#fff', label: 'Altre' },
}
const getTypeMeta = (type) => TYPE_META[type] || TYPE_META.other

/* ─── Gantt View ─────────────────────────────────────────────────────────── */
function GanttView({ events, dateRange, darkMode, onEventClick }) {
  const containerRef = useRef()
  const today = new Date(); today.setHours(0,0,0,0)

  // Generate array of days in range
  const days = useMemo(() => {
    const arr = []
    const cur = new Date(dateRange.start)
    while (cur <= dateRange.end) {
      arr.push(new Date(cur))
      cur.setDate(cur.getDate() + 1)
    }
    return arr
  }, [dateRange])

  const totalDays = days.length

  // Group events by project
  const projectGroups = useMemo(() => {
    const groups = new Map()
    events.forEach(ev => {
      const pid = ev.resource?.project?.id || 'unknown'
      const pname = ev.resource?.project?.name || ev.resource?.project?.code || 'Sense projecte'
      if (!groups.has(pid)) groups.set(pid, { id: pid, name: pname, events: [] })
      groups.get(pid).events.push(ev)
    })
    return Array.from(groups.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [events])

  const dayWidth = 36 // px per day
  const rowHeight = 40
  const labelWidth = 180

  const getDayIndex = (date) => {
    const d = new Date(date); d.setHours(0,0,0,0)
    return Math.round((d - dateRange.start) / 86400000)
  }

  const isWeekend = (date) => { const d = date.getDay(); return d === 0 || d === 6 }
  const isToday   = (date) => date.getTime() === today.getTime()

  const border = darkMode ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'
  const surfaceBg  = darkMode ? '#1a2327' : '#fff'
  const surface2   = darkMode ? '#151d21' : '#f9fafb'
  const textColor  = darkMode ? '#e2e8f0' : '#1e293b'
  const text2Color = darkMode ? '#94a3b8' : '#64748b'

  return (
    <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: '62vh', borderRadius: 12, border: `1px solid ${border}`, background: surfaceBg }}>
      <div style={{ display: 'flex', minWidth: labelWidth + totalDays * dayWidth }}>

        {/* ── Left: label column ── */}
        <div style={{ width: labelWidth, flexShrink: 0, position: 'sticky', left: 0, zIndex: 10, background: surfaceBg, borderRight: `1px solid ${border}` }}>
          {/* Header placeholder */}
          <div style={{ height: 52, borderBottom: `1px solid ${border}`, display: 'flex', alignItems: 'center', padding: '0 14px' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: text2Color, textTransform: 'uppercase', letterSpacing: 0.5 }}>Projecte</span>
          </div>
          {projectGroups.length === 0 && (
            <div style={{ padding: '24px 14px', fontSize: 13, color: text2Color }}>Cap event en aquest rang.</div>
          )}
          {projectGroups.map((pg, ri) => (
            <div key={pg.id} style={{
              height: rowHeight, display: 'flex', alignItems: 'center',
              padding: '0 14px', borderBottom: `1px solid ${border}`,
              background: ri % 2 === 0 ? 'transparent' : (darkMode ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)')
            }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: textColor, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {pg.name}
              </span>
            </div>
          ))}
        </div>

        {/* ── Right: timeline ── */}
        <div style={{ flex: 1 }}>
          {/* Day headers */}
          <div style={{ display: 'flex', height: 52, borderBottom: `1px solid ${border}`, position: 'sticky', top: 0, zIndex: 9, background: surfaceBg }}>
            {days.map((d, i) => {
              const isTod = isToday(d); const isWk = isWeekend(d)
              const isFirst = i === 0 || d.getDate() === 1
              return (
                <div key={i} style={{
                  width: dayWidth, flexShrink: 0, textAlign: 'center',
                  borderRight: `1px solid ${border}`,
                  background: isTod ? 'rgba(110,203,195,0.14)' : isWk ? (darkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)') : 'transparent',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2
                }}>
                  {/* Month label on 1st day */}
                  <span style={{ fontSize: 9, fontWeight: 700, color: text2Color, textTransform: 'uppercase', letterSpacing: 0.4, lineHeight: 1 }}>
                    {isFirst ? d.toLocaleDateString('ca-ES', { month: 'short' }).toUpperCase() : ''}
                  </span>
                  <span style={{
                    fontSize: 12, fontWeight: isTod ? 800 : 500,
                    color: isTod ? 'var(--c-cta-500)' : isWk ? text2Color : textColor,
                    width: 24, height: 24, borderRadius: '50%', lineHeight: '24px',
                    background: isTod ? 'rgba(110,203,195,0.18)' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    {d.getDate()}
                  </span>
                  <span style={{ fontSize: 9, color: text2Color, letterSpacing: 0.3 }}>
                    {d.toLocaleDateString('ca-ES', { weekday: 'short' }).slice(0,2).toUpperCase()}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Event rows */}
          {projectGroups.map((pg, ri) => (
            <div key={pg.id} style={{
              display: 'flex', height: rowHeight, position: 'relative',
              borderBottom: `1px solid ${border}`,
              background: ri % 2 === 0 ? 'transparent' : (darkMode ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)')
            }}>
              {/* Day grid lines */}
              {days.map((d, i) => (
                <div key={i} style={{
                  width: dayWidth, flexShrink: 0,
                  borderRight: `1px solid ${border}`,
                  background: isToday(d) ? 'rgba(110,203,195,0.08)' : isWeekend(d) ? (darkMode ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.018)') : 'transparent'
                }} />
              ))}
              {/* Event chips */}
              {pg.events.map((ev) => {
                const di = getDayIndex(ev.start)
                if (di < 0 || di >= totalDays) return null
                const meta = getTypeMeta(ev.resource?.type)
                return (
                  <div
                    key={ev.id}
                    title={`${ev.title}\n${ev.resource?.project?.name || ''}`}
                    onClick={() => onEventClick(ev)}
                    style={{
                      position: 'absolute',
                      left: di * dayWidth + 2,
                      top: 5,
                      width: dayWidth - 4,
                      height: rowHeight - 10,
                      background: meta.bg,
                      borderRadius: 5,
                      cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      overflow: 'hidden',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                      zIndex: 2,
                      transition: 'transform 100ms, box-shadow 100ms',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'scaleY(1.08)'; e.currentTarget.style.boxShadow = '0 3px 8px rgba(0,0,0,0.25)' }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'scaleY(1)'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.2)' }}
                  >
                    <span style={{ fontSize: 9, color: meta.fg, fontWeight: 700, padding: '0 2px', textAlign: 'center', overflow: 'hidden', lineHeight: 1.1 }}>
                      {ev.title?.slice(0,8)}
                    </span>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ─── Legend strip ───────────────────────────────────────────────────────── */
function LegendStrip({ activeFilter, onFilter, darkMode }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6,
      padding: '8px 0', marginBottom: 4
    }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: 0.5, marginRight: 4 }}>
        Tipus:
      </span>
      {Object.entries(TYPE_META).map(([key, meta]) => {
        const active = activeFilter === key || activeFilter === null
        return (
          <button
            key={key}
            type="button"
            onClick={() => onFilter(activeFilter === key ? null : key)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '4px 10px',
              borderRadius: 20,
              border: `1.5px solid ${active ? meta.bg : 'transparent'}`,
              background: active ? `${meta.bg}18` : 'var(--surface-bg-2)',
              cursor: 'pointer',
              opacity: activeFilter !== null && activeFilter !== key ? 0.45 : 1,
              transition: 'opacity 150ms, border-color 150ms',
              fontSize: 12, fontWeight: 600, color: active ? meta.bg : 'var(--text-2)'
            }}
          >
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: meta.bg, flexShrink: 0 }} />
            {meta.label}
          </button>
        )
      })}
      {activeFilter && (
        <button
          type="button"
          onClick={() => onFilter(null)}
          style={{ fontSize: 11, color: 'var(--text-2)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}
        >
          <X size={12} /> Tots
        </button>
      )}
    </div>
  )
}

/* ─── Main Page ──────────────────────────────────────────────────────────── */
const VIEWS = ['month', 'week', 'day', 'agenda', 'gantt']
const VIEW_LABELS = { month: 'Mes', week: 'Setmana', day: 'Dia', agenda: 'Agenda', gantt: 'Gantt' }

export default function CalendarPage() {
  const { darkMode, projects: contextProjects, activeOrgId } = useApp()
  const navigate = useNavigate()
  const { isMobile } = useBreakpoint()
  const { t, i18n } = useTranslation()

  const [view, setView]                 = useState(isMobile ? 'agenda' : 'month')
  const [date, setDate]                 = useState(new Date())
  const [projects, setProjects]         = useState([])
  const [filterProjectId, setFilterProjectId] = useState(null)
  const [filterType, setFilterType]     = useState(null)
  const [showFilters, setShowFilters]   = useState(false)

  useEffect(() => {
    const loc = getMomentLocale(i18n.language)
    moment.locale(loc); configureLocale(loc)
  }, [i18n.language])

  const currentMomentLocale = getMomentLocale(i18n.language)

  /* ── Date range for fetching ── */
  const { fromDate, toDate } = useMemo(() => {
    let start, end
    if (view === 'gantt') {
      start = moment(date).startOf('month').subtract(1, 'week')
      end   = moment(date).endOf('month').add(1, 'week')
    } else {
      start = moment(date).startOf(view === 'month' ? 'month' : view === 'week' ? 'isoWeek' : 'day')
      end   = moment(date).endOf(view === 'month' ? 'month' : view === 'week' ? 'isoWeek' : 'day')
      if (view === 'month') { start.subtract(7, 'days'); end.add(7, 'days') }
    }
    return { fromDate: start.toDate(), toDate: end.toDate() }
  }, [date, view])

  const { data, loading, error } = useProjectCalendarEvents({ from: fromDate, to: toDate, projectId: filterProjectId })

  useEffect(() => {
    const load = async () => {
      if (contextProjects?.length) { setProjects(contextProjects); return }
      try { setProjects(await getProjects(false, activeOrgId ?? undefined) || []) } catch {}
    }
    load()
  }, [contextProjects])

  /* ── Calendar events (react-big-calendar format) ── */
  const calendarEvents = useMemo(() => {
    if (!data?.length) return []
    let filtered = data
    if (filterType)   filtered = filtered.filter(e => e.type === filterType)
    return filtered.map(ev => ({
      id: ev.id, title: ev.title,
      start: new Date(ev.event_date + 'T00:00:00'),
      end:   new Date(ev.event_date + 'T23:59:59'),
      resource: ev
    }))
  }, [data, filterType])

  /* ── Gantt date range (used by GanttView) ── */
  const ganttRange = useMemo(() => ({
    start: (() => { const d = new Date(fromDate); d.setHours(0,0,0,0); return d })(),
    end:   (() => { const d = new Date(toDate);   d.setHours(0,0,0,0); return d })()
  }), [fromDate, toDate])

  const handleEventClick  = useCallback((ev) => { if (ev.resource?.project?.id) navigate(`/app/projects/${ev.resource.project.id}`) }, [navigate])
  const handleViewChange  = useCallback((v) => setView(v), [])
  const handleNavigate    = useCallback((d) => setDate(d), [])

  /* ── Navigation label ── */
  const navLabel = useMemo(() => {
    const m = moment(date).locale(currentMomentLocale)
    if (view === 'month' || view === 'gantt') return m.format('MMMM YYYY').replace(/^\w/, c => c.toUpperCase())
    if (view === 'week') {
      const start = moment(date).startOf('isoWeek')
      const end   = moment(date).endOf('isoWeek')
      return `${start.format('D MMM')} – ${end.format('D MMM YYYY')}`
    }
    return m.format('dddd, D MMMM YYYY')
  }, [date, view, currentMomentLocale])

  const goNext = () => {
    const unit = view === 'week' ? 'week' : view === 'day' ? 'day' : 'month'
    setDate(moment(date).add(1, unit).toDate())
  }
  const goPrev = () => {
    const unit = view === 'week' ? 'week' : view === 'day' ? 'day' : 'month'
    setDate(moment(date).subtract(1, unit).toDate())
  }
  const goToday = () => setDate(new Date())

  /* ── Event style (for react-big-calendar) ── */
  const eventStyleGetter = (ev) => {
    const meta = getTypeMeta(ev.resource?.type)
    return {
      style: {
        background: meta.bg,
        border: 'none',
        color: meta.fg,
        borderRadius: 6,
        padding: '2px 7px',
        fontSize: 12,
        fontWeight: 600,
        boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
        borderLeft: `3px solid rgba(0,0,0,0.18)`
      }
    }
  }

  /* ── Custom event component ── */
  const CustomEvent = ({ event }) => {
    const type = event.resource?.type
    const project = event.resource?.project
    const meta = getTypeMeta(type)
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1, width: '100%', overflow: 'hidden' }}>
        <span style={{ fontWeight: 700, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.3 }}>
          {event.title}
        </span>
        {project && (
          <span style={{ fontSize: 10, opacity: 0.85, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {project.code || project.name}
          </span>
        )}
      </div>
    )
  }

  /* ── Formats ── */
  const calFormats = useMemo(() => ({
    weekdayFormat: (date) => ['Dg','Dl','Dm','Dc','Dj','Dv','Ds'][date.getDay()],
    dayFormat:   (date) => moment(date).locale(currentMomentLocale).format('D'),
    monthHeaderFormat: (date) => {
      const s = moment(date).locale(currentMomentLocale).format('MMMM YYYY')
      return s.charAt(0).toUpperCase() + s.slice(1)
    },
    dayHeaderFormat: (date) => moment(date).locale(currentMomentLocale).format('dddd D MMMM'),
    dayRangeHeaderFormat: ({ start, end }) =>
      `${moment(start).locale(currentMomentLocale).format('D MMMM')} – ${moment(end).locale(currentMomentLocale).format('D MMMM YYYY')}`,
    timeGutterFormat:     (date) => moment(date).format('HH:mm'),
    eventTimeRangeFormat: ({ start, end }) => `${moment(start).format('HH:mm')} – ${moment(end).format('HH:mm')}`,
    agendaTimeFormat:      (date) => moment(date).format('HH:mm'),
    agendaTimeRangeFormat: ({ start, end }) => `${moment(start).format('HH:mm')} – ${moment(end).format('HH:mm')}`,
  }), [currentMomentLocale])

  /* ── Close filters on outside click ── */
  useEffect(() => {
    if (!showFilters) return
    const h = (e) => { if (!e.target.closest('[data-filter-panel]') && !e.target.closest('[data-filter-btn]')) setShowFilters(false) }
    document.addEventListener('click', h)
    return () => document.removeEventListener('click', h)
  }, [showFilters])

  const bg    = darkMode ? '#15151f' : '#fff'
  const bdr   = darkMode ? '#2d3748' : '#e5e7eb'

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <Header title={<span className="page-title-with-icon"><CalendarIcon size={22} /> Calendari</span>} />

      <div style={{ padding: isMobile ? '16px' : '24px 32px', overflowY: 'auto', flex: 1 }}>

        {/* ── Toolbar ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>

          {/* Navigation */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button onClick={goPrev} style={navBtnStyle(darkMode)} title="Anterior"><ChevronLeft size={16} /></button>
            <button onClick={goToday} style={{ ...navBtnStyle(darkMode), padding: '5px 12px', fontWeight: 600, fontSize: 13 }}>Avui</button>
            <button onClick={goNext} style={navBtnStyle(darkMode)} title="Següent"><ChevronRight size={16} /></button>
          </div>

          {/* Current period label */}
          <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-1)', flex: 1, textAlign: 'center' }}>
            {navLabel}
          </span>

          {/* View buttons */}
          <div style={{ display: 'flex', border: `1px solid ${bdr}`, borderRadius: 8, overflow: 'hidden' }}>
            {VIEWS.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => handleViewChange(v)}
                style={{
                  padding: '6px 12px',
                  fontSize: 12, fontWeight: 600,
                  border: 'none',
                  borderLeft: v !== 'month' ? `1px solid ${bdr}` : 'none',
                  background: view === v ? 'var(--c-cta-500)' : 'var(--surface-bg)',
                  color: view === v ? 'var(--cta-1-fg, #fff)' : 'var(--text-2)',
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 4,
                  transition: 'background 150ms, color 150ms'
                }}
              >
                {v === 'gantt' && <BarChart2 size={13} />}
                {VIEW_LABELS[v]}
              </button>
            ))}
          </div>

          {/* Filter button */}
          <div style={{ position: 'relative' }}>
            <button
              data-filter-btn
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              style={{
                ...navBtnStyle(darkMode),
                padding: '5px 12px',
                display: 'flex', alignItems: 'center', gap: 6,
                background: (filterProjectId) ? 'rgba(110,203,195,0.12)' : undefined,
                borderColor: (filterProjectId) ? 'var(--c-cta-500)' : undefined,
                color: (filterProjectId) ? 'var(--c-cta-500)' : undefined
              }}
            >
              <Filter size={14} /> Filtres{filterProjectId ? ' ·' : ''}
            </button>

            {showFilters && (
              <div data-filter-panel style={{
                position: 'absolute', top: 'calc(100% + 8px)', right: 0, zIndex: 200,
                background: bg, border: `1px solid ${bdr}`,
                borderRadius: 12, padding: 20, minWidth: 280,
                boxShadow: darkMode ? '0 8px 24px rgba(0,0,0,0.4)' : '0 8px 24px rgba(0,0,0,0.12)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-1)' }}>Filtres</span>
                  <button onClick={() => setShowFilters(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-2)' }}>
                    <X size={16} />
                  </button>
                </div>

                <label style={filterLabelStyle}>Projecte</label>
                <select
                  value={filterProjectId || ''}
                  onChange={(e) => setFilterProjectId(e.target.value || null)}
                  style={filterSelectStyle(darkMode)}
                >
                  <option value="">Tots els projectes</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}{p.code ? ` (${p.code})` : ''}</option>
                  ))}
                </select>

                {(filterProjectId) && (
                  <button
                    type="button"
                    onClick={() => { setFilterProjectId(null); setShowFilters(false) }}
                    style={{ marginTop: 12, fontSize: 12, color: 'var(--c-cta-500)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                  >
                    Netejar filtres
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Legend ── */}
        <LegendStrip activeFilter={filterType} onFilter={setFilterType} darkMode={darkMode} />

        {/* ── Content ── */}
        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, color: 'var(--text-2)', fontSize: 14 }}>
            Carregant esdeveniments…
          </div>
        )}

        {!loading && error && (
          <div style={{ padding: 20, borderRadius: 10, background: '#fee2e2', color: '#dc2626', fontSize: 13 }}>
            Error: {error}
          </div>
        )}

        {!loading && !error && view === 'gantt' && (
          <GanttView
            events={calendarEvents}
            dateRange={ganttRange}
            darkMode={darkMode}
            onEventClick={handleEventClick}
          />
        )}

        {!loading && !error && view !== 'gantt' && (
          <div style={{
            background: bg, borderRadius: 14, padding: isMobile ? 12 : 20,
            border: `1px solid ${bdr}`, minHeight: 560,
            boxShadow: darkMode ? '0 1px 4px rgba(0,0,0,0.2)' : '0 1px 4px rgba(0,0,0,0.05)'
          }} className="fd-calendar-asana">
            <Calendar
              localizer={localizer}
              events={calendarEvents}
              startAccessor="start"
              endAccessor="end"
              style={{ height: isMobile ? 480 : 580 }}
              view={view}
              onView={handleViewChange}
              date={date}
              onNavigate={handleNavigate}
              onSelectEvent={handleEventClick}
              eventPropGetter={eventStyleGetter}
              components={{ event: CustomEvent, toolbar: () => null }}
              culture={currentMomentLocale}
              formats={calFormats}
              messages={{
                next: 'Seg', previous: 'Ant', today: 'Avui',
                month: 'Mes', week: 'Setmana', day: 'Dia', agenda: 'Agenda',
                date: 'Data', time: 'Hora', event: 'Esdeveniment',
                noEventsInRange: 'Cap esdeveniment en aquest rang.',
                showMore: (n) => `+${n} més`
              }}
              key={i18n.language}
            />
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Style helpers ─────────────────────────────────────────────────────────── */
const navBtnStyle = (dark) => ({
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  padding: '5px 8px', border: `1px solid ${dark ? '#374151' : '#e5e7eb'}`,
  borderRadius: 7, background: 'var(--surface-bg)',
  color: 'var(--text-1)', cursor: 'pointer', fontSize: 13, fontWeight: 500
})
const filterLabelStyle = {
  display: 'block', fontSize: 11, fontWeight: 700,
  color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6
}
const filterSelectStyle = (dark) => ({
  width: '100%', padding: '7px 10px',
  background: dark ? '#1f1f2e' : '#f9fafb',
  border: `1px solid ${dark ? '#374151' : '#e5e7eb'}`,
  borderRadius: 7, color: 'var(--text-1)', fontSize: 13, cursor: 'pointer', outline: 'none'
})
