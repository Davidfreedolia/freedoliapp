/**
 * D57.2 — Simple deterministic risk model for automation proposals.
 * Centralized; no sophisticated engine. Uses decision priority/context only.
 */

/**
 * Compute risk_band and numeric risk_score from decision and context.
 * Bands: low, medium, high. (critical reserved for future.)
 *
 * @param {object} params
 * @param {number|null} [params.priorityScore]
 * @param {Record<string, unknown>} [params.context]
 * @param {string} [params.actionType]
 * @returns {{ risk_band: 'low'|'medium'|'high', risk_score: number }}
 */
export function computeProposalRisk(params) {
  const { priorityScore = null, context = {}, actionType = '' } = params || {}
  let score = 0

  // Priority from decision (e.g. 10 low, 50 medium, 100 high)
  if (Number.isFinite(priorityScore)) {
    if (priorityScore >= 80) score += 40
    else if (priorityScore >= 50) score += 25
    else score += 10
  }

  // Magnitude from context (reorder_units, etc.)
  const reorderUnits = Number(context.reorder_units) || 0
  if (reorderUnits > 500) score += 30
  else if (reorderUnits > 100) score += 15

  const confidence = (context.confidence || '').toString().toLowerCase()
  if (confidence === 'low') score += 20
  else if (confidence === 'medium') score += 5

  // Cap and map to band
  score = Math.min(100, Math.max(0, score))
  let risk_band = 'low'
  if (score >= 60) risk_band = 'high'
  else if (score >= 30) risk_band = 'medium'

  return { risk_band, risk_score: score }
}
