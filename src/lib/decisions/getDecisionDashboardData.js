import { supabase } from '../supabase'

function deriveSeverity(priorityScore) {
  if (priorityScore == null) return 'low'
  const score = Number(priorityScore) || 0
  if (score >= 100) return 'high'
  if (score >= 50) return 'medium'
  return 'low'
}

function toDateOnlyIso(date) {
  const d = new Date(date)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString()
}

/**
 * Compute dashboard KPIs for an org and time window.
 *
 * - Open decisions
 * - High severity open decisions
 * - Acted rate
 * - Dismissed rate
 * - Average time-to-action (in hours) for acted/dismissed decisions
 */
export async function getDecisionDashboardSummary(params) {
  const { orgId, days } = params || {}
  if (!orgId || !days) {
    return {
      openCount: 0,
      highSeverityOpenCount: 0,
      actedRate: 0,
      dismissedRate: 0,
      avgTimeToActionHours: 0,
      totalClosed: 0,
    }
  }

  const now = new Date()
  const fromDate = new Date()
  fromDate.setDate(now.getDate() - days)
  const fromIso = toDateOnlyIso(fromDate)

  // 1) Current snapshot of open decisions (open + acknowledged)
  const { data: openRows, error: openError } = await supabase
    .from('decisions')
    .select('id, priority_score, status')
    .eq('org_id', orgId)
    .in('status', ['open', 'acknowledged'])

  if (openError) {
    console.error('getDecisionDashboardSummary: error loading open decisions', openError)
  }

  const openList = Array.isArray(openRows) ? openRows : []
  const openCount = openList.length
  const highSeverityOpenCount = openList.filter((d) => deriveSeverity(d.priority_score) === 'high').length

  // 2) Decisions created in window + their relevant events to compute funnel + time-to-action
  const { data: createdRows, error: createdError } = await supabase
    .from('decisions')
    .select('id, created_at, status')
    .eq('org_id', orgId)
    .gte('created_at', fromIso)

  if (createdError) {
    console.error('getDecisionDashboardSummary: error loading created decisions', createdError)
    return {
      openCount,
      highSeverityOpenCount,
      actedRate: 0,
      dismissedRate: 0,
      avgTimeToActionHours: 0,
      totalClosed: 0,
    }
  }

  const createdList = Array.isArray(createdRows) ? createdRows : []
  if (createdList.length === 0) {
    return {
      openCount,
      highSeverityOpenCount,
      actedRate: 0,
      dismissedRate: 0,
      avgTimeToActionHours: 0,
      totalClosed: 0,
    }
  }

  const decisionIds = createdList.map((d) => d.id)

  const { data: events, error: eventsError } = await supabase
    .from('decision_events')
    .select('decision_id, event_type, created_at, event_data')
    .in('decision_id', decisionIds)

  if (eventsError) {
    console.error('getDecisionDashboardSummary: error loading events', eventsError)
    return {
      openCount,
      highSeverityOpenCount,
      actedRate: 0,
      dismissedRate: 0,
      avgTimeToActionHours: 0,
      totalClosed: 0,
    }
  }

  const byDecision = new Map()
  for (const d of createdList) {
    byDecision.set(d.id, { createdAt: new Date(d.created_at), closeType: null, closeAt: null })
  }

  for (const ev of events || []) {
    const entry = byDecision.get(ev.decision_id)
    if (!entry) continue
    if (ev.event_type === 'acted' || ev.event_type === 'dismissed') {
      const t = new Date(ev.created_at)
      if (!entry.closeAt || t < entry.closeAt) {
        entry.closeAt = t
        entry.closeType = ev.event_type
      }
    }
  }

  let actedCount = 0
  let dismissedCount = 0
  let totalClosed = 0
  let sumHoursToAction = 0

  byDecision.forEach((entry) => {
    if (!entry.closeAt || !entry.closeType) return
    totalClosed += 1
    if (entry.closeType === 'acted') actedCount += 1
    if (entry.closeType === 'dismissed') dismissedCount += 1
    const msDiff = entry.closeAt.getTime() - entry.createdAt.getTime()
    if (msDiff > 0) {
      sumHoursToAction += msDiff / (1000 * 60 * 60)
    }
  })

  const actedRate = totalClosed > 0 ? actedCount / totalClosed : 0
  const dismissedRate = totalClosed > 0 ? dismissedCount / totalClosed : 0
  const avgTimeToActionHours = totalClosed > 0 ? sumHoursToAction / totalClosed : 0

  return {
    openCount,
    highSeverityOpenCount,
    actedRate,
    dismissedRate,
    avgTimeToActionHours,
    totalClosed,
  }
}

