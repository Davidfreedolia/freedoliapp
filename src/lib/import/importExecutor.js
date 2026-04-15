/**
 * importExecutor — write mapped rows into FreedoliApp's tables.
 *
 * Strategy:
 *   - Projects: create one per unique (asin, sku) combo, skipping duplicates.
 *   - Expenses/Incomes: rows with `date` + monetary fields become finance rows.
 *     Sellerboard P&L imports explode every cost column into its own categorized
 *     expense record so Finance keeps a clean breakdown.
 *   - Research reports: rows with `bsr` / `monthly_sales` / `search_volume`
 *     become research snapshots.
 *
 * Always inserts with `is_demo: false` (implicit default) and the user's active org.
 */
import { supabase } from '../supabase'
import { parseNumber } from './currencyDetector'

function toNumber(v, format = null) {
  if (v == null || v === '') return null
  const n = parseNumber(v, format)
  return Number.isFinite(n) ? n : null
}

function toDate(v) {
  if (!v) return null
  const s = String(v).trim()
  // YYYY-MM format → assume first day of month.
  if (/^\d{4}-\d{2}$/.test(s)) return `${s}-01`
  const d = new Date(s)
  if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10)
  return null
}

function isValidAsin(s) {
  return /^B0[A-Z0-9]{8}$/i.test(String(s || '').trim())
}

/** Expense categories emitted by the Sellerboard P&L breakdown. */
const PL_EXPENSE_CATEGORIES = [
  { field: 'cogs',            category: 'cogs',            label: 'cogs' },
  { field: 'fba_fees',        category: 'fba_fees',        label: 'FBA fees' },
  { field: 'referral_fees',   category: 'referral_fees',   label: 'referral fees' },
  { field: 'storage_fee',     category: 'storage',         label: 'storage' },
  { field: 'ppc_cost',        category: 'ppc',             label: 'PPC' },
  { field: 'refunds',         category: 'refunds',         label: 'refunds' },
  { field: 'promotions',      category: 'promotions',      label: 'promotions' },
  { field: 'shipping',        category: 'shipping',        label: 'shipping' },
  { field: 'other_expenses',  category: 'other',           label: 'other' },
]

/**
 * Resolve / create projects for the set of mapped rows.
 * Returns a Map keyed by asin|sku → projectId.
 */
async function resolveProjects(mappedRows, ctx, summary) {
  const { orgId, userId, sourceLabel } = ctx
  const projectsToCreate = new Map()
  for (const row of mappedRows) {
    const asin = row.asin ? String(row.asin).trim().toUpperCase() : null
    const sku = row.sku ? String(row.sku).trim() : null
    const key = asin || sku
    if (!key) continue
    if (projectsToCreate.has(key)) continue
    projectsToCreate.set(key, {
      asin: isValidAsin(asin) ? asin : null,
      sku: sku || null,
      name: row.product_name || `Imported ${key}`,
    })
  }

  const projectIdByKey = new Map()
  if (projectsToCreate.size === 0) return projectIdByKey

  const keys = Array.from(projectsToCreate.keys())
  const asins = keys.filter((k) => isValidAsin(k))
  const skus = Array.from(projectsToCreate.values())
    .map((p) => p.sku)
    .filter(Boolean)

  try {
    const clauses = []
    if (asins.length) clauses.push(`asin.in.(${asins.join(',')})`)
    if (skus.length) clauses.push(`sku.in.(${skus.map((s) => `"${s}"`).join(',')})`)
    if (clauses.length > 0) {
      const { data: existing } = await supabase
        .from('projects')
        .select('id, asin, sku')
        .eq('org_id', orgId)
        .or(clauses.join(','))
      if (existing) {
        for (const e of existing) {
          const k = e.asin || e.sku
          if (k) projectIdByKey.set(k, e.id)
        }
      }
    }
  } catch { /* non-blocking */ }

  const toInsert = []
  let idx = 0
  for (const [k, seed] of projectsToCreate) {
    if (projectIdByKey.has(k)) continue
    const projectCode = `IMP-${Date.now().toString(36).toUpperCase()}-${String(idx++).padStart(3, '0')}`
    toInsert.push({
      project_code: projectCode,
      sku: seed.sku || projectCode,
      sku_internal: seed.sku || projectCode,
      name: seed.name,
      description: `Importat des de ${sourceLabel}`,
      current_phase: 1,
      phase: 1,
      status: 'active',
      asin: seed.asin,
      org_id: orgId,
      user_id: userId,
    })
  }
  if (toInsert.length > 0) {
    const { data: inserted, error: insErr } = await supabase
      .from('projects')
      .insert(toInsert)
      .select('id, asin, sku')
    if (insErr) {
      summary.errors.push(`projects: ${insErr.message}`)
    } else {
      for (const p of inserted || []) {
        const k = p.asin || p.sku
        if (k) projectIdByKey.set(k, p.id)
        summary.projects++
      }
    }
  }
  return projectIdByKey
}

