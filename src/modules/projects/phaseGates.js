import { calculateQuickProfitability } from '../../lib/profitability'
import {
  getDocuments,
  getSupplierPriceEstimates,
  getProjectProfitability,
  getSupplierQuotes,
  getTasks,
  getPurchaseOrders,
  getProductIdentifiers
} from '../../lib/supabase'

const normalizeText = (value) => (value || '').toString().trim().toLowerCase()
const COMPETITOR_STORAGE_PREFIX = 'competitive_asin_meta_'

const hasDocCategory = (documents, category) => {
  const target = normalizeText(category)
  return (documents || []).some(doc => normalizeText(doc.category) === target)
}

const hasSampleApprovalTask = (tasks) => {
  const approvalTokens = ['approved', 'ok', 'aprovat', 'validat']
  return (tasks || []).some(task => {
    const title = normalizeText(task.title)
    if (!title.includes('sample')) return false
    return approvalTokens.some(token => title.includes(token))
  })
}

const isGtinValid = (identifiers) => {
  if (!identifiers || !identifiers.gtin_type) return false
  const type = normalizeText(identifiers.gtin_type).toUpperCase()
  if (type === 'GTIN_EXEMPT') {
    return Boolean(normalizeText(identifiers.exemption_reason))
  }
  if (type === 'EAN' || type === 'UPC') {
    return Boolean(normalizeText(identifiers.gtin_code))
  }
  return false
}

const getCompetitorSnapshot = (projectId) => {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(`${COMPETITOR_STORAGE_PREFIX}${projectId}`)
    return raw ? JSON.parse(raw) : null
  } catch (err) {
    return null
  }
}

const getViabilitySnapshot = (projectId) => {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(`viability_${projectId}`)
    return raw ? JSON.parse(raw) : null
  } catch (err) {
    return null
  }
}

const hasSnapshotInput = (snapshot) => {
  if (!snapshot) return false
  return [
    snapshot.competitor_price,
    snapshot.category_guess,
    snapshot.size_tier,
    snapshot.weight_g,
    snapshot.brand
  ].some(value => normalizeText(value))
}

const isSnapshotComplete = (snapshot) => {
  if (!snapshot) return false
  const price = parseFloat(snapshot.competitor_price || 0)
  const weight = parseFloat(snapshot.weight_g || 0)
  const hasCategory = Boolean(normalizeText(snapshot.category_guess))
  const hasSize = Boolean(normalizeText(snapshot.size_tier))
  const hasBrand = Boolean(normalizeText(snapshot.brand))
  return price > 0 && weight > 0 && hasCategory && hasSize && hasBrand
}

