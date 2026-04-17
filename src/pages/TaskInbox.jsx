import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Calendar, ArrowRight, Plus, ChevronDown, ChevronRight, Clock } from 'lucide-react'
import { useApp } from '../context/AppContext'
import {
  getTasks,
  markTaskDone,
  snoozeTask,
  bulkMarkTasksDone,
  bulkSnoozeTasks
} from '../lib/supabase'
import { showToast } from '../components/Toast'
import { parseISO, format, isToday, isPast, isTomorrow } from 'date-fns'
import { ca } from 'date-fns/locale'

// Paleta corporativa
const C = {
  petrol:     '#1F5F63',
  turquesa:   '#6ECBC3',
  turqHover:  '#4FBFB7',
  offwhite:   '#F6F8F3',
  coral:      '#F26C6C',
  muted:      '#8A9FAF',
  border:     '#E2EAE8',
  borderDark: '#2A3F42',
  surface:    '#FFFFFF',
  surfaceDark:'#1A2E30',
  bg:         '#F6F8F3',
  bgDark:     '#0F1F20',
  amber:      '#F0B429',
}

const SOURCE_LABELS = {
  manual: 'Manual',
  sticky_note: 'Nota',
  alert: 'Alerta',
  decision: 'Decisió',
  gate: 'Gate',
}

function getDueInfo(dueDate) {
  if (!dueDate) return { text: null, color: C.muted }
  const due = parseISO(dueDate)
  if (isPast(due) && !isToday(due)) return { text: format(due, 'd MMM', { locale: ca }), color: C.coral }
  if (isToday(due))   return { text: 'Avui',   color: C.amber }
  if (isTomorrow(due)) return { text: 'Demà',  color: C.amber }
  return { text: format(due, 'd MMM', { locale: ca }), color: C.muted }
}

function groupTasks(tasks) {
  const overdue  = tasks.filter(t => t.due_date && isPast(parseISO(t.due_date)) && !isToday(parseISO(t.due_date)))
  const today    = tasks.filter(t => t.due_date && isToday(parseISO(t.due_date)))
  const upcoming = tasks.filter(t => !t.due_date || (!isPast(parseISO(t.due_date)) && !isToday(parseISO(t.due_date))))
  return [
    { key: 'overdue',  label: 'Vencudes',  tasks: overdue,  accent: C.coral },
    { key: 'today',    label: 'Avui',       tasks: today,    accent: C.amber },
    { key: 'upcoming', label: 'Properes',   tasks: upcoming, accent: C.petrol },
  ].filter(g => g.tasks.length > 0)
}

// Checkbox circular estil Asana
function CircleCheck({ done, loading, onClick }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
        border: `2px solid ${done ? C.turquesa : hovered ? C.turquesa : C.muted}`,
        background: done ? C.turquesa : hovered ? `${C.turquesa}22` : 'transparent',
        cursor: loading ? 'wait' : 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.15s', padding: 0,
        opacity: loading ? 0.5 : 1,
      }}
    >
      {(done || hovered) && (
        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
          <path d="M1 4l3 3 5-6" stroke={done ? '#fff' : C.turquesa} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )}
    </button>
  )
}