/**
 * Sellerboard Dashboard / P&L import — per-row finance breakdown.
 *
 * Every monetary column that is > 0 becomes its own categorized expense (or
 * income for `revenue`). Imports are idempotent-ish: description always carries
 * the source so the user can filter later.
 */
export async function executeSellerboardPLImport(mappedRows, ctx) {
  const { orgId, userId, sourceLabel = 'sellerboard', numberFormat = null } = ctx || {}
  const summary = { projects: 0, expenses: 0, incomes: 0, research: 0, errors: [] }
  if (!orgId) { summary.errors.push('no_active_org'); return summary }
  if (!Array.isArray(mappedRows) || mappedRows.length === 0) {
    summary.errors.push('no_rows'); return summary
  }

  const projectIdByKey = await resolveProjects(mappedRows, ctx, summary)

  const expenses = []
  const incomes = []
  for (const row of mappedRows) {
    const date = toDate(row.date)
    if (!date) continue
    const asin = row.asin ? String(row.asin).trim().toUpperCase() : null
    const sku = row.sku ? String(row.sku).trim() : null
    const projectId = projectIdByKey.get(asin) || projectIdByKey.get(sku) || null
    const productLabel = row.product_name || asin || sku || ''

    const revenue = toNumber(row.revenue, numberFormat)
    if (revenue != null && revenue > 0) {
      incomes.push({
        org_id: orgId,
        user_id: userId,
        project_id: projectId,
        amount: revenue,
        income_date: date,
        category: 'sales',
        description: `${sourceLabel} — sales${productLabel ? ' · ' + productLabel : ''}`,
      })
    }

    for (const spec of PL_EXPENSE_CATEGORIES) {
      const raw = row[spec.field]
      const amount = toNumber(raw, numberFormat)
      if (amount == null || amount <= 0) continue
      expenses.push({
        org_id: orgId,
        user_id: userId,
        project_id: projectId,
        amount,
        expense_date: date,
        category: spec.category,
        description: `${sourceLabel} — ${spec.label}${productLabel ? ' · ' + productLabel : ''}`,
      })
    }
  }

  if (expenses.length > 0) {
    try {
      const { error } = await supabase.from('expenses').insert(expenses)
      if (error) summary.errors.push(`expenses: ${error.message}`)
      else summary.expenses += expenses.length
    } catch (e) { summary.errors.push(`expenses: ${e.message}`) }
  }
  if (incomes.length > 0) {
    try {
      const { error } = await supabase.from('incomes').insert(incomes)
      if (error) summary.errors.push(`incomes: ${error.message}`)
      else summary.incomes += incomes.length
    } catch (e) { summary.errors.push(`incomes: ${e.message}`) }
  }

  return summary
}

/**
 * Holded import — incomes for issued invoices, expenses for received ones.
 * Uses the `total` field as amount, distinguishing by whether `client` or
 * `supplier` is present.
 */
