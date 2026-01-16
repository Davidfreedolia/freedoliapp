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
        if (!['GO', 'RISKY'].includes((project?.decision || '').toUpperCase())) {
          missing.push('Decisió GO o RISKY')
        }

        let documents = null
        try {
          documents = await getDocuments(projectId, supabaseClient)
        } catch {
          missing.push('Document d\'anàlisi')
        }

        let estimates = null
        try {
          estimates = await getSupplierPriceEstimates(projectId, supabaseClient)
        } catch {
          missing.push('Estimació de preu de proveïdor')
        }

        const hasAnalysisDoc = documents ? hasDocCategory(documents, 'analysis') : false
        const hasPriceEstimate = estimates ? (estimates.length > 0) : false

        if (!hasAnalysisDoc && !hasPriceEstimate) {
          missing.push('Document d\'anàlisi o estimació de preu de proveïdor')
        }
        break
      }
      case '2->3': {
        let profitability = null
        try {
          profitability = await getProjectProfitability(projectId, supabaseClient)
        } catch {
          missing.push('Registre de profitabilitat')
        }

        if (!profitability) {
          missing.push('Registre de profitabilitat')
          break
        }

        const sellingPrice = parseFloat(profitability.selling_price || 0)
        const cogs = parseFloat(profitability.cogs || 0)
        const { net_profit } = calculateQuickProfitability(profitability)

        if (sellingPrice <= 0) missing.push('Preu de venda > 0')
        if (cogs <= 0) missing.push('COGS > 0')
        if ((net_profit || 0) <= 0) missing.push('Profit per unitat > 0')
        break
      }
      case '3->4': {
        let quotes = null
        try {
          quotes = await getSupplierQuotes(projectId, supabaseClient)
        } catch {
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
        } catch {
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
        } catch {
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
        } catch {
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
        } catch {
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
        } catch {
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
        } catch {
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
  } catch {
    missing.push('Validació de fase')
  }

  return { ok: missing.length === 0, missing }
}