export default function TaskInbox() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { darkMode, activeOrgId } = useApp()
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(null)
  const [collapsed, setCollapsed] = useState({})
  const [showDone, setShowDone] = useState(false)
  const [activeTab, setActiveTab] = useState('list')

  const bg      = darkMode ? C.bgDark      : C.bg
  const surface = darkMode ? C.surfaceDark : C.surface
  const border  = darkMode ? C.borderDark  : C.border
  const text    = darkMode ? '#F0F5F5'     : '#1A2E30'
  const muted   = darkMode ? '#5A7A7E'     : C.muted

  const loadTasks = useCallback(async () => {
    if (!activeOrgId) { setTasks([]); setLoading(false); return }
    setLoading(true)
    try {
      const data = await getTasks({ org_id: activeOrgId })
      setTasks(data || [])
    } catch (err) {
      showToast(err?.message || 'Error', 'error')
      setTasks([])
    } finally {
      setLoading(false)
    }
  }, [activeOrgId])

  useEffect(() => { loadTasks() }, [loadTasks])

  const handleMarkDone = async (taskId) => {
    setActionLoading(taskId)
    try {
      await markTaskDone(taskId)
      await loadTasks()
    } catch (err) { showToast(err?.message || 'Error', 'error') }
    setActionLoading(null)
  }

  const handleSnooze = async (taskId, days) => {
    setActionLoading(taskId)
    try {
      await snoozeTask(taskId, days)
      showToast(`Ajornada ${days}d`, 'success')
      await loadTasks()
    } catch (err) { showToast(err?.message || 'Error', 'error') }
    setActionLoading(null)
  }

  const handleOpenEntity = (task) => {
    const routes = {
      project: `/app/projects/${task.entity_id}`,
      purchase_order: `/app/orders?po=${task.entity_id}`,
      supplier: '/app/suppliers',
      shipment: '/app/orders',
    }
    if (routes[task.entity_type]) navigate(routes[task.entity_type])
  }

  const open   = tasks.filter(t => t.status === 'open')
  const done   = tasks.filter(t => t.status === 'done')
  const groups = groupTasks(open)

  const toggleSection = (key) => setCollapsed(p => ({ ...p, [key]: !p[key] }))

  return (
    <div style={{ background: bg, minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* HEADER ESTIL ASANA */}
      <div style={{
        background: surface,
        borderBottom: `1px solid ${border}`,
        padding: '0 32px',
      }}>
        {/* Títol + tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingTop: 20, paddingBottom: 0 }}>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: C.petrol, letterSpacing: '-0.3px' }}>
            Safata de Tasques
          </h1>
          <ChevronDown size={16} color={muted} />
        </div>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0, marginTop: 12 }}>
          {['list', 'calendar'].map(tab => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '8px 16px',
                fontSize: 13, fontWeight: 500,
                border: 'none', background: 'transparent', cursor: 'pointer',
                color: activeTab === tab ? C.petrol : muted,
                borderBottom: activeTab === tab ? `2px solid ${C.petrol}` : '2px solid transparent',
                transition: 'all 0.15s',
              }}
            >
              {tab === 'list' ? 'Llista' : 'Calendari'}
            </button>
          ))}
        </div>
      </div>

      {/* TOOLBAR */}
      <div style={{
        background: surface, borderBottom: `1px solid ${border}`,
        padding: '10px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
      }}>
        <button
          type="button"
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: C.turquesa, color: C.petrol, border: 'none',
            borderRadius: 8, padding: '7px 16px', fontSize: 13, fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <Plus size={16} /> Nova tasca
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: 12, color: muted }}>
            {open.length} tasques obertes
          </span>
          <button
            type="button"
            onClick={() => setShowDone(p => !p)}
            style={{
              fontSize: 12, color: showDone ? C.petrol : muted, border: 'none',
              background: 'transparent', cursor: 'pointer', fontWeight: 500,
            }}
          >
            {showDone ? 'Ocultar completades' : 'Veure completades'}
          </button>
        </div>
      </div>

      {/* CONTINGUT */}
      <div style={{ flex: 1, padding: '24px 32px', maxWidth: 900 }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: muted }}>Carregant...</div>
        ) : open.length === 0 && !showDone ? (
          <div style={{
            margin: '48px auto', maxWidth: 400, textAlign: 'center',
            padding: 40, background: surface, borderRadius: 12, border: `1px solid ${border}`,
          }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>✅</div>
            <p style={{ color: text, fontWeight: 600, fontSize: 16, margin: '0 0 8px' }}>Tot al dia!</p>
            <p style={{ color: muted, fontSize: 14, margin: 0 }}>No hi ha tasques pendents.</p>
          </div>
        ) : (
          <>
            {/* Seccions agrupades */}
            {groups.map(group => (
              <div key={group.key} style={{ marginBottom: 8 }}>
                {/* Capçalera secció */}
                <button
                  type="button"
                  onClick={() => toggleSection(group.key)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    background: 'none', border: 'none', cursor: 'pointer',
                    padding: '6px 0', marginBottom: 2, width: '100%',
                  }}
                >
                  {collapsed[group.key]
                    ? <ChevronRight size={14} color={group.accent} />
                    : <ChevronDown  size={14} color={group.accent} />
                  }
                  <span style={{ fontSize: 13, fontWeight: 600, color: group.accent }}>
                    {group.label}
                  </span>
                  <span style={{
                    marginLeft: 6, fontSize: 11, color: muted,
                    background: `${group.accent}18`, borderRadius: 10,
                    padding: '1px 7px',
                  }}>
                    {group.tasks.length}
                  </span>
                </button>

                {/* Files de tasques */}
                {!collapsed[group.key] && (
                  <div style={{
                    background: surface, borderRadius: 10,
                    border: `1px solid ${border}`, overflow: 'hidden',
                  }}>
                    {group.tasks.map((task, idx) => (
                      <TaskRow
                        key={task.id}
                        task={task}
                        last={idx === group.tasks.length - 1}
                        loading={actionLoading === task.id}
                        onDone={() => handleMarkDone(task.id)}
                        onSnooze={(d) => handleSnooze(task.id, d)}
                        onOpen={() => handleOpenEntity(task)}
                        border={border} text={text} muted={muted} darkMode={darkMode}
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Completades */}
            {showDone && done.length > 0 && (
              <div style={{ marginTop: 24 }}>
                <button
                  type="button"
                  onClick={() => toggleSection('done')}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    background: 'none', border: 'none', cursor: 'pointer',
                    padding: '6px 0', marginBottom: 2,
                  }}
                >
                  {collapsed['done']
                    ? <ChevronRight size={14} color={muted} />
                    : <ChevronDown  size={14} color={muted} />
                  }
                  <span style={{ fontSize: 13, fontWeight: 600, color: muted }}>Completades</span>
                  <span style={{
                    marginLeft: 6, fontSize: 11, color: muted,
                    background: `${muted}20`, borderRadius: 10, padding: '1px 7px',
                  }}>{done.length}</span>
                </button>
                {!collapsed['done'] && (
                  <div style={{
                    background: surface, borderRadius: 10,
                    border: `1px solid ${border}`, overflow: 'hidden', opacity: 0.7,
                  }}>
                    {done.map((task, idx) => (
                      <TaskRow
                        key={task.id}
                        task={task}
                        last={idx === done.length - 1}
                        loading={false}
                        onDone={() => {}}
                        onSnooze={() => {}}
                        onOpen={() => handleOpenEntity(task)}
                        border={border} text={text} muted={muted} darkMode={darkMode}
                        isDone
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function TaskRow({ task, last, loading, onDone, onSnooze, onOpen, border, text, muted, darkMode, isDone }) {
  const [hovered, setHovered] = useState(false)
  const due = getDueInfo(task.due_date)
  const source = SOURCE_LABELS[task.source] || task.source || 'Manual'

  // Badge de prioritat
  const priorityBadge = task.priority === 'high'
    ? { label: 'Alta', bg: `${C.coral}18`, color: C.coral }
    : task.priority === 'low'
    ? { label: 'Baixa', bg: `${C.muted}18`, color: C.muted }
    : null

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '10px 16px',
        borderBottom: last ? 'none' : `1px solid ${border}`,
        background: hovered ? (darkMode ? '#1E3537' : `${C.turquesa}08`) : 'transparent',
        transition: 'background 0.12s',
      }}
    >
      {/* Checkbox circular */}
      <CircleCheck done={isDone} loading={loading} onClick={isDone ? undefined : onDone} />

      {/* Contingut principal */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{
            fontSize: 14, color: isDone ? muted : text,
            textDecoration: isDone ? 'line-through' : 'none',
            fontWeight: 500,
          }}>
            {task.title}
          </span>
          {/* Badge font */}
          <span style={{
            fontSize: 11, padding: '2px 7px', borderRadius: 8,
            background: `${C.turquesa}18`, color: C.petrol, fontWeight: 500,
          }}>
            {source}
          </span>
          {/* Badge prioritat */}
          {priorityBadge && (
            <span style={{
              fontSize: 11, padding: '2px 7px', borderRadius: 8,
              background: priorityBadge.bg, color: priorityBadge.color, fontWeight: 500,
            }}>
              {priorityBadge.label}
            </span>
          )}
        </div>
        {task.notes && (
          <p style={{ margin: '2px 0 0', fontSize: 12, color: muted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {task.notes}
          </p>
        )}
      </div>

      {/* Data + accions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        {due.text && (
          <span style={{
            display: 'flex', alignItems: 'center', gap: 4,
            fontSize: 12, color: due.color, fontWeight: 500,
          }}>
            <Calendar size={12} />
            {due.text}
          </span>
        )}
        {/* Accions — visibles en hover */}
        {hovered && !isDone && (
          <div style={{ display: 'flex', gap: 4 }}>
            <button
              type="button" onClick={() => onSnooze(1)}
              title="Ajornar 1 dia"
              style={{
                padding: '3px 7px', fontSize: 11, border: `1px solid ${C.amber}`,
                color: C.amber, background: `${C.amber}18`, borderRadius: 6,
                cursor: 'pointer', fontWeight: 600,
              }}
            >+1d</button>
            <button
              type="button" onClick={() => onSnooze(3)}
              title="Ajornar 3 dies"
              style={{
                padding: '3px 7px', fontSize: 11, border: `1px solid ${C.amber}`,
                color: C.amber, background: `${C.amber}18`, borderRadius: 6,
                cursor: 'pointer', fontWeight: 600,
              }}
            >+3d</button>
          </div>
        )}
        {hovered && (
          <button
            type="button" onClick={onOpen}
            style={{
              padding: '3px 7px', border: `1px solid ${border}`,
              color: muted, background: 'transparent', borderRadius: 6,
              cursor: 'pointer', display: 'flex', alignItems: 'center',
            }}
          >
            <ArrowRight size={13} />
          </button>
        )}
      </div>
    </div>
  )
}