export async function executeHoldedImport(mappedRows, ctx) {
  const { orgId, userId, sourceLabel = 'holded', numberFormat = null } = ctx || {}
  const summary = { projects: 0, expenses: 0, incomes: 0, research: 0, errors: [] }
  if (!orgId) { summary.errors.push('no_active_org'); return summary }
  if (!Array.isArray(mappedRows) || mappedRows.length === 0) {
    summary.errors.push('no_rows'); return summary
  }

  const expenses = []
  const incomes = []
  for (const row of mappedRows) {
    const date = toDate(row.date)
    if (!date) continue
    const amount = toNumber(row.total ?? row.base_amount, numberFormat)
    if (amount == null || amount === 0) continue

    const hasSupplier = row.supplier && !row.client
    const hasClient = row.client && !row.supplier
    const description = [row.concept, row.invoice_number, row.client || row.supplier]
      .filter(Boolean).join(' · ') || sourceLabel

    if (hasSupplier || (amount < 0 && !hasClient)) {
      expenses.push({
        org_id: orgId,
        user_id: userId,
        project_id: null,
        amount: Math.abs(amount),
        expense_date: date,
        category: row.category || 'other',
        description: `${sourceLabel} — ${description}`,
      })
    } else if (hasClient || amount > 0) {
      incomes.push({
        org_id: orgId,
        user_id: userId,
        project_id: null,
        amount: Math.abs(amount),
        income_date: date,
        category: 'invoice',
        description: `${sourceLabel} — ${description}`,
      })
    }
  }

  if (expenses.length > 0) {
    const { error } = await supabase.from('expenses').insert(expenses)
    if (error) summary.errors.push(`expenses: ${error.message}`)
    else summary.expenses += expenses.length
  }
  if (incomes.length > 0) {
    const { error } = await supabase.from('incomes').insert(incomes)
    if (error) summary.errors.push(`incomes: ${error.message}`)
    else summary.incomes += incomes.length
  }

  return summary
}

/**
 * SoStocked import — creates/updates projects with inventory signals, no finance rows.
 */
export async function executeSoStockedImport(mappedRows, ctx) {
  const summary = { projects: 0, expenses: 0, incomes: 0, research: 0, errors: [] }
  const projectIdByKey = await resolveProjects(mappedRows, ctx, summary)
  // Projects already created/matched. Stock columns are informational only for now.
  // We could write to inventory_movements in a future iteration.
  return { ...summary, _matched: projectIdByKey.size }
}

/**
 * Generic executor — the legacy behavior. Creates projects for ASIN/SKU rows,
 * finance rows when `date` + monetary fields are present, and research snapshots
 * when BSR / monthly metrics are present.
 */
