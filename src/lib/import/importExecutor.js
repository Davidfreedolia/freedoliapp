/**
 * importExecutor — write mapped rows into FreedoliApp's tables.
 *
 * Strategy:
 *   - Projects: create one per unique (asin, sku) combo, skipping duplicates.
 *   - Expenses/Incomes: rows with `date` + `revenue`/`cogs`/`fba_fees`/etc. become finance rows.
 *   - Research reports: rows with `bsr` / `monthly_sales` / `search_volume` → research snapshot.
 *
 * Always inserts with `is_demo: false` and the user's active org.
 */
import { supabase } from '../supabase'

function toNumber(v) {
  if (v == null || v === '') return null
  const n = typeof v === 'number' ? v : Number(String(v).replace(/[^\d.,-]/g, '').replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

function toDate(v) {
  if (!v) return null
  const d = new Date(v)
  if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10)
  return null
}

function isValidAsin(s) {
  return /^B0[A-Z0-9]{8}$/i.test(String(s || '').trim())
}

/**
 * @param {Array<object>} mappedRows — rows already remapped to canonical fields
 * @param {object} ctx — { orgId, userId, sourceLabel }
 * @returns {Promise<{projects: number, expenses: number, incomes: number, research: number, errors: string[]}>}
 */
export async function executeImport(mappedRows, ctx) {
  const { orgId, userId, sourceLabel = 'import' } = ctx || {}
  const summary = { projects: 0, expenses: 0, incomes: 0, research: 0, errors: [] }

  if (!orgId) {
    summary.errors.push('no_active_org')
    return summary
  }

  if (!Array.isArray(mappedRows) || mappedRows.length === 0) {
    summary.errors.push('no_rows')
    return summary
  }

  // 1) Create/resolve projects for unique ASIN/SKU rows
  const projectsToCreate = new Map() // key → projectSeed
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
  if (projectsToCreate.size > 0) {
    const keys = Array.from(projectsToCreate.keys())
    const asins = keys.filter((k) => isValidAsin(k))
    const skus = Array.from(projectsToCreate.values())
      .map((p) => p.sku)
      .filter(Boolean)

    // Check for existing projects by ASIN or SKU to avoid duplicates
    try {
      const { data: existing } = await supabase
        .from('projects')
        .select('id, asin, sku')
        .or([
          asins.length ? `asin.in.(${asins.join(',')})` : null,
          skus.length ? `sku.in.(${skus.map((s) => `"${s}"`).join(',')})` : null,
        ].filter(Boolean).join(','))
      if (existing) {
        for (const e of existing) {
          const k = e.asin || e.sku
          if (k) projectIdByKey.set(k, e.id)
        }
      }
    } catch (_) { /* non-blocking */ }

    // Insert the ones not yet existing
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
        status: 'active',
        asin: seed.asin,
        org_id: orgId,
        created_by: userId,
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
  }

  // 2) Finance rows (expenses/incomes) for rows with date + monetary fields
  const expensesToInsert = []
  const incomesToInsert = []
  for (const row of mappedRows) {
    const date = toDate(row.date)
    if (!date) continue
    const asin = row.asin ? String(row.asin).trim().toUpperCase() : null
    const sku = row.sku ? String(row.sku).trim() : null
    const projectId = projectIdByKey.get(asin) || projectIdByKey.get(sku) || null

    const revenue = toNumber(row.revenue)
    if (revenue != null && revenue > 0) {
      incomesToInsert.push({
        org_id: orgId,
        project_id: projectId,
        amount: revenue,
        date,
        concept: `${sourceLabel} – revenue`,
        source: sourceLabel,
      })
    }
    const cogs = toNumber(row.cogs)
    if (cogs != null && cogs > 0) {
      expensesToInsert.push({
        org_id: orgId, project_id: projectId, amount: cogs, date,
        category: 'cogs', concept: `${sourceLabel} – cogs`, source: sourceLabel,
      })
    }
    const fbaFees = toNumber(row.fba_fees)
    if (fbaFees != null && fbaFees > 0) {
      expensesToInsert.push({
        org_id: orgId, project_id: projectId, amount: fbaFees, date,
        category: 'fba_fees', concept: `${sourceLabel} – fba fees`, source: sourceLabel,
      })
    }
    const ppc = toNumber(row.ppc_cost)
    if (ppc != null && ppc > 0) {
      expensesToInsert.push({
        org_id: orgId, project_id: projectId, amount: ppc, date,
        category: 'ppc', concept: `${sourceLabel} – ppc`, source: sourceLabel,
      })
    }
  }

  if (expensesToInsert.length > 0) {
    try {
      const { error } = await supabase.from('expenses').insert(expensesToInsert)
      if (error) summary.errors.push(`expenses: ${error.message}`)
      else summary.expenses += expensesToInsert.length
    } catch (e) { summary.errors.push(`expenses: ${e.message}`) }
  }
  if (incomesToInsert.length > 0) {
    try {
      const { error } = await supabase.from('incomes').insert(incomesToInsert)
      if (error) summary.errors.push(`incomes: ${error.message}`)
      else summary.incomes += incomesToInsert.length
    } catch (e) { summary.errors.push(`incomes: ${e.message}`) }
  }

  // 3) Research snapshot rows (Jungle Scout-style: bsr + monthly metrics)
  const researchToInsert = []
  for (const row of mappedRows) {
    const asin = row.asin ? String(row.asin).trim().toUpperCase() : null
    const bsr = toNumber(row.bsr)
    const monthlyRev = toNumber(row.monthly_revenue)
    const monthlySales = toNumber(row.monthly_sales)
    const price = toNumber(row.price)
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
          search_volume: toNumber(row.search_volume) || null,
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
    try {
      const { error } = await supabase.from('research_reports').insert(researchToInsert)
      if (error) summary.errors.push(`research: ${error.message}`)
      else summary.research += researchToInsert.length
    } catch (e) { summary.errors.push(`research: ${e.message}`) }
  }

  return summary
}
