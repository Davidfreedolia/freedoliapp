/**
 * Business alerts — client-side derived from businessSnapshot, stockSnapshot, gate (C1–C3).
 * In-app only. No schema. Max 4 alerts per project (critical > warning > info).
 */

export const ALERT_SEVERITY = {
  CRITICAL: 'critical',
  WARNING: 'warning',
  INFO: 'info'
}

/**
 * @typedef {{
 *   id: string,
 *   project_id: string,
 *   project_name: string,
 *   code: string,
 *   severity: 'critical'|'warning'|'info',
 *   title: string,
 *   detail: string,
 *   tone: 'danger'|'warn'|'neutral',
 *   action: { label: string, href: string }
 * }} Alert
 */

const MAX_ALERTS_PER_PROJECT = 4

/**
 * Build alerts for one project. Tolerates null business/stock/gate. Max 4 per project.
 * @param {{ project: object, business: object|null, stock: object|null, gate: object|null, now?: Date }}
 * @returns {Alert[]}
 */
export function buildProjectAlerts({ project, business, stock, gate, now = new Date() }) {
  if (!project?.id) return []
  const pid = project.id
  const name = project.name || project.project_code || 'Project'
  const out = []

  function add(code, severity, title, detail, tone = (severity === 'critical' ? 'danger' : severity === 'warning' ? 'warn' : 'neutral')) {
    out.push({
      id: `${pid}:${code}`,
      project_id: pid,
      project_name: name,
      code,
      severity,
      title,
      detail: detail || '',
      tone,
      action: { label: 'Open', href: `/projects/${pid}` }
    })
  }

  // CRITICAL
  if (stock && (stock.units_available === 0 || stock.badgeTextPrimary === 'SENSE STOCK')) {
    add('OUT_OF_STOCK', ALERT_SEVERITY.CRITICAL, 'Out of stock', '0 units available')
  }
  if (gate?.gateId === 'LIVE' && business?.roi_percent != null && business.roi_percent < 0) {
    add('LIVE_NEGATIVE_ROI', ALERT_SEVERITY.CRITICAL, 'Live with negative ROI', `ROI ${Number(business.roi_percent).toFixed(1)}%`)
  }
  if (gate?.gateId === 'PRODUCTION' && gate?.status === 'blocked') {
    const detail = (gate.reasons && gate.reasons[0]) ? gate.reasons.slice(0, 2).join(' · ') : 'Production gate blocked'
    add('PRODUCTION_BLOCKED', ALERT_SEVERITY.CRITICAL, 'Production blocked', detail)
  }
  if (gate?.gateId === 'LISTING' && gate?.status === 'blocked') {
    const detail = (gate.reasons && gate.reasons[0]) ? gate.reasons[0] : 'Listing gate blocked'
    add('LISTING_BLOCKED', ALERT_SEVERITY.CRITICAL, 'Listing blocked', detail)
  }

  // WARNING
  if (stock?.days_cover != null && stock.days_cover < 14) {
    add('LOW_COVER', ALERT_SEVERITY.WARNING, 'Low stock cover', `${Math.round(stock.days_cover)} days cover`)
  }
  if (stock && (stock.badgeTextPrimary === 'MIG STOCK' || (stock.units_available != null && stock.units_available >= 50 && stock.units_available < 200))) {
    const u = stock.units_available != null ? Math.round(stock.units_available) : '—'
    add('LOW_STOCK', ALERT_SEVERITY.WARNING, 'Low stock', `${u} units`)
  }
  if (business?.roi_percent != null && business.roi_percent >= 0 && business.roi_percent < 25) {
    add('ROI_BELOW_TARGET', ALERT_SEVERITY.WARNING, 'ROI below target', `ROI ${Number(business.roi_percent).toFixed(1)}%`)
  }
  if (business && (business.selling_price == null || business.selling_price <= 0)) {
    add('MISSING_SELLING_PRICE', ALERT_SEVERITY.WARNING, 'Missing selling price', 'Set selling price to unlock gates')
  }

  // INFO
  if (business && (business.incomes_total == null || business.incomes_total <= 0) && (business.invested_total != null && business.invested_total > 0)) {
    add('NO_SALES_YET', ALERT_SEVERITY.INFO, 'No sales yet', 'Investment recorded, income still 0', 'neutral')
  }

  // Prioritize: critical first, then warning, then info. Take max 4.
  const bySeverity = (a, b) => {
    const order = { critical: 0, warning: 1, info: 2 }
    return (order[a.severity] ?? 3) - (order[b.severity] ?? 3)
  }
  out.sort(bySeverity)
  return out.slice(0, MAX_ALERTS_PER_PROJECT)
}

/**
 * Score for sorting (higher = show first).
 * @param {Alert} alert
 * @returns {number}
 */
export function scoreAlert(alert) {
  if (!alert) return 0
  let s = 0
  if (alert.severity === 'critical') s += 1000
  else if (alert.severity === 'warning') s += 500
  else if (alert.severity === 'info') s += 100

  if (alert.code === 'OUT_OF_STOCK') s += 200
  if (alert.code === 'LIVE_NEGATIVE_ROI') s += 150

  const detail = (alert.detail || '').toLowerCase()
  const daysMatch = alert.detail && /(\d+)\s*days/.exec(alert.detail)
  if (daysMatch) {
    const days = parseInt(daysMatch[1], 10)
    if (days < 14) s += (14 - days) * 5
  }

  if (alert.code === 'ROI_BELOW_TARGET' && alert.detail) {
    const roiMatch = /ROI\s*([-\d.]+)%/.exec(alert.detail)
    if (roiMatch) {
      const roi = parseFloat(roiMatch[1])
      if (roi < 25) s += (25 - roi) * 2
    }
  }

  return s
}