/**
 * Group counts by status and decision_type for an org and time window.
 */
export async function getDecisionDashboardGroups(params) {
  const { orgId, days } = params || {}
  if (!orgId || !days) {
    return {
      byStatus: {},
      byType: {},
    }
  }

  const now = new Date()
  const fromDate = new Date()
  fromDate.setDate(now.getDate() - days)
  const fromIso = toDateOnlyIso(fromDate)

  const { data: rows, error } = await supabase
    .from('decisions')
    .select('id, decision_type, status, created_at')
    .eq('org_id', orgId)
    .gte('created_at', fromIso)

  if (error) {
    console.error('getDecisionDashboardGroups: error loading decisions', error)
    return { byStatus: {}, byType: {} }
  }

  const list = Array.isArray(rows) ? rows : []
  const byStatus = {}
  const byType = {}

  for (const d of list) {
    const s = d.status || 'unknown'
    const t = d.decision_type || 'unknown'
    byStatus[s] = (byStatus[s] || 0) + 1
    byType[t] = (byType[t] || 0) + 1
  }

  return { byStatus, byType }
}

/**
 * Recent decision activity timeline (created + status-change events) in window.
 *
 * Returns a small list (limit 20) ordered by time DESC.
 */
export async function getDecisionDashboardRecentActivity(params) {
  const { orgId, days, limit = 20 } = params || {}
  if (!orgId || !days) {
    return []
  }

  const now = new Date()
  const fromDate = new Date()
  fromDate.setDate(now.getDate() - days)
  const fromIso = toDateOnlyIso(fromDate)

  const [decisionsRes, eventsRes] = await Promise.all([
    supabase
      .from('decisions')
      .select('id, decision_type, status, title, created_at')
      .eq('org_id', orgId)
      .gte('created_at', fromIso),
    supabase
      .from('decision_events')
      .select('decision_id, event_type, created_at, event_data')
      .gte('created_at', fromIso),
  ])

  const decisionsError = decisionsRes.error
  const eventsError = eventsRes.error
  if (decisionsError) {
    console.error('getDecisionDashboardRecentActivity: error loading decisions', decisionsError)
  }
  if (eventsError) {
    console.error('getDecisionDashboardRecentActivity: error loading events', eventsError)
  }

  const decisions = Array.isArray(decisionsRes.data) ? decisionsRes.data : []
  const events = Array.isArray(eventsRes.data) ? eventsRes.data : []

  const decisionMap = new Map()
  for (const d of decisions) {
    decisionMap.set(d.id, d)
  }

  const items = []

  // Creation events (synthetic)
  for (const d of decisions) {
    items.push({
      kind: 'created',
      decisionId: d.id,
      decisionType: d.decision_type,
      title: d.title || 'Decision',
      status: d.status,
      at: new Date(d.created_at),
    })
  }

  // Lifecycle events
  for (const ev of events) {
    const d = decisionMap.get(ev.decision_id)
    if (!d) continue
    items.push({
      kind: 'event',
      decisionId: ev.decision_id,
      decisionType: d.decision_type,
      title: d.title || 'Decision',
      status: ev.event_type,
      at: new Date(ev.created_at),
    })
  }

  items.sort((a, b) => b.at.getTime() - a.at.getTime())
  return items.slice(0, limit)
}

/**
 * Decision Analytics summary for an org and time window.
 *
 * - Creation rate (per day)
 * - Acknowledgement / acted / dismissed rates
 * - Feedback useful / wrong rates
 * - Aggregations by decision_type and severity
 */
