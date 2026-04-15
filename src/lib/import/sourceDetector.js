/**
 * Source + sub-type auto-detector.
 *
 * Given the columns (or parsed JSON shape) of an uploaded file, guess:
 *   - which IMPORT_SOURCES entry is most likely the origin,
 *   - for Sellerboard, which sub-type of export (dashboard_pl / products / orders / ppc).
 *
 * This is a best-effort pre-fill for the wizard; the user can always override.
 */
import { norm } from './columnDictionaries'

/** Lowercase set of columns for O(1) membership checks. */
function asSet(columns) {
  return new Set((columns || []).map((c) => norm(c)))
}

/** Does the column set contain at least one of the given aliases? */
function has(set, aliases) {
  for (const a of aliases) {
    if (set.has(norm(a))) return true
  }
  // fallback: fuzzy contains
  for (const col of set) {
    for (const a of aliases) {
      const na = norm(a)
      if (col.includes(na) && na.length >= 4) return true
    }
  }
  return false
}

/** Count how many of the given aliases appear in the set. */
function count(set, aliases) {
  let n = 0
  for (const a of aliases) if (has(set, [a])) n++
  return n
}

/**
 * Detect the source. Returns { sourceId, confidence, subType }.
 *
 * `confidence` is 0–1. `subType` is only set for sources with multiple export shapes
 * (today: Sellerboard).
 */
export function detectSource({ columns = [], kind = 'csv', rawJson = null } = {}) {
  // Trello ships a JSON object with `lists` and `cards` arrays.
  if (kind === 'json' && rawJson && typeof rawJson === 'object') {
    const hasLists = Array.isArray(rawJson.lists)
    const hasCards = Array.isArray(rawJson.cards)
    if (hasLists && hasCards) return { sourceId: 'trello', confidence: 0.95, subType: null }
  }

  const set = asSet(columns)

  // Sellerboard sub-type detection first (dashboard_pl is our priority tester flow).
  const looksSellerboard =
    (has(set, ['net profit', 'beneficio neto', 'gewinn']) && has(set, ['cogs', 'coste', 'wareneinsatz'])) ||
    (has(set, ['orders']) && has(set, ['ppc', 'advertising', 'werbekosten'])) ||
    has(set, ['referral fees', 'provision', 'comisiones'])

  if (looksSellerboard) {
    let subType = 'unknown'
    if (has(set, ['net profit', 'beneficio neto', 'gewinn']) &&
        has(set, ['cogs', 'coste', 'wareneinsatz']) &&
        has(set, ['fba fees', 'fba-gebühr', 'fba'])) {
      subType = 'dashboard_pl'
    } else if (has(set, ['units in stock', 'inventory', 'stock', 'bestand']) &&
               has(set, ['cogs', 'coste']) &&
               !has(set, ['net profit'])) {
      subType = 'products'
    } else if (has(set, ['order id', 'order-id', 'order number'])) {
      subType = 'orders'
    } else if (has(set, ['campaign']) && has(set, ['impressions']) && has(set, ['acos'])) {
      subType = 'ppc'
    }
    return { sourceId: 'sellerboard', confidence: 0.85, subType }
  }

  // Helium 10 — has its own "profit" terminology but lacks Sellerboard-specific fees.
  if (has(set, ['ppc cost']) && has(set, ['gross sales']) && has(set, ['net profit'])) {
    return { sourceId: 'helium10', confidence: 0.8, subType: null }
  }

  // Jungle Scout — has estimates that no other tool uses verbatim.
  if (has(set, ['est. monthly sales', 'estimated sales']) ||
      has(set, ['est. monthly revenue'])) {
    return { sourceId: 'junglescout', confidence: 0.9, subType: null }
  }

  // Keepa — BSR + buy box price shape.
  if (has(set, ['sales rank', 'best sellers rank']) && has(set, ['buy box price', 'amazon price'])) {
    return { sourceId: 'keepa', confidence: 0.85, subType: null }
  }

  // SoStocked — fba stock + daily velocity is distinctive.
  if (has(set, ['fba stock', 'amazon stock']) && has(set, ['daily velocity', 'velocity'])) {
    return { sourceId: 'sostocked', confidence: 0.9, subType: null }
  }

  // InventoryLab — net proceeds + ROI together.
  if (has(set, ['net proceeds']) && has(set, ['roi'])) {
    return { sourceId: 'inventorylab', confidence: 0.85, subType: null }
  }

  // Holded — Spanish invoicing columns.
  if (has(set, ['nif', 'cif']) || has(set, ['base imponible'])) {
    return { sourceId: 'holded', confidence: 0.85, subType: null }
  }

  // QuickBooks — ref number + payee.
  if (has(set, ['ref number']) && has(set, ['payee', 'customer/vendor'])) {
    return { sourceId: 'quickbooks', confidence: 0.8, subType: null }
  }

  // Xero — unit amount + account code.
  if (has(set, ['unit amount']) && has(set, ['account code'])) {
    return { sourceId: 'xero', confidence: 0.8, subType: null }
  }

  // Asana — "Section/Column" header is specific.
  if (has(set, ['section/column']) || (has(set, ['task id']) && has(set, ['assignee']))) {
    return { sourceId: 'asana', confidence: 0.85, subType: null }
  }

  // Monday — "Board Group" is distinctive.
  if (has(set, ['board group'])) {
    return { sourceId: 'monday', confidence: 0.85, subType: null }
  }

  // Amazon Seller Central — specific merchant/ASIN columns.
  if (has(set, ['afn-fulfillable-quantity']) ||
      has(set, ['ordered product sales'])) {
    return { sourceId: 'amazon', confidence: 0.85, subType: null }
  }

  // Notion/Airtable — flexible, hard to distinguish cleanly. Only fall into these
  // if the file has a generic "Name"/"Title" column plus tags or Status.
  if (has(set, ['name', 'title', 'nombre', 'título']) &&
      (has(set, ['tags', 'labels']) || has(set, ['status', 'estado']))) {
    const hasNotionOnly = count(set, ['created time', 'last edited time'])
    if (hasNotionOnly > 0) return { sourceId: 'notion', confidence: 0.6, subType: null }
    return { sourceId: 'airtable', confidence: 0.55, subType: null }
  }

  return { sourceId: 'generic', confidence: 0.3, subType: null }
}

/**
 * Label for a detected Sellerboard sub-type.
 */
export const SELLERBOARD_SUBTYPES = [
  { id: 'dashboard_pl', labelKey: 'dataImport.sellerboard.profitSales', defaultLabel: 'Profit i Vendes' },
  { id: 'products', labelKey: 'dataImport.sellerboard.products', defaultLabel: 'Llista de Productes' },
  { id: 'orders', labelKey: 'dataImport.sellerboard.orders', defaultLabel: 'Comandes' },
  { id: 'ppc', labelKey: 'dataImport.sellerboard.ppc', defaultLabel: 'Publicitat PPC' },
]
