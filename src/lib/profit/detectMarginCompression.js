/**
 * D14 Slice 1 — Detectar compressió de marge per ASIN (o workspace).
 * Tot passa per getProfitTimeseries(); no es dupliquen fórmules.
 */
import { getProfitTimeseries } from './getProfitTimeseries.js'

const DEFAULT_LOOKBACK_DAYS = 30
const DEFAULT_RECENT_DAYS = 7
const MARGIN_DROP_THRESHOLD = 0.05

/**
 * Detectar si hi ha compressió de marge: marge mitjà recent significativament per sota del marge mitjà del lookback.
 * Utilitza getProfitTimeseries(); no duplica càlculs.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} orgId
 * @param {{ asin?: string, lookbackDays?: number, recentDays?: number, marketplace?: string }} [options]
 * @returns {Promise<{ asin: string | null, averageMarginLookback: number, averageMarginRecent: number, marginDrop: number } | null>}
 */
export async function detectMarginCompression(supabase, orgId, options = {}) {
  const lookbackDays = Math.max(1, Number(options?.lookbackDays) || DEFAULT_LOOKBACK_DAYS)
  const recentDays = Math.max(1, Math.min(Number(options?.recentDays) || DEFAULT_RECENT_DAYS, lookbackDays))

  const to = new Date()
  const from = new Date()
  from.setDate(from.getDate() - lookbackDays)
  const dateFrom = from.toISOString().slice(0, 10)
  const dateTo = to.toISOString().slice(0, 10)

  const opts = { dateFrom, dateTo }
  if (options?.asin) opts.asin = options.asin
  if (options?.marketplace) opts.marketplace = options.marketplace
  const series = await getProfitTimeseries(supabase, orgId, opts)
  if (!series.length) return null

  const sumLookback = series.reduce((s, p) => s + (Number(p.margin) || 0), 0)
  const averageMarginLookback = sumLookback / series.length

  const recent = series.slice(-recentDays)
  const sumRecent = recent.reduce((s, p) => s + (Number(p.margin) || 0), 0)
  const averageMarginRecent = sumRecent / recent.length

  const marginDrop = averageMarginLookback - averageMarginRecent
  if (marginDrop < MARGIN_DROP_THRESHOLD) return null

  return {
    asin: options?.asin ?? null,
    averageMarginLookback,
    averageMarginRecent,
    marginDrop,
  }
}
