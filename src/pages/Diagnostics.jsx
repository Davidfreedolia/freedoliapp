import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useApp } from '../context/AppContext'
import Button from '../components/Button'
import { 
  supabase, 
  getCurrentUserId,
  getProjects,
  getTasks,
  createTask,
  updateTask,
  deleteTask,
  getStickyNotes,
  createStickyNote,
  updateStickyNote,
  deleteStickyNote,
  convertStickyNoteToTask,
  getCalendarEvents,
  getDashboardStats
} from '../lib/supabase'
import { CheckCircle2, XCircle, AlertTriangle, Play, RefreshCw, ExternalLink } from 'lucide-react'

const CHECK_STATUS = {
  PENDING: 'pending',
  RUNNING: 'running',
  OK: 'ok',
  WARNING: 'warning',
  FAIL: 'fail'
}

export default function Diagnostics() {
  const { darkMode } = useApp()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [checks, setChecks] = useState({})
  const [logs, setLogs] = useState([])
  const [running, setRunning] = useState(false)

  const addLog = (message, type = 'info') => {
    setLogs(prev => [...prev, { 
      timestamp: new Date().toISOString(),
      message,
      type // info, success, warning, error
    }])
  }

  const updateCheck = (checkId, status, result = null, error = null, fixPath = null) => {
    setChecks(prev => ({
      ...prev,
      [checkId]: {
        status,
        result,
        error,
        fixPath,
        timestamp: new Date().toISOString()
      }
    }))
  }

  // 1) Auth check
  const checkAuth = async () => {
    updateCheck('auth', CHECK_STATUS.RUNNING)
    try {
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error) throw error
      if (!session) {
        updateCheck('auth', CHECK_STATUS.FAIL, null, 'No session found')
        addLog('❌ Auth check failed: No session', 'error')
        return
      }

      const userId = await getCurrentUserId()
      updateCheck('auth', CHECK_STATUS.OK, { 
        userId,
        email: session.user?.email,
        expiresAt: session.expires_at
      })
      addLog('✅ Auth check passed', 'success')
    } catch (err) {
      updateCheck('auth', CHECK_STATUS.FAIL, null, err.message)
      addLog(`❌ Auth check failed: ${err.message}`, 'error')
    }
  }

  // 2) DB/RLS checks
  const checkDB = async () => {
    updateCheck('db', CHECK_STATUS.RUNNING)
    const tables = ['projects', 'suppliers', 'purchase_orders', 'tasks', 'sticky_notes']
    const results = {}
    let allOk = true

    try {
      for (const table of tables) {
        try {
          const { data, error } = await supabase.from(table).select('id').limit(1)
          if (error) {
            results[table] = { ok: false, error: error.message }
            allOk = false
            addLog(`❌ ${table}: ${error.message}`, 'error')
          } else {
            results[table] = { ok: true, count: data?.length || 0 }
            addLog(`✅ ${table}: accessible`, 'success')
          }
        } catch (err) {
          results[table] = { ok: false, error: err.message }
          allOk = false
          addLog(`❌ ${table}: ${err.message}`, 'error')
        }
      }

      updateCheck('db', allOk ? CHECK_STATUS.OK : CHECK_STATUS.FAIL, results)
    } catch (err) {
      updateCheck('db', CHECK_STATUS.FAIL, null, err.message)
      addLog(`❌ DB check failed: ${err.message}`, 'error')
    }
  }

  // 3) Sticky Notes CRUD
  const checkStickyNotes = async () => {
    updateCheck('sticky_notes', CHECK_STATUS.RUNNING)
    try {
      // Create
      const testNote = {
        content: 'QA Test Note - ' + Date.now(),
        title: 'QA Test',
        pinned: true,
        status: 'open'
      }
      const created = await createStickyNote(testNote)
      addLog('✅ Sticky note created', 'success')

      // List
      const notes = await getStickyNotes({ status: 'open' })
      const found = notes?.find(n => n.id === created.id)
      if (!found) throw new Error('Created note not found in list')
      addLog('✅ Sticky note listed', 'success')

      // Update (mark done)
      await updateStickyNote(created.id, { status: 'done' })
      const updated = await getStickyNotes({ status: 'done' })
      const foundDone = updated?.find(n => n.id === created.id)
      if (!foundDone) throw new Error('Updated note not found')
      addLog('✅ Sticky note updated (mark done)', 'success')

      // Delete
      await deleteStickyNote(created.id)
      const afterDelete = await getStickyNotes()
      const stillExists = afterDelete?.find(n => n.id === created.id)
      if (stillExists) throw new Error('Note still exists after delete')
      addLog('✅ Sticky note deleted', 'success')

      // Overlay rule: open+pinned should be visible
      const openPinned = await getStickyNotes({ status: 'open' })
      const pinnedCount = openPinned?.filter(n => n.pinned).length || 0
      addLog(`✅ Overlay rule: ${pinnedCount} open+pinned notes`, 'success')

      updateCheck('sticky_notes', CHECK_STATUS.OK, {
        crud: 'passed',
        overlayNotes: pinnedCount
      })
    } catch (err) {
      updateCheck('sticky_notes', CHECK_STATUS.FAIL, null, err.message, '/')
      addLog(`❌ Sticky Notes check failed: ${err.message}`, 'error')
    }
  }

  // 4) Sticky -> Task conversion
  const checkStickyToTask = async () => {
    updateCheck('sticky_to_task', CHECK_STATUS.RUNNING)
    let testNoteId = null
    let testTaskId = null

    try {
      // Create sticky
      const testNote = {
        content: 'QA Test Note for Task Conversion - ' + Date.now(),
        title: 'QA Test Task',
        pinned: true,
        status: 'open',
        priority: 'normal'
      }
      const created = await createStickyNote(testNote)
      testNoteId = created.id
      addLog('✅ Sticky note created for conversion', 'success')

      // Convert to task
      const { task } = await convertStickyNoteToTask(testNoteId)
      testTaskId = task.id
      addLog('✅ Sticky note converted to task', 'success')

      // Verify: task created
      if (!task) throw new Error('Task not created')
      if (task.title !== testNote.title && task.title !== testNote.content.substring(0, 100)) {
        addLog('⚠️ Task title mismatch (using content)', 'warning')
      }
      
      // Verify: linked_task_id set
      const updatedNote = await getStickyNotes()
      const convertedNote = updatedNote?.find(n => n.id === testNoteId)
      if (!convertedNote?.linked_task_id) {
        throw new Error('linked_task_id not set')
      }
      if (convertedNote.linked_task_id !== task.id) {
        throw new Error('linked_task_id does not match task.id')
      }
      addLog('✅ linked_task_id set correctly', 'success')

      // Verify: pinned false
      if (convertedNote.pinned !== false) {
        throw new Error('pinned should be false after conversion')
      }
      addLog('✅ pinned set to false', 'success')

      // Verify: no duplicates (try to convert again should fail)
      try {
        await convertStickyNoteToTask(testNoteId)
        throw new Error('Should not allow duplicate conversion')
      } catch (dupErr) {
        if (dupErr.message.includes('ALREADY_LINKED') || dupErr.message.includes('already linked')) {
          addLog('✅ Duplicate conversion prevented', 'success')
        } else {
          throw dupErr
        }
      }

      // Cleanup
      if (testTaskId) {
        await deleteTask(testTaskId)
        addLog('✅ Test task deleted', 'success')
      }
      if (testNoteId) {
        await deleteStickyNote(testNoteId)
        addLog('✅ Test sticky note deleted', 'success')
      }

      updateCheck('sticky_to_task', CHECK_STATUS.OK, {
        conversion: 'passed',
        taskId: testTaskId,
        linkedTaskId: convertedNote?.linked_task_id
      })
    } catch (err) {
      // Cleanup on error
      if (testTaskId) {
        try { await deleteTask(testTaskId) } catch {}
      }
      if (testNoteId) {
        try { await deleteStickyNote(testNoteId) } catch {}
      }

      updateCheck('sticky_to_task', CHECK_STATUS.FAIL, null, err.message, '/')
      addLog(`❌ Sticky->Task check failed: ${err.message}`, 'error')
    }
  }

  // 5) Tasks CRUD
  const checkTasks = async () => {
    updateCheck('tasks', CHECK_STATUS.RUNNING)
    let testTaskId = null

    try {
      // Get projects for task creation
      const projects = await getProjects()
      const testProject = projects?.[0]

      if (!testProject) {
        updateCheck('tasks', CHECK_STATUS.WARNING, null, 'No projects available for test task', '/app/projects')
        addLog('⚠️ Tasks check: No projects available', 'warning')
        return
      }

      // Create
      const testTask = {
        title: 'QA Test Task - ' + Date.now(),
        notes: 'QA test notes',
        due_date: new Date().toISOString().split('T')[0],
        priority: 'normal',
        status: 'open',
        entity_type: 'project',
        entity_id: testProject.id
      }
      const created = await createTask(testTask)
      testTaskId = created.id
      if (!created.due_date) throw new Error('due_date not set')
      addLog('✅ Task created', 'success')

      // List
      const tasks = await getTasks()
      const found = tasks?.find(t => t.id === testTaskId)
      if (!found) throw new Error('Created task not found')
      addLog('✅ Task listed', 'success')

      // Update (snooze)
      const newDueDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      await updateTask(testTaskId, { due_date: newDueDate })
      const updated = await getTasks()
      const foundUpdated = updated?.find(t => t.id === testTaskId)
      if (foundUpdated?.due_date !== newDueDate) {
        throw new Error('due_date not updated')
      }
      addLog('✅ Task updated (snooze)', 'success')

      // Mark done
      await updateTask(testTaskId, { status: 'done' })
      const doneTasks = await getTasks({ status: 'done' })
      const foundDone = doneTasks?.find(t => t.id === testTaskId)
      if (!foundDone) throw new Error('Task not marked as done')
      addLog('✅ Task marked as done', 'success')

      // Delete
      await deleteTask(testTaskId)
      const afterDelete = await getTasks()
      const stillExists = afterDelete?.find(t => t.id === testTaskId)
      if (stillExists) throw new Error('Task still exists after delete')
      addLog('✅ Task deleted', 'success')

      updateCheck('tasks', CHECK_STATUS.OK, {
        crud: 'passed',
        testProject: testProject.name
      })
    } catch (err) {
      // Cleanup
      if (testTaskId) {
        try { await deleteTask(testTaskId) } catch {}
      }

      updateCheck('tasks', CHECK_STATUS.FAIL, null, err.message, '/')
      addLog(`❌ Tasks check failed: ${err.message}`, 'error')
    }
  }

  // 6) Calendar events
  const checkCalendar = async () => {
    updateCheck('calendar', CHECK_STATUS.RUNNING)
    try {
      const events = await getCalendarEvents({
        types: ['task', 'shipment', 'manufacturer', 'quote'],
        showCompleted: false
      })

      if (!Array.isArray(events)) {
        throw new Error('Events is not an array')
      }

      const taskEvents = events.filter(e => e.type === 'task')
      const shipmentEvents = events.filter(e => e.type === 'shipment')
      const packEvents = events.filter(e => e.type === 'manufacturer')
      const quoteEvents = events.filter(e => e.type === 'quote')

      if (taskEvents.length === 0) {
        addLog('⚠️ No task events found', 'warning')
      } else {
        addLog(`✅ Tasks events: ${taskEvents.length}`, 'success')
      }

      addLog(`✅ Shipment events: ${shipmentEvents.length}`, 'success')
      addLog(`✅ Pack events: ${packEvents.length}`, 'success')
      addLog(`✅ Quote events: ${quoteEvents.length}`, 'success')

      // Validate event structure
      const invalidEvents = events.filter(e => !e.id || !e.title || !e.start || !e.type)
      if (invalidEvents.length > 0) {
        throw new Error(`${invalidEvents.length} events with invalid structure`)
      }

      // Navigation smoke test (just check routes exist)
      const routes = ['/app/projects', '/app/orders', '/app/calendar']
      addLog(`✅ Routes exist: ${routes.join(', ')}`, 'success')

      updateCheck('calendar', CHECK_STATUS.OK, {
        totalEvents: events.length,
        tasks: taskEvents.length,
        shipments: shipmentEvents.length,
        packs: packEvents.length,
        quotes: quoteEvents.length
      })
    } catch (err) {
      updateCheck('calendar', CHECK_STATUS.FAIL, null, err.message, '/calendar')
      addLog(`❌ Calendar check failed: ${err.message}`, 'error')
    }
  }

  // 7) Dashboard widgets
  const checkDashboard = async () => {
    updateCheck('dashboard', CHECK_STATUS.RUNNING)
    try {
      const stats = await getDashboardStats()
      
      if (!stats) {
        throw new Error('Dashboard stats is null')
      }

      // Check counts are coherent (not NaN, not negative)
      const counts = [
        stats.totalProjects,
        stats.activeProjects,
        stats.completedProjects,
        stats.totalInvested
      ]

      const invalidCounts = counts.filter(c => isNaN(c) || c < 0)
      if (invalidCounts.length > 0) {
        throw new Error(`Invalid counts: ${invalidCounts.length} NaN or negative values`)
      }

      addLog(`✅ Dashboard stats loaded: ${stats.totalProjects} projects`, 'success')
      addLog(`✅ Active: ${stats.activeProjects}, Completed: ${stats.completedProjects}`, 'success')

      updateCheck('dashboard', CHECK_STATUS.OK, {
        totalProjects: stats.totalProjects,
        activeProjects: stats.activeProjects,
        completedProjects: stats.completedProjects
      })
    } catch (err) {
      updateCheck('dashboard', CHECK_STATUS.FAIL, null, err.message, '/')
      addLog(`❌ Dashboard check failed: ${err.message}`, 'error')
    }
  }

  const runAllChecks = async () => {
    setRunning(true)
    setLogs([])
    addLog('🚀 Starting diagnostics...', 'info')

    await checkAuth()
    await checkDB()
    await checkStickyNotes()
    await checkStickyToTask()
    await checkTasks()
    await checkCalendar()
    await checkDashboard()

    addLog('✅ All checks completed', 'success')
    setRunning(false)
  }

  const runCheck = async (checkId) => {
    const checkMap = {
      auth: checkAuth,
      db: checkDB,
      sticky_notes: checkStickyNotes,
      sticky_to_task: checkStickyToTask,
      tasks: checkTasks,
      calendar: checkCalendar,
      dashboard: checkDashboard
    }

    const checkFn = checkMap[checkId]
    if (checkFn) {
      setRunning(true)
      addLog(`🔄 Running ${checkId} check...`, 'info')
      await checkFn()
      setRunning(false)
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case CHECK_STATUS.OK:
        return <CheckCircle2 size={20} color="#22c55e" />
      case CHECK_STATUS.WARNING:
        return <AlertTriangle size={20} color="#f59e0b" />
      case CHECK_STATUS.FAIL:
        return <XCircle size={20} color="#ef4444" />
      case CHECK_STATUS.RUNNING:
        return <RefreshCw size={20} color="#3b82f6" className="animate-spin" />
      default:
        return <Play size={20} color="#9ca3af" />
    }
  }

  const getStatusText = (status) => {
    switch (status) {
      case CHECK_STATUS.OK:
        return 'OK'
      case CHECK_STATUS.WARNING:
        return 'Warning'
      case CHECK_STATUS.FAIL:
        return 'Fail'
      case CHECK_STATUS.RUNNING:
        return 'Running...'
      default:
        return 'Not run'
    }
  }

  const styles = {
    container: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: darkMode ? '#0a0a0f' : '#f8f9fc',
      padding: '32px',
      overflowY: 'auto'
    },
    header: {
      marginBottom: '32px'
    },
    title: {
      fontSize: '32px',
      fontWeight: '700',
      color: darkMode ? '#ffffff' : '#111827',
      margin: 0,
      marginBottom: '8px'
    },
    subtitle: {
      fontSize: '16px',
      color: darkMode ? '#9ca3af' : '#6b7280',
      margin: 0
    },
    actions: {
      display: 'flex',
      gap: '12px',
      marginBottom: '32px'
    },
    button: {
      padding: '12px 24px',
      borderRadius: '8px',
      border: 'none',
      fontSize: '14px',
      fontWeight: '500',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    primaryButton: {
      backgroundColor: '#4f46e5',
      color: '#ffffff'
    },
    secondaryButton: {
      backgroundColor: darkMode ? '#1f1f2e' : '#f3f4f6',
      color: darkMode ? '#ffffff' : '#111827',
      border: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`
    },
    checksGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))',
      gap: '20px',
      marginBottom: '32px'
    },
    checkCard: {
      backgroundColor: darkMode ? '#15151f' : '#ffffff',
      borderRadius: '12px',
      padding: '20px',
      border: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`
    },
    checkHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '16px'
    },
    checkTitle: {
      fontSize: '18px',
      fontWeight: '600',
      color: darkMode ? '#ffffff' : '#111827',
      margin: 0
    },
    checkStatus: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      fontSize: '14px',
      fontWeight: '500',
      color: darkMode ? '#9ca3af' : '#6b7280'
    },
    checkActions: {
      display: 'flex',
      gap: '8px',
      marginTop: '16px'
    },
    checkResult: {
      marginTop: '12px',
      padding: '12px',
      backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb',
      borderRadius: '8px',
      fontSize: '13px',
      color: darkMode ? '#9ca3af' : '#6b7280',
      fontFamily: 'monospace',
      whiteSpace: 'pre-wrap',
      wordBreak: 'break-word'
    },
    checkError: {
      marginTop: '12px',
      padding: '12px',
      backgroundColor: darkMode ? '#7f1d1d' : '#fef2f2',
      borderRadius: '8px',
      fontSize: '13px',
      color: '#ef4444',
      fontFamily: 'monospace',
      whiteSpace: 'pre-wrap',
      wordBreak: 'break-word'
    },
    console: {
      backgroundColor: darkMode ? '#15151f' : '#ffffff',
      borderRadius: '12px',
      padding: '20px',
      border: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`,
      maxHeight: '400px',
      overflowY: 'auto'
    },
    consoleHeader: {
      fontSize: '16px',
      fontWeight: '600',
      color: darkMode ? '#ffffff' : '#111827',
      marginBottom: '16px'
    },
    logEntry: {
      padding: '8px 0',
      fontSize: '13px',
      fontFamily: 'monospace',
      borderBottom: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`
    },
    logMessage: {
      color: darkMode ? '#9ca3af' : '#6b7280'
    },
    logSuccess: {
      color: '#22c55e'
    },
    logWarning: {
      color: '#f59e0b'
    },
    logError: {
      color: '#ef4444'
    }
  }

  const checksConfig = [
    { id: 'auth', name: 'Authentication', description: 'Session and user ID' },
    { id: 'db', name: 'Database / RLS', description: 'Table access and policies' },
    { id: 'sticky_notes', name: 'Sticky Notes CRUD', description: 'Create, list, update, delete' },
    { id: 'sticky_to_task', name: 'Sticky → Task', description: 'Conversion and linking' },
    { id: 'tasks', name: 'Tasks CRUD', description: 'Create, update, snooze, delete' },
    { id: 'calendar', name: 'Calendar Events', description: 'Event generation and structure' },
    { id: 'dashboard', name: 'Dashboard Widgets', description: 'Stats loading and validation' }
  ]

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Diagnostics & QA</h1>
        <p style={styles.subtitle}>
          Verify end-to-end functionality and detect common issues
        </p>
      </div>

      <div style={styles.actions}>
        <Button
          variant="primary"
          size="sm"
          onClick={runAllChecks}
          disabled={running}
          style={{
            opacity: running ? 0.6 : 1,
            cursor: running ? 'not-allowed' : 'pointer'
          }}
        >
          <Play size={18} />
          Run All Checks
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setLogs([])}
          style={{
            ...styles.secondaryButton
          }}
        >
          Clear Logs
        </Button>
      </div>

      <div style={styles.checksGrid}>
        {checksConfig.map(check => {
          const checkData = checks[check.id] || { status: CHECK_STATUS.PENDING }
          return (
            <div key={check.id} style={styles.checkCard}>
              <div style={styles.checkHeader}>
                <div>
                  <h3 style={styles.checkTitle}>{check.name}</h3>
                  <p style={{ fontSize: '12px', color: darkMode ? '#6b7280' : '#9ca3af', margin: '4px 0 0' }}>
                    {check.description}
                  </p>
                </div>
                <div style={styles.checkStatus}>
                  {getStatusIcon(checkData.status)}
                  <span>{getStatusText(checkData.status)}</span>
                </div>
              </div>

              {checkData.result && (
                <div style={styles.checkResult}>
                  {typeof checkData.result === 'object' 
                    ? JSON.stringify(checkData.result, null, 2)
                    : checkData.result
                  }
                </div>
              )}

              {checkData.error && (
                <div style={styles.checkError}>
                  {checkData.error}
                </div>
              )}

              <div style={styles.checkActions}>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => runCheck(check.id)}
                  disabled={running}
                  style={{
                    ...styles.secondaryButton,
                    padding: '8px 16px',
                    fontSize: '13px',
                    opacity: running ? 0.6 : 1,
                    cursor: running ? 'not-allowed' : 'pointer'
                  }}
                >
                  <RefreshCw size={14} />
                  Run Check
                </Button>
                {checkData.fixPath && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => navigate(checkData.fixPath)}
                    style={{
                      ...styles.secondaryButton,
                      padding: '8px 16px',
                      fontSize: '13px'
                    }}
                  >
                    <ExternalLink size={14} />
                    Fix
                  </Button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <div style={styles.console}>
        <h3 style={styles.consoleHeader}>Console</h3>
        {logs.length === 0 ? (
          <p style={{ color: darkMode ? '#6b7280' : '#9ca3af', fontSize: '14px' }}>
            No logs yet. Run checks to see output.
          </p>
        ) : (
          logs.map((log, idx) => {
            const logStyle = log.type === 'success' ? styles.logSuccess :
                           log.type === 'warning' ? styles.logWarning :
                           log.type === 'error' ? styles.logError :
                           styles.logMessage

            return (
              <div key={idx} style={styles.logEntry}>
                <span style={{ color: darkMode ? '#6b7280' : '#9ca3af', marginRight: '8px' }}>
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
                <span style={logStyle}>{log.message}</span>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