export async function getDecisionAnalyticsSummary(params) {
  const { orgId, days } = params || {}
  if (!orgId || !days) {
    return {
      overall: {
        createdCount: 0,
        creationRatePerDay: 0,
        acknowledgedRate: 0,
        actedRate: 0,
        dismissedRate: 0,
        feedbackUsefulRate: 0,
        feedbackWrongRate: 0,
      },
      byType: {},
      bySeverity: {},
      timeToActionBuckets: {},
    }
  }

  const now = new Date()
  const fromDate = new Date()
  fromDate.setDate(now.getDate() - days)
  const fromIso = toDateOnlyIso(fromDate)

  const { data: decisionsRows, error: decisionsError } = await supabase
    .from('decisions')
    .select('id, decision_type, priority_score, created_at')
    .eq('org_id', orgId)
    .gte('created_at', fromIso)

  if (decisionsError) {
    console.error('getDecisionAnalyticsSummary: error loading decisions', decisionsError)
    return {
      overall: {
        createdCount: 0,
        creationRatePerDay: 0,
        acknowledgedRate: 0,
        actedRate: 0,
        dismissedRate: 0,
        feedbackUsefulRate: 0,
        feedbackWrongRate: 0,
      },
      byType: {},
      bySeverity: {},
      timeToActionBuckets: {},
    }
  }

  const decisions = Array.isArray(decisionsRows) ? decisionsRows : []
  if (decisions.length === 0) {
    return {
      overall: {
        createdCount: 0,
        creationRatePerDay: 0,
        acknowledgedRate: 0,
        actedRate: 0,
        dismissedRate: 0,
        feedbackUsefulRate: 0,
        feedbackWrongRate: 0,
      },
      byType: {},
      bySeverity: {},
      timeToActionBuckets: {},
    }
  }

  const decisionIds = decisions.map((d) => d.id)

  const { data: eventsRows, error: eventsError } = await supabase
    .from('decision_events')
    .select('decision_id, event_type, created_at, event_data')
    .in('decision_id', decisionIds)
    .gte('created_at', fromIso)

  if (eventsError) {
    console.error('getDecisionAnalyticsSummary: error loading events', eventsError)
  }

  const events = Array.isArray(eventsRows) ? eventsRows : []

  const perDecision = new Map()
  const byType = {}
  const bySeverity = {}

  for (const d of decisions) {
    const severity = deriveSeverity(d.priority_score)
    const type = d.decision_type || 'unknown'
    perDecision.set(d.id, {
      createdAt: new Date(d.created_at),
      type,
      severity,
      hasAck: false,
      hasAct: false,
      hasDismiss: false,
      timeToActionHours: null,
      feedbackUseful: 0,
      feedbackWrong: 0,
      feedbackTotal: 0,
    })

    if (!byType[type]) {
      byType[type] = {
        createdCount: 0,
        acknowledgedCount: 0,
        actedCount: 0,
        dismissedCount: 0,
        feedbackUseful: 0,
        feedbackWrong: 0,
        feedbackTotal: 0,
      }
    }
    if (!bySeverity[severity]) {
      bySeverity[severity] = {
        createdCount: 0,
        acknowledgedCount: 0,
        actedCount: 0,
        dismissedCount: 0,
        feedbackUseful: 0,
        feedbackWrong: 0,
        feedbackTotal: 0,
      }
    }
    byType[type].createdCount += 1
    bySeverity[severity].createdCount += 1
  }

  for (const ev of events) {
    const entry = perDecision.get(ev.decision_id)
    if (!entry) continue
    const et = ev.event_type
    if (et === 'acknowledged') {
      entry.hasAck = true
    }
    if (et === 'acted') {
      entry.hasAct = true
      const t = new Date(ev.created_at)
      const msDiff = t.getTime() - entry.createdAt.getTime()
      if (msDiff > 0) {
        const hours = msDiff / (1000 * 60 * 60)
        if (entry.timeToActionHours == null || hours < entry.timeToActionHours) {
          entry.timeToActionHours = hours
        }
      }
    }
    if (et === 'dismissed') {
      entry.hasDismiss = true
      const t = new Date(ev.created_at)
      const msDiff = t.getTime() - entry.createdAt.getTime()
      if (msDiff > 0) {
        const hours = msDiff / (1000 * 60 * 60)
        if (entry.timeToActionHours == null || hours < entry.timeToActionHours) {
          entry.timeToActionHours = hours
        }
      }
    }
    if (
      et === 'decision_feedback_useful' ||
      et === 'decision_feedback_not_useful' ||
      et === 'decision_feedback_wrong'
    ) {
      entry.feedbackTotal += 1
      if (et === 'decision_feedback_useful') entry.feedbackUseful += 1
      if (et === 'decision_feedback_wrong') entry.feedbackWrong += 1
    }
  }

  let acknowledgedCount = 0
  let actedCount = 0
  let dismissedCount = 0
  let sumTimeToAction = 0
  let timeToActionCount = 0
  let feedbackUseful = 0
  let feedbackWrong = 0
  let feedbackTotal = 0

  const timeToActionBuckets = {
    '<1h': 0,
    '1-24h': 0,
    '1-3d': 0,
    '>3d': 0,
  }

  perDecision.forEach((entry) => {
    const { type, severity } = entry
    const typeAgg = byType[type]
    const sevAgg = bySeverity[severity]

    if (entry.hasAck) {
      acknowledgedCount += 1
      typeAgg.acknowledgedCount += 1
      sevAgg.acknowledgedCount += 1
    }
    if (entry.hasAct) {
      actedCount += 1
      typeAgg.actedCount += 1
      sevAgg.actedCount += 1
    }
    if (entry.hasDismiss) {
      dismissedCount += 1
      typeAgg.dismissedCount += 1
      sevAgg.dismissedCount += 1
    }
    if (entry.timeToActionHours != null) {
      sumTimeToAction += entry.timeToActionHours
      timeToActionCount += 1
      const h = entry.timeToActionHours
      if (h < 1) timeToActionBuckets['<1h'] += 1
      else if (h < 24) timeToActionBuckets['1-24h'] += 1
      else if (h < 72) timeToActionBuckets['1-3d'] += 1
      else timeToActionBuckets['>3d'] += 1
    }

    if (entry.feedbackTotal > 0) {
      feedbackUseful += entry.feedbackUseful
      feedbackWrong += entry.feedbackWrong
      feedbackTotal += entry.feedbackTotal
      typeAgg.feedbackUseful += entry.feedbackUseful
      typeAgg.feedbackWrong += entry.feedbackWrong
      typeAgg.feedbackTotal += entry.feedbackTotal
      sevAgg.feedbackUseful += entry.feedbackUseful
      sevAgg.feedbackWrong += entry.feedbackWrong
      sevAgg.feedbackTotal += entry.feedbackTotal
    }
  })

  const createdCount = decisions.length
  const creationRatePerDay = days > 0 ? createdCount / days : 0
  const acknowledgedRate = createdCount > 0 ? acknowledgedCount / createdCount : 0
  const actedRate = createdCount > 0 ? actedCount / createdCount : 0
  const dismissedRate = createdCount > 0 ? dismissedCount / createdCount : 0
  const avgTimeToActionHours = timeToActionCount > 0 ? sumTimeToAction / timeToActionCount : 0
  const feedbackUsefulRate = feedbackTotal > 0 ? feedbackUseful / feedbackTotal : 0
  const feedbackWrongRate = feedbackTotal > 0 ? feedbackWrong / feedbackTotal : 0

  return {
    overall: {
      createdCount,
      creationRatePerDay,
      acknowledgedRate,
      actedRate,
      dismissedRate,
      avgTimeToActionHours,
      feedbackUsefulRate,
      feedbackWrongRate,
    },
    byType,
    bySeverity,
    timeToActionBuckets,
  }
}

