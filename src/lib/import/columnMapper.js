/**
 * Column mapper — fuzzy-match file columns to canonical FreedoliApp fields.
 */
import { IMPORT_SOURCES, getSourceDict, norm } from './columnDictionaries'

// Generic (source-agnostic) dictionary: union of all known sources' keys.
// Used when user selects "Excel / CSV genèric".
const GENERIC_DICT = IMPORT_SOURCES
  .filter((s) => s.dict)
  .reduce((acc, s) => {
    for (const [target, aliases] of Object.entries(s.dict)) {
      if (!acc[target]) acc[target] = new Set()
      aliases.forEach((a) => acc[target].add(a))
    }
    return acc
  }, {})

// Convert Set → Array for iteration
const GENERIC_FLAT = Object.fromEntries(
  Object.entries(GENERIC_DICT).map(([k, v]) => [k, Array.from(v)]),
)

/** Levenshtein-ish cheap score: equal → 1.0, contains → 0.7, else 0. */
function score(a, b) {
  const x = norm(a), y = norm(b)
  if (!x || !y) return 0
  if (x === y) return 1
  if (x.replace(/[\s_-]+/g, '') === y.replace(/[\s_-]+/g, '')) return 0.95
  if (x.includes(y) || y.includes(x)) return 0.7
  return 0
}

/**
 * Given the raw columns present in a file and a source id,
 * propose a mapping: { [targetField]: { column, score } | null }.
 */
export function proposeMapping(fileColumns, sourceId = 'generic') {
  const dict = sourceId === 'generic' ? GENERIC_FLAT : (getSourceDict(sourceId) || GENERIC_FLAT)
  const proposal = {}
  const usedColumns = new Set()

  // Pass 1: exact matches take priority.
  for (const [target, aliases] of Object.entries(dict)) {
    let best = { column: null, score: 0 }
    for (const col of fileColumns) {
      if (usedColumns.has(col)) continue
      for (const alias of aliases) {
        const s = score(col, alias)
        if (s > best.score) best = { column: col, score: s }
      }
    }
    if (best.column && best.score >= 0.7) {
      proposal[target] = best
      usedColumns.add(best.column)
    } else {
      proposal[target] = null
    }
  }
  return proposal
}

/** List of all canonical target fields (ordered & deduped). */
export function listTargets(sourceId = 'generic') {
  const dict = sourceId === 'generic' ? GENERIC_FLAT : (getSourceDict(sourceId) || GENERIC_FLAT)
  return Object.keys(dict)
}

/**
 * Apply a mapping to the parsed rows.
 * Returns rows keyed by canonical target fields (drops unmapped columns).
 */
export function applyMapping(rows, mapping) {
  return rows.map((row) => {
    const out = {}
    for (const [target, m] of Object.entries(mapping)) {
      if (!m || !m.column) continue
      const raw = row[m.column]
      out[target] = raw === '' ? null : raw
    }
    return out
  })
}
