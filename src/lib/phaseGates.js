/**
 * Commercial phase gates — client-side derived from businessSnapshot (C1) + stockSnapshot (C2).
 * No schema. Phases 1–7: 5=PRODUCTION, 6=LISTING, 7=LIVE.
 */

export const GATE_STATES = {
  OK: 'ok',
  WARNING: 'warning',
  BLOCKED: 'blocked'
}

/**
 * Normalize phase to number 1–7.
 * @param {number|string} phaseId
 * @returns {number}
 */
function toPhaseNumber(phaseId) {
  if (phaseId == null) return 1
  const n = typeof phaseId === 'number' ? phaseId : parseInt(String(phaseId), 10)
  return Number.isFinite(n) ? Math.max(1, Math.min(7, n)) : 1
}

/**
 * Resolve gateId from phase (repo uses 1–7: 5=Production, 6=Listing, 7=Live).
 */
function getGateId(phaseNum) {
  if (phaseNum >= 7) return 'LIVE'
  if (phaseNum >= 6) return 'LISTING'
  if (phaseNum >= 5) return 'PRODUCTION'
  return 'NONE'
}

/**
 * GATE PRODUCTION: businessSnapshot
 */
function evalProductionGate(businessSnapshot) {
  const reasons = []
  if (businessSnapshot == null) {
    reasons.push('No financial data')
    return { status: 'blocked', tone: 'danger', reasons }
  }
  const { invested_total, po_total, unit_cost, selling_price, roi_percent } = businessSnapshot
  if (invested_total <= 0) reasons.push('No investment recorded')
  if (po_total <= 0) reasons.push('No PO created')
  if (unit_cost == null) reasons.push('Unit cost unavailable')
  if (selling_price == null || selling_price <= 0) reasons.push('Selling price missing')
  if (roi_percent != null && roi_percent < 25) reasons.push('ROI below 25%')

  if (reasons.length > 0) return { status: 'blocked', tone: 'danger', reasons }
  if (roi_percent == null) return { status: 'warning', tone: 'warn', reasons: ['No sales yet (ROI not validated)'] }
  return { status: 'ok', tone: 'success', reasons: [] }
}

/**
 * GATE LISTING: stockSnapshot
 */
function evalListingGate(stockSnapshot) {
  const reasons = []
  if (stockSnapshot == null) {
    return { status: 'warning', tone: 'warn', reasons: ['No stock data'] }
  }
  const { units_available, days_cover } = stockSnapshot
  if (units_available === 0) {
    reasons.push('Out of stock')
    return { status: 'blocked', tone: 'danger', reasons }
  }
  if (units_available != null && units_available < 50) {
    reasons.push('Stock below 50 units')
    return { status: 'blocked', tone: 'danger', reasons }
  }
  if (units_available != null && units_available >= 50 && units_available < 200) {
    reasons.push('Low stock')
  }
  if (days_cover != null && days_cover < 14) {
    reasons.push('Less than 14 days cover')
  }
  if (reasons.length > 0) return { status: 'warning', tone: 'warn', reasons }
  return { status: 'ok', tone: 'success', reasons: [] }
}

/**
 * GATE LIVE: businessSnapshot + stockSnapshot
 */
function evalLiveGate(businessSnapshot, stockSnapshot) {
  const reasons = []
  if (stockSnapshot != null && stockSnapshot.units_available === 0) {
    reasons.push('Out of stock')
    return { status: 'blocked', tone: 'danger', reasons }
  }
  if (businessSnapshot != null && businessSnapshot.roi_percent != null && businessSnapshot.roi_percent < 0) {
    reasons.push('Negative ROI')
    return { status: 'blocked', tone: 'danger', reasons }
  }
  if (stockSnapshot != null && (stockSnapshot.tone === 'warn' || (stockSnapshot.days_cover != null && stockSnapshot.days_cover < 14))) {
    reasons.push('Stock risk')
  }
  if (businessSnapshot != null && (businessSnapshot.incomes_total == null || businessSnapshot.incomes_total <= 0)) {
    reasons.push('No income yet')
  }
  if (reasons.length > 0) return { status: 'warning', tone: 'warn', reasons }
  return { status: 'ok', tone: 'success', reasons: [] }
}

/**
 * Compute commercial gate for current phase.
 * @param {{
 *   phaseId: number|string,
 *   businessSnapshot: object|null,
 *   stockSnapshot: object|null,
 *   now?: Date
 * }} args
 * @returns {{
 *   status: 'ok'|'warning'|'blocked',
 *   label: string,
 *   tone: string,
 *   reasons: string[],
 *   gateId: string
 * }}
 */
export function computeCommercialGate({ phaseId, businessSnapshot, stockSnapshot, now = new Date() }) {
  const phaseNum = toPhaseNumber(phaseId)
  const gateId = getGateId(phaseNum)

  if (gateId === 'NONE') {
    return {
      status: 'ok',
      label: '—',
      tone: 'neutral',
      reasons: [],
      gateId: 'NONE'
    }
  }

  let result
  if (gateId === 'PRODUCTION') {
    result = evalProductionGate(businessSnapshot)
  } else if (gateId === 'LISTING') {
    result = evalListingGate(stockSnapshot)
  } else {
    result = evalLiveGate(businessSnapshot, stockSnapshot)
  }

  const label = result.status === 'ok' ? 'READY' : result.status === 'warning' ? 'RISK' : 'BLOCKED'
  return {
    status: result.status,
    label,
    tone: result.tone,
    reasons: result.reasons || [],
    gateId
  }
}