/**
 * Thin wrapper over getDecisionAnalyticsSummary that exposes only
 * action-related metrics (creation + ack/acted/dismissed rates).
 */
export async function getDecisionActionStats(params) {
  const analytics = await getDecisionAnalyticsSummary(params)
  return {
    overall: {
      createdCount: analytics.overall.createdCount,
      creationRatePerDay: analytics.overall.creationRatePerDay,
      acknowledgedRate: analytics.overall.acknowledgedRate,
      actedRate: analytics.overall.actedRate,
      dismissedRate: analytics.overall.dismissedRate,
      avgTimeToActionHours: analytics.overall.avgTimeToActionHours,
    },
    byType: analytics.byType,
    bySeverity: analytics.bySeverity,
    timeToActionBuckets: analytics.timeToActionBuckets,
  }
}

/**
 * Thin wrapper over getDecisionAnalyticsSummary that exposes only
 * feedback-related metrics.
 */
export async function getDecisionFeedbackStats(params) {
  const analytics = await getDecisionAnalyticsSummary(params)
  return {
    overall: {
      createdCount: analytics.overall.createdCount,
      feedbackUsefulRate: analytics.overall.feedbackUsefulRate,
      feedbackWrongRate: analytics.overall.feedbackWrongRate,
    },
    byType: Object.fromEntries(
      Object.entries(analytics.byType || {}).map(([key, value]) => [
        key,
        {
          createdCount: value.createdCount,
          feedbackUseful: value.feedbackUseful,
          feedbackWrong: value.feedbackWrong,
          feedbackTotal: value.feedbackTotal,
        },
      ]),
    ),
    bySeverity: Object.fromEntries(
      Object.entries(analytics.bySeverity || {}).map(([key, value]) => [
        key,
        {
          createdCount: value.createdCount,
          feedbackUseful: value.feedbackUseful,
          feedbackWrong: value.feedbackWrong,
          feedbackTotal: value.feedbackTotal,
        },
      ]),
    ),
  }
}


