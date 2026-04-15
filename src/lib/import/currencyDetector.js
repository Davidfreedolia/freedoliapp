/**
 * Currency & number-format detector for imported sheets.
 *
 * European formats use comma as decimal separator (`1.234,56`), English use dot
 * (`1,234.56`). We examine a sample of values and decide; the user can override.
 *
 * Currency is derived from symbols present in the cells (€, $, £) or from the
 * declared marketplace (ES/IT/DE/FR → EUR, US → USD, UK → GBP).
 */

const MARKETPLACE_CURRENCY = {
  ES: 'EUR',
  IT: 'EUR',
  DE: 'EUR',
  FR: 'EUR',
  NL: 'EUR',
  BE: 'EUR',
  IE: 'EUR',
  PT: 'EUR',
  UK: 'GBP',
  GB: 'GBP',
  US: 'USD',
  CA: 'CAD',
  MX: 'MXN',
  AU: 'AUD',
  JP: 'JPY',
  IN: 'INR',
}

/**
 * Inspect sample values to decide which number format (`eu` / `us`).
 * Returns 'eu' when comma is more likely the decimal separator, else 'us'.
 */
export function detectNumberFormat(samples = []) {
  let euHits = 0
  let usHits = 0
  for (const v of samples) {
    const s = String(v ?? '').trim()
    if (!s) continue
    // EU pattern: digits . digits , digits  (e.g. 1.234,56)
    if (/\d{1,3}(\.\d{3})+,\d+/.test(s)) euHits++
    // US pattern: digits , digits . digits (e.g. 1,234.56)
    else if (/\d{1,3}(,\d{3})+\.\d+/.test(s)) usHits++
    // Simple cases: "12,34" → EU; "12.34" → US
    else if (/^-?\d+,\d+$/.test(s)) euHits++
    else if (/^-?\d+\.\d+$/.test(s)) usHits++
  }
  if (euHits === 0 && usHits === 0) return 'us'
  return euHits >= usHits ? 'eu' : 'us'
}

/**
 * Detect currency from a mix of sample values + a marketplace code.
 * Priority: explicit symbol > marketplace hint > 'EUR'.
 */
export function detectCurrency(samples = [], marketplace = null) {
  for (const v of samples) {
    const s = String(v ?? '')
    if (s.includes('€')) return 'EUR'
    if (s.includes('£')) return 'GBP'
    if (s.includes('$')) return 'USD'
    if (s.includes('¥')) return 'JPY'
  }
  if (marketplace) {
    const code = String(marketplace).toUpperCase().trim()
    if (MARKETPLACE_CURRENCY[code]) return MARKETPLACE_CURRENCY[code]
  }
  return 'EUR'
}

/**
 * Parse any localized number into a JS float.
 *
 * - Strips currency symbols, spaces, non-breaking spaces.
 * - Respects the `format` hint ('eu' | 'us'); if omitted, auto-detects per call.
 */
export function parseNumber(value, format = null) {
  if (value == null || value === '') return null
  if (typeof value === 'number' && Number.isFinite(value)) return value
  let s = String(value).trim()
  if (!s) return null

  // Strip currency symbols and whitespace (normal + NBSP).
  s = s.replace(/[€£$¥]/g, '').replace(/[\s\u00A0]/g, '')
  // Strip parentheses for negative amounts.  e.g. "(1.234,56)" → "-1.234,56"
  let neg = false
  const parenMatch = s.match(/^\((.+)\)$/)
  if (parenMatch) { neg = true; s = parenMatch[1] }
  if (s.startsWith('-')) { neg = true; s = s.slice(1) }

  let fmt = format
  if (!fmt) {
    // Use position of last comma vs last dot to infer format.
    const lastComma = s.lastIndexOf(',')
    const lastDot = s.lastIndexOf('.')
    if (lastComma > lastDot) fmt = 'eu'
    else fmt = 'us'
  }

  if (fmt === 'eu') {
    s = s.replace(/\./g, '').replace(',', '.')
  } else {
    s = s.replace(/,/g, '')
  }

  const n = Number(s)
  if (!Number.isFinite(n)) return null
  return neg ? -n : n
}

/**
 * Convenience: given rows and a small set of numeric columns, infer a format
 * from the first ~30 samples across those columns.
 */
export function inferFormatFromRows(rows, numericColumns = []) {
  const samples = []
  for (const row of rows.slice(0, 30)) {
    for (const col of numericColumns) {
      if (row[col] != null && row[col] !== '') samples.push(row[col])
      if (samples.length >= 60) break
    }
    if (samples.length >= 60) break
  }
  return detectNumberFormat(samples)
}
