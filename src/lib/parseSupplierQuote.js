const TEMPLATE_FIELDS = [
  'supplier_name',
  'incoterm',
  'currency',
  'moq',
  'unit_price',
  'tooling_fee',
  'packaging_included',
  'lead_time_days',
  'sample_cost',
  'payment_terms',
  'shipping_estimate',
  'valid_until',
  'notes',
]

function parseBool(v) {
  if (v == null) return null
  const s = String(v).trim().toLowerCase()
  if (s === 'true') return true
  if (s === 'false') return false
  if (s === 'null') return null
  return null
}

function parseIntOrNull(v) {
  if (v == null) return null
  const s = String(v).trim()
  if (!s || s.toLowerCase() === 'null') return null
  const n = Number.parseInt(s, 10)
  return Number.isFinite(n) ? n : null
}

function parseNumOrNull(v) {
  if (v == null) return null
  const s = String(v).trim()
  if (!s || s.toLowerCase() === 'null') return null
  const norm = s.replace(',', '.').replace(/[^\d.-]/g, '')
  const n = Number.parseFloat(norm)
  return Number.isFinite(n) ? n : null
}

function parseDateOrNull(v) {
  if (v == null) return null
  const s = String(v).trim()
  if (!s || s.toLowerCase() === 'null') return null
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null
  return s
}

export function parseSupplierQuote(rawText) {
  const text = String(rawText || '').trim()
  if (!text) return { ok: false, error: 'EMPTY_INPUT', data: null, raw_md: null }

  if (!/^#\s*SUPPLIER_QUOTE\b/m.test(text)) {
    return { ok: false, error: 'MISSING_HEADER', data: null, raw_md: null }
  }

  const lines = text.split('\n')
  const map = {}
  for (const line of lines) {
    const m = line.match(/^([a-z_]+):\s*(.*)$/)
    if (!m) continue
    const key = m[1].trim()
    const value = m[2] != null ? m[2].trim() : ''
    if (TEMPLATE_FIELDS.includes(key)) map[key] = value
  }

  for (const k of ['supplier_name', 'currency']) {
    if (!(k in map)) return { ok: false, error: `MISSING_FIELD_${k.toUpperCase()}`, data: null, raw_md: null }
  }

  const supplier_name = (map.supplier_name || '').trim()
  const currency = (map.currency || '').trim()

  if (!supplier_name || supplier_name.toLowerCase() === 'null') {
    return { ok: false, error: 'INVALID_SUPPLIER_NAME', data: null, raw_md: null }
  }
  if (!currency || currency.toLowerCase() === 'null') {
    return { ok: false, error: 'INVALID_CURRENCY', data: null, raw_md: null }
  }

  const data = {
    supplier_name,
    incoterm: map.incoterm?.toLowerCase() === 'null' ? null : (map.incoterm || null),
    currency,
    moq: parseIntOrNull(map.moq),
    unit_price: parseNumOrNull(map.unit_price),
    tooling_fee: parseNumOrNull(map.tooling_fee),
    packaging_included: parseBool(map.packaging_included),
    lead_time_days: parseIntOrNull(map.lead_time_days),
    sample_cost: parseNumOrNull(map.sample_cost),
    payment_terms: map.payment_terms?.toLowerCase() === 'null' ? null : (map.payment_terms || null),
    shipping_estimate: map.shipping_estimate?.toLowerCase() === 'null' ? null : (map.shipping_estimate || null),
    valid_until: parseDateOrNull(map.valid_until),
    notes: map.notes?.toLowerCase() === 'null' ? null : (map.notes || null),
  }

  return { ok: true, error: null, data, raw_md: text }
}