export const validatePhaseTransition = async ({
  projectId,
  fromPhase,
  toPhase,
  project,
  supabaseClient
}) => {
  const missing = []

  if (typeof toPhase !== 'number' || typeof fromPhase !== 'number') {
    return { ok: false, missing: ['Fase invàlida'] }
  }

  if (toPhase <= fromPhase) {
    return { ok: true, missing: [] }
  }

  if (toPhase > fromPhase + 1) {
    return { ok: false, missing: ['No es pot saltar fases'] }
  }

  if (project?.decision === 'DISCARDED') {
    return { ok: false, missing: ['Projecte descartat'] }
  }

  try {
    switch (`${fromPhase}->${toPhase}`) {
      case '1->2': {
        let identifiers = null
        try {
          identifiers = await getProductIdentifiers(projectId, supabaseClient)
        } catch (err) {
          missing.push('ASIN competidor definit')
        }

        if (!identifiers?.asin) {
          missing.push('ASIN competidor definit')
        }

        if (!['GO', 'RISKY'].includes((project?.decision || '').toUpperCase())) {
          missing.push('Decisió GO o RISKY')
        }

        let documents = null
        try {
          documents = await getDocuments(projectId, supabaseClient)
        } catch (err) {}

        let estimates = null
        try {
          estimates = await getSupplierPriceEstimates(projectId, supabaseClient)
        } catch (err) {}

        const hasAnalysisDoc = documents ? hasDocCategory(documents, 'analysis') : false
        const hasPriceEstimate = estimates ? (estimates.length > 0) : false
        const snapshot = getCompetitorSnapshot(projectId)
        const hasSnapshot = hasSnapshotInput(snapshot)

        if (!hasAnalysisDoc && !hasPriceEstimate && !hasSnapshot) {
          missing.push('Recerca validada (anàlisi/preu/snapshot)')
        }
        break
      }
      case '2->3': {
        const snapshot = getCompetitorSnapshot(projectId)
        if (!isSnapshotComplete(snapshot)) {
          missing.push('Snapshot competidor complet')
        }

        let profitability = null
        try {
          profitability = await getProjectProfitability(projectId, supabaseClient)
        } catch (err) {}

        if (!profitability) {
          const viability = getViabilitySnapshot(projectId)
          if (viability) {
            profitability = {
              selling_price: viability.selling_price,
              cogs: viability.estimated_cogs,
              shipping_per_unit: viability.shipping_to_fba_per_unit,
              fba_fee_per_unit: viability.fba_fee_estimate,
              ppc_per_unit: viability.ppc_per_unit,
              other_costs_per_unit: viability.other_costs_per_unit
            }
          }
        }

        if (!profitability) {
          missing.push('Profitabilitat guardada')
          break
        }

        const sellingPrice = parseFloat(profitability.selling_price || 0)
        const cogs = parseFloat(profitability.cogs || 0)
        const { net_profit } = calculateQuickProfitability(profitability)

        if (sellingPrice <= 0 || cogs <= 0 || (net_profit || 0) <= 0) {
          missing.push('Profit per unitat > 0')
        }
        break
      }
      case '3->4': {
        let quotes = null
        try {
          quotes = await getSupplierQuotes(projectId, supabaseClient)
        } catch (err) {
          missing.push('Pressupost de proveïdor')
        }

        if (!quotes || quotes.length === 0) {
          missing.push('Almenys 1 pressupost de proveïdor')
          break
        }

        const hasValidBreak = quotes.some(quote =>
          (quote.supplier_quote_price_breaks || []).some(breakItem => parseFloat(breakItem.unit_price || 0) > 0)
        )
        if (!hasValidBreak) {
          missing.push('Preus per volum amb preu unitari > 0')
        }
        break
      }
      case '4->5': {
        let documents = null
        try {
          documents = await getDocuments(projectId, supabaseClient)
        } catch (err) {
          missing.push('Document de mostra')
        }

        if (!documents || !hasDocCategory(documents, 'sample')) {
          missing.push('Almenys 1 document de mostra')
        }

        let tasks = null
        try {
          tasks = await getTasks({
            status: 'done',
            entityType: 'project',
            entityId: projectId
          }, supabaseClient)
        } catch (err) {
          missing.push('Tasques de validació de mostra')
        }

        if (!tasks || !hasSampleApprovalTask(tasks)) {
          missing.push('Tasques DONE de validació de mostra')
        }
        break
      }
      case '5->6': {
        let purchaseOrders = null
        try {
          purchaseOrders = await getPurchaseOrders(projectId, supabaseClient)
        } catch (err) {
          missing.push('Comanda de compra')
        }

        if (!purchaseOrders || purchaseOrders.length === 0) {
          missing.push('Almenys 1 comanda de compra')
        } else {
          const hasNonDraft = purchaseOrders.some(po => !po.status || po.status !== 'draft')
          if (!hasNonDraft) {
            missing.push('Comanda de compra no esborrany')
          }
        }

        let documents = null
        try {
          documents = await getDocuments(projectId, supabaseClient)
        } catch (err) {
          missing.push('Document de PO')
        }

        if (!documents || !hasDocCategory(documents, 'po')) {
          missing.push('Almenys 1 document de PO')
        }
        break
      }
      case '6->7': {
        let identifiers = null
        try {
          identifiers = await getProductIdentifiers(projectId, supabaseClient)
        } catch (err) {
          missing.push('Identificadors de producte')
        }

        if (!identifiers) {
          missing.push('Identificadors de producte')
        } else if (!isGtinValid(identifiers)) {
          missing.push('GTIN vàlid (EAN/UPC o exempt)')
        }

        let documents = null
        try {
          documents = await getDocuments(projectId, supabaseClient)
        } catch (err) {
          missing.push('Document de listing')
        }

        if (!documents || !hasDocCategory(documents, 'listing')) {
          missing.push('Almenys 1 document de listing')
        }
        break
      }
      default:
        break
    }
  } catch (err) {
    missing.push('Validació de fase')
  }

  return { ok: missing.length === 0, missing }
}
