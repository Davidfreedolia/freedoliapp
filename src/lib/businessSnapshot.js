/**
 * Business Snapshot — client-side ROI / unit cost / breakeven for projects.
 * No schema changes. Uses project + PO/expense/income rows.
 */

/**
 * Parse money value to number (tolerates string, null, undefined).
 * @param {*} v
 * @returns {number}
 */
export function parseMoney(v) {
  if (v == null || v === '') return 0
  if (typeof v === 'number' && Number.isFinite(v)) return v
  const n = parseFloat(String(v).replace(/[^\d.-]/g, ''), 10)
  return Number.isFinite(n) ? n : 0
}

/**
 * Sum quantity from PO items array. Tolerates qty / unitats / quantity.
 * @param {Array<{ qty?: number, unitats?: number, quantity?: number }>} items
 * @returns {number}
 */
export function sumQtyFromPoItems(items) {
  if (!Array.isArray(items) || !items.length) return 0
  let total = 0
  for (const it of items) {
    if (it == null) continue
    const q = it.qty ?? it.unitats ?? it.quantity ?? 0
    total += Number.isFinite(q) ? q : parseMoney(q)
  }
  return total
}

/**
 * Compute project business snapshot from project + PO/expense/income rows.
 * @param {{
 *   project: { selling_price?: number, amazon_price?: number, price?: number },
 *   poRows: Array<{ project_id: string, total_amount?: number, items?: unknown }>,
 *   expenseRows: Array<{ project_id: string, amount?: number }>,
 *   incomeRows: Array<{ project_id: string, amount?: number }>
 * }} args
 * @returns {{
 *   invested_total: number,
 *   po_total: number,
 *   expenses_total: number,
 *   incomes_total: number,
 *   units_bought: number,
 *   unit_cost: number | null,
 *   selling_price: number | null,
 *   breakeven_units: number | null,
 *   roi_percent: number | null,
 *   badge: { label: string, state: string, tone: string }
 * }}
 */
export function computeProjectBusinessSnapshot({ project, poRows, expenseRows, incomeRows }) {
  const po_total = (poRows || []).reduce((sum, row) => sum + parseMoney(row?.total_amount), 0)
  let units_bought = 0
  for (const row of poRows || []) {
    let items = row?.items
    if (typeof items === 'string') {
      try {
        items = JSON.parse(items)
      } catch {
        items = []
      }
    }
    units_bought += sumQtyFromPoItems(Array.isArray(items) ? items : [])
  }
  const expenses_total = (expenseRows || []).reduce((sum, row) => sum + parseMoney(row?.amount), 0)
  const incomes_total = (incomeRows || []).reduce((sum, row) => sum + parseMoney(row?.amount), 0)
  const invested_total = po_total + expenses_total
  const unit_cost = units_bought > 0 ? invested_total / units_bought : null
  const selling_price =
    project?.selling_price != null && Number.isFinite(project.selling_price)
      ? parseMoney(project.selling_price)
      : project?.amazon_price != null && Number.isFinite(project.amazon_price)
        ? parseMoney(project.amazon_price)
        : project?.price != null && Number.isFinite(project.price)
          ? parseMoney(project.price)
          : null
  const breakeven_units =
    selling_price != null && selling_price > 0
      ? invested_total / selling_price
      : null
  const roi_percent =
    invested_total > 0
      ? ((incomes_total - invested_total) / invested_total) * 100
      : null

  let state = 'unvalidated'
  let label = 'NO VALIDAT'
  let tone = 'neutral'
  if (incomes_total > 0) {
    if (roi_percent != null) {
      if (roi_percent < 0) {
        state = 'danger'
        label = 'PERILL'
        tone = 'danger'
      } else if (roi_percent < 25) {
        state = 'warn'
        label = 'JUST'
        tone = 'warn'
      } else {
        state = 'good'
        label = 'PROFIT'
        tone = 'success'
      }
    }
  }

  return {
    invested_total,
    po_total,
    expenses_total,
    incomes_total,
    units_bought,
    unit_cost,
    selling_price,
    breakeven_units,
    roi_percent,
    badge: { label, state, tone }
  }
}
