/**
 * D19.4 — Reorder alerting. Transforma candidats del motor getReorderCandidates en alertes prioritzables.
 * No duplica lògica; reutilitza getReorderCandidates, confidence i ordenació existents.
 */
import { getReorderCandidates } from './getReorderCandidates.js'

const DAYS_URGENT = 14
const DAYS_IMMINENT = 7
const DEFAULT_LIMIT = 20

/** severity: high = més urgent/operatiu, low = menys urgent o incert */
const SEVERITY_ORDER = { high: 0, medium: 1, low: 2 }

/**
 * Deriva severity d'un candidat. Regles:
 * - high: daysUntilStockout <= 14 i reorderUnits > 0 i (confidence !== 'low' o daysUntilStockout <= 7)
 * - medium: reorder necessari, stockout no immediat o certa incertesa
 * - low: reorder suggerit amb baixa confiança o horitzó menys urgent
 * @param {{ daysUntilStockout: number, reorderUnits: number, confidence: string }} c
 * @returns {'high'|'medium'|'low'}
 */
function getSeverity(c) {
  const days = c.daysUntilStockout ?? 0
  const units = c.reorderUnits ?? 0
  const conf = c.confidence ?? 'low'

  if (units <= 0) return 'low'
  if (days <= DAYS_IMMINENT) return 'high'
  if (days <= DAYS_URGENT && conf !== 'low') return 'high'
  if (days <= DAYS_URGENT && conf === 'low') return 'medium'
  if (conf === 'high' || conf === 'medium') return 'medium'
  return 'low'
}

/**
 * Missatge breu i accionable per l'alerta.
 * @param {{ productName: string|null, asin: string, reorderUnits: number, daysUntilStockout: number }} c
 * @returns {string}
 */
function getMessage(c) {
  const name = c.productName?.trim() || c.asin || 'Product'
  const u = c.reorderUnits ?? 0
  const d = c.daysUntilStockout
  const daysStr = d != null && Number.isFinite(d) ? ` in ~${Math.round(d)} days` : ''
  return `Reorder ${name}: ${u} units suggested${daysStr}`
}

/**
 * Reorder alerts derivades dels candidats reals. Cada alerta té base al motor D19.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} orgId
 * @param {{ limit?: number }} [options]
 * @returns {Promise<Array<{
 *   type: string,
 *   severity: 'high'|'medium'|'low',
 *   asin: string,
 *   productName: string|null,
 *   message: string,
 *   reorderUnits: number,
 *   daysUntilStockout: number,
 *   confidence: string,
 *   issues: string[],
 *   source: string
 * }>>}
 */
export async function getReorderAlerts(supabase, orgId, options = {}) {
  if (!orgId || typeof orgId !== 'string') return []

  const limit = Math.max(1, Math.min(100, Number(options?.limit) ?? DEFAULT_LIMIT))

  let candidates = []
  try {
    candidates = await getReorderCandidates(supabase, orgId, { limit: limit * 2 })
  } catch {
    return []
  }

  const alerts = candidates
    .filter((c) => (c.reorderUnits ?? 0) > 0)
    .map((c) => ({
      type: 'reorder',
      severity: getSeverity(c),
      asin: c.asin ?? '',
      project_id: c.projectId ?? null,
      productName: c.productName ?? null,
      message: getMessage(c),
      reorderUnits: c.reorderUnits ?? 0,
      daysUntilStockout: c.daysUntilStockout ?? 0,
      confidence: c.confidence ?? 'low',
      issues: Array.isArray(c.issues) ? c.issues : [],
      source: 'reorder_intelligence',
    }))

  alerts.sort((a, b) => {
    const sa = SEVERITY_ORDER[a.severity] ?? 2
    const sb = SEVERITY_ORDER[b.severity] ?? 2
    if (sa !== sb) return sa - sb
    const dA = a.daysUntilStockout ?? 0
    const dB = b.daysUntilStockout ?? 0
    if (dA !== dB) return dA - dB
    return (b.reorderUnits ?? 0) - (a.reorderUnits ?? 0)
  })

  return alerts.slice(0, limit)
}