export async function executeGenericImport(mappedRows, ctx) {
  const { orgId, userId, sourceLabel = 'import', numberFormat = null } = ctx || {}
  const summary = { projects: 0, expenses: 0, incomes: 0, research: 0, errors: [] }

  if (!orgId) { summary.errors.push('no_active_org'); return summary }
  if (!Array.isArray(mappedRows) || mappedRows.length === 0) {
    summary.errors.push('no_rows'); return summary
  }

  const projectIdByKey = await resolveProjects(mappedRows, ctx, summary)

  const expenses = []
  const incomes = []
  for (const row of mappedRows) {
    const date = toDate(row.date)
    if (!date) continue
    const asin = row.asin ? String(row.asin).trim().toUpperCase() : null
    const sku = row.sku ? String(row.sku).trim() : null
    const projectId = projectIdByKey.get(asin) || projectIdByKey.get(sku) || null

    const revenue = toNumber(row.revenue, numberFormat)
    if (revenue != null && revenue > 0) {
      incomes.push({
        org_id: orgId, user_id: userId, project_id: projectId,
        amount: revenue, income_date: date, category: 'sales',
        description: `${sourceLabel} — revenue`,
      })
    }
    for (const spec of PL_EXPENSE_CATEGORIES) {
      const amount = toNumber(row[spec.field], numberFormat)
      if (amount == null || amount <= 0) continue
      expenses.push({
        org_id: orgId, user_id: userId, project_id: projectId,
        amount, expense_date: date, category: spec.category,
        description: `${sourceLabel} — ${spec.label}`,
      })
    }
  }

  if (expenses.length > 0) {
    const { error } = await supabase.from('expenses').insert(expenses)
    if (error) summary.errors.push(`expenses: ${error.message}`)
    else summary.expenses += expenses.length
  }
  if (incomes.length > 0) {
    const { error } = await supabase.from('incomes').insert(incomes)
    if (error) summary.errors.push(`incomes: ${error.message}`)
    else summary.incomes += incomes.length
  }

  const researchToInsert = []
  for (const row of mappedRows) {
    const asin = row.asin ? String(row.asin).trim().toUpperCase() : null
    const bsr = toNumber(row.bsr, numberFormat)
    const monthlyRev = toNumber(row.monthly_revenue, numberFormat)
    const monthlySales = toNumber(row.monthly_sales, numberFormat)
    const price = toNumber(row.price, numberFormat)
    if (!asin || (!bsr && !monthlyRev && !monthlySales)) continue

    researchToInsert.push({
      org_id: orgId,
      project_id: projectIdByKey.get(asin) || null,
      input_asin: asin,
      input_description: row.product_name || null,
      marketplace: 'ES',
      sources_used: [sourceLabel],
      raw_data: { imported_from: sourceLabel, row },
      ai_analysis: {
        market: {
          selling_price: price ? { min: price, max: price, currency: 'EUR' } : null,
          bsr: bsr || null,
          search_volume: toNumber(row.search_volume, numberFormat) || null,
          trend: 'unknown',
          summary: `Dades importades de ${sourceLabel}.`,
        },
      },
      viability_score: null,
      recommendation: 'needs-research',
      created_by: userId,
    })
  }
  if (researchToInsert.length > 0) {
    const { error } = await supabase.from('research_reports').insert(researchToInsert)
    if (error) summary.errors.push(`research: ${error.message}`)
    else summary.research += researchToInsert.length
  }

  return summary
}

/**
 * Dispatch to the right executor based on source + sub-type.
 */
export async function executeImport(mappedRows, ctx) {
  const { sourceId, subType } = ctx || {}
  if (sourceId === 'sellerboard' && (subType === 'dashboard_pl' || subType == null)) {
    return executeSellerboardPLImport(mappedRows, ctx)
  }
  if (sourceId === 'holded') return executeHoldedImport(mappedRows, ctx)
  if (sourceId === 'sostocked') return executeSoStockedImport(mappedRows, ctx)
  return executeGenericImport(mappedRows, ctx)
}

/**
 * Compute a preview summary (without writing to DB) for the wizard.
 */
export function computePreviewSummary(mappedRows, { sourceId, subType, numberFormat } = {}) {
  const rows = Array.isArray(mappedRows) ? mappedRows : []
  const products = new Set()
  let revenue = 0
  let expenses = 0
  let dateMin = null
  let dateMax = null
  let projectsNew = 0
  let incomesCount = 0
  let expensesCount = 0

  for (const row of rows) {
    const asin = row.asin ? String(row.asin).trim().toUpperCase() : null
    const sku = row.sku ? String(row.sku).trim() : null
    const key = asin || sku
    if (key) products.add(key)

    const date = toDate(row.date)
    if (date) {
      if (!dateMin || date < dateMin) dateMin = date
      if (!dateMax || date > dateMax) dateMax = date
    }

    const rev = toNumber(row.revenue, numberFormat)
    if (rev != null && rev > 0) { revenue += rev; incomesCount++ }
    for (const spec of PL_EXPENSE_CATEGORIES) {
      const amt = toNumber(row[spec.field], numberFormat)
      if (amt != null && amt > 0) { expenses += amt; expensesCount++ }
    }
  }
  projectsNew = products.size

  return {
    rowsCount: rows.length,
    productsCount: products.size,
    projectsToCreate: projectsNew,
    incomesToCreate: incomesCount,
    expensesToCreate: expensesCount,
    revenueTotal: Math.round(revenue * 100) / 100,
    expensesTotal: Math.round(expenses * 100) / 100,
    netProfit: Math.round((revenue - expenses) * 100) / 100,
    dateRange: dateMin && dateMax ? { start: dateMin, end: dateMax } : null,
    sourceId: sourceId || 'generic',
    subType: subType || null,
  }
}
