/**
 * D13 — Profit Engine (base).
 * Pure calculation: no DB access. Used for ASIN-level profit metrics.
 */

/**
 * @typedef {Object} AsinProfitInput
 * @property {number} [revenue]
 * @property {number} [amazonFees]
 * @property {number} [adsCost]
 * @property {number} [refunds]
 * @property {number} [cogs]
 * @property {number} [shipping]
 */

/**
 * @typedef {Object} AsinProfitResult
 * @property {number} revenue
 * @property {number} amazonFees
 * @property {number} adsCost
 * @property {number} refunds
 * @property {number} cogs
 * @property {number} shipping
 * @property {number} netProfit
 * @property {number} margin
 * @property {number} roi
 */

/**
 * Calculate ASIN-level profit from revenue and cost components.
 * All amounts are treated as non-negative inputs; refunds/costs subtract from profit.
 *
 * @param {AsinProfitInput} params
 * @returns {AsinProfitResult}
 */
export function calculateAsinProfit(params) {
  const revenue = Number(params?.revenue ?? 0) || 0
  const amazonFees = Number(params?.amazonFees ?? 0) || 0
  const adsCost = Number(params?.adsCost ?? 0) || 0
  const refunds = Number(params?.refunds ?? 0) || 0
  const cogs = Number(params?.cogs ?? 0) || 0
  const shipping = Number(params?.shipping ?? 0) || 0

  const netProfit =
    revenue -
    amazonFees -
    adsCost -
    refunds -
    cogs -
    shipping

  const margin = revenue !== 0 ? netProfit / revenue : 0
  const roi = cogs !== 0 ? netProfit / cogs : 0

  return {
    revenue,
    amazonFees,
    adsCost,
    refunds,
    cogs,
    shipping,
    netProfit,
    margin,
    roi,
  }
}
