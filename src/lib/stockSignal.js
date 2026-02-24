/**
 * Stock Signal — client-side stock coverage + thresholds per project.
 * No schema changes. Uses stock/inventory rows + optional sales (last 30d) + optional POs.
 */

/**
 * Safe number: returns number or null (for "no data").
 * @param {*} v
 * @returns {number|null}
 */
export function safeNum(v) {
  if (v == null || v === '') return null
  if (typeof v === 'number' && Number.isFinite(v)) return v
  const n = parseFloat(String(v).replace(/[^\d.-]/g, ''), 10)
  return Number.isFinite(n) ? n : null
}

/**
 * Sum quantity from stock rows. Tolerates quantity / qty / units / total_units.
 * @param {Array<object>} rows
 * @returns {number}
 */
function sumStockQuantity(rows) {
  if (!Array.isArray(rows) || !rows.length) return 0
  let total = 0
  for (const r of rows) {
    if (r == null) continue
    const q = r.quantity ?? r.qty ?? r.units ?? r.total_units ?? 0
    const n = typeof q === 'number' && Number.isFinite(q) ? q : parseFloat(q, 10)
    if (Number.isFinite(n)) total += n
  }
  return total
}

/**
 * Sum quantity from movement rows (direction IN = +, OUT = -). Tolerates direction + quantity.
 * @param {Array<{ direction?: string, quantity?: number }>} rows
 * @returns {number}
 */
function sumMovementQuantity(rows) {
  if (!Array.isArray(rows) || !rows.length) return 0
  let total = 0
  for (const r of rows) {
    if (r == null) continue
    const q = r.quantity ?? r.qty ?? r.units ?? 0
    const n = typeof q === 'number' && Number.isFinite(q) ? q : parseFloat(q, 10)
    if (!Number.isFinite(n)) continue
    const dir = (r.direction || '').toString().toUpperCase()
    if (dir === 'OUT' || dir === 'OUTBOUND') total -= n
    else total += n // IN or default
  }
  return total
}

/**
 * Sum sold quantity from sales rows (for last 30d). Tolerates qty / quantity / units.
 * @param {Array<object>} rows
 * @returns {number}
 */
function sumSalesQuantity(rows) {
  if (!Array.isArray(rows) || !rows.length) return 0
  let total = 0
  for (const r of rows) {
    if (r == null) continue
    const q = r.qty ?? r.quantity ?? r.units ?? 0
    const n = typeof q === 'number' && Number.isFinite(q) ? q : parseFloat(q, 10)
    if (Number.isFinite(n)) total += n
  }
  return total
}

/**
 * Compute project stock signal from stock/sales/PO rows.
 * @param {{
 *   project: object,
 *   stockRows: Array<object>,
 *   salesRows: Array<object>,
 *   poRows?: Array<{ items?: unknown }>
 * }} args
 * @returns {{
 *   units_available: number|null,
 *   days_cover: number|null,
 *   state: string,
 *   label: string,
 *   tone: string,
 *   badgeTextPrimary: string,
 *   badgeTextSecondary: string
 * }}
 */
export function computeProjectStockSignal({ project, stockRows, salesRows, poRows }) {
  let units_available = null

  // a) Prefer direct quantity fields from stock rows (inventory / stock table)
  if (Array.isArray(stockRows) && stockRows.length > 0) {
    const hasDirection = stockRows.some((r) => r.direction != null && r.direction !== '')
    if (hasDirection) {
      const fromMovements = sumMovementQuantity(stockRows)
      units_available = fromMovements
    } else {
      units_available = sumStockQuantity(stockRows)
    }
    if (units_available < 0) units_available = 0
  }

  // b) If still no data, units_available stays null (NO DATA)
  if (units_available === null) {
    return {
      units_available: null,
      days_cover: null,
      state: 'neutral',
      label: 'NO DATA',
      tone: 'neutral',
      badgeTextPrimary: 'NO DATA',
      badgeTextSecondary: '—'
    }
  }

  // days_cover: from sales last 30d
  const sold30d = sumSalesQuantity(salesRows || [])
  const daily_rate = sold30d > 0 ? sold30d / 30 : 0
  const days_cover = daily_rate > 0 && units_available != null ? units_available / daily_rate : null

  // Thresholds (MVP, fixed)
  let state = 'neutral'
  let label = 'NO DATA'
  let tone = 'neutral'
  if (units_available === 0) {
    state = 'danger'
    label = 'SENSE STOCK'
    tone = 'danger'
  } else if (units_available < 50) {
    state = 'danger'
    label = 'CRÍTIC'
    tone = 'danger'
  } else if (units_available < 200) {
    state = 'warn'
    label = 'MIG STOCK'
    tone = 'warn'
  } else {
    state = 'good'
    label = 'STOCK OK'
    tone = 'success'
  }

  let badgeTextSecondary = '—'
  if (units_available != null) {
    if (days_cover != null && Number.isFinite(days_cover)) {
      badgeTextSecondary = `${Math.round(units_available)} u · ${Math.round(days_cover)} dies`
    } else {
      badgeTextSecondary = `${Math.round(units_available)} u`
    }
  }

  return {
    units_available,
    days_cover: days_cover != null && Number.isFinite(days_cover) ? days_cover : null,
    state,
    label,
    tone,
    badgeTextPrimary: label,
    badgeTextSecondary
  }
}
