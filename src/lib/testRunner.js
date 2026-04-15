/**
 * testRunner.js — read-only smoke/acceptance checks after generateTestData.
 *
 * Usage (browser console):
 *   import { runAllChecks } from '@/lib/testRunner'
 *   await runAllChecks()
 *
 * Each check returns { name, status: 'PASS' | 'FAIL' | 'SKIP', details }.
 * The runner prints a table and returns the full array.
 */

import { supabase, getCurrentUserId } from './supabase'

const pass = (name, details = '') => ({ name, status: 'PASS', details })
const fail = (name, details = '') => ({ name, status: 'FAIL', details })
const skip = (name, details = '') => ({ name, status: 'SKIP', details })

async function checkAuth() {
  try {
    const uid = await getCurrentUserId()
    return uid ? pass('Auth: user session', `user_id=${uid}`) : fail('Auth: user session', 'no user_id')
  } catch (err) {
    return fail('Auth: user session', err.message)
  }
}

async function checkTestProjects() {
  try {
    const { data, error } = await supabase
      .from('projects').select('id, current_phase, decision').like('project_code', 'TEST-%')
    if (error) return fail('Test projects', error.message)
    const n = data?.length || 0
    const live = (data || []).filter((p) => p.current_phase === 7).length
    return n >= 8 && live >= 4
      ? pass('Test projects', `${n} projects, ${live} live`)
      : fail('Test projects', `expected >= 8 projects / >= 4 live, got ${n}/${live}`)
  } catch (err) {
    return fail('Test projects', err.message)
  }
}

async function checkPurchaseOrders() {
  try {
    const { data, error } = await supabase
      .from('purchase_orders').select('status').like('po_number', 'TEST-%')
    if (error) return fail('Purchase orders', error.message)
    const statuses = new Set((data || []).map((r) => r.status))
    return (data?.length || 0) >= 5 && statuses.size >= 4
      ? pass('Purchase orders', `${data.length} POs, ${statuses.size} statuses: ${[...statuses].join(',')}`)
      : fail('Purchase orders', `expected >= 5 POs / >= 4 statuses, got ${data?.length}/${statuses.size}`)
  } catch (err) {
    return fail('Purchase orders', err.message)
  }
}

async function checkRevenueTotal() {
  try {
    // Sum incomes for month Apr 2026 from test projects.
    const { data: projects } = await supabase
      .from('projects').select('id').like('project_code', 'TEST-%')
    const projectIds = (projects || []).map((p) => p.id)
    if (projectIds.length === 0) return fail('Revenue total (Apr 2026)', 'no test projects')

    const { data, error } = await supabase
      .from('incomes').select('amount, income_date').in('project_id', projectIds)
    if (error) return fail('Revenue total', error.message)
    const apr = (data || []).filter((r) => (r.income_date || '').startsWith('2026-04'))
    const total = apr.reduce((s, r) => s + Number(r.amount || 0), 0)
    return total >= 15000
      ? pass('Revenue total (Apr 2026)', `€${total.toFixed(2)}`)
      : fail('Revenue total (Apr 2026)', `expected >= €15000, got €${total.toFixed(2)}`)
  } catch (err) {
    return fail('Revenue total', err.message)
  }
}

async function checkMarginsPositive() {
  try {
    const { data: projects } = await supabase
      .from('projects').select('id, name, current_phase').like('project_code', 'TEST-%')
    const livePids = (projects || []).filter((p) => p.current_phase === 7).map((p) => p.id)
    if (livePids.length === 0) return fail('Margins', 'no live test projects')

    const { data: incomes } = await supabase
      .from('incomes').select('project_id, amount').in('project_id', livePids)
    const { data: expenses } = await supabase
      .from('expenses').select('project_id, amount').in('project_id', livePids)

    const failures = []
    for (const pid of livePids) {
      const rev = (incomes || []).filter((r) => r.project_id === pid).reduce((s, r) => s + Number(r.amount), 0)
      const exp = (expenses || []).filter((r) => r.project_id === pid).reduce((s, r) => s + Number(r.amount), 0)
      const net = rev - exp
      const marginPct = rev > 0 ? (net / rev) * 100 : 0
      if (marginPct < 25 || marginPct > 40) {
        failures.push(`${pid}:${marginPct.toFixed(1)}%`)
      }
    }
    return failures.length === 0
      ? pass('Margins (live SKUs 25-40%)', `${livePids.length} SKUs in band`)
      : fail('Margins', `out of band: ${failures.join(', ')}`)
  } catch (err) {
    return fail('Margins', err.message)
  }
}

async function checkResearchReport() {
  try {
    const userId = await getCurrentUserId()
    const { data, error } = await supabase
      .from('research_reports').select('id, viability_score, recommendation').eq('created_by', userId)
    if (error) return fail('Research reports', error.message)
    const go = (data || []).find((r) => r.recommendation === 'go' && r.viability_score === 78)
    return go
      ? pass('Research reports', `score=78, recommendation=go`)
      : fail('Research reports', `expected score=78 / rec=go, found ${JSON.stringify(data)}`)
  } catch (err) {
    return fail('Research reports', err.message)
  }
}

async function checkDecisions() {
  try {
    const { data: projects } = await supabase
      .from('projects').select('id').like('project_code', 'TEST-%')
    const projectIds = (projects || []).map((p) => p.id)
    if (projectIds.length === 0) return fail('Decisions', 'no test projects')

    const { data, error } = await supabase
      .from('decision_log').select('id, status, title')
      .eq('entity_type', 'project').in('entity_id', projectIds)
    if (error) return fail('Decisions', error.message)
    const pending = (data || []).filter((r) => r.status === 'pending')
    return pending.length >= 3
      ? pass('Decisions', `${pending.length} pending`)
      : fail('Decisions', `expected >= 3 pending, got ${pending.length}`)
  } catch (err) {
    return fail('Decisions', err.message)
  }
}

async function checkFinancesCoverage() {
  try {
    const { data: projects } = await supabase
      .from('projects').select('id').like('project_code', 'TEST-%')
    const projectIds = (projects || []).map((p) => p.id)
    if (projectIds.length === 0) return fail('Finances coverage', 'no test projects')

    const { data, error } = await supabase
      .from('incomes').select('income_date').in('project_id', projectIds)
    if (error) return fail('Finances coverage', error.message)
    const months = new Set((data || []).map((r) => (r.income_date || '').slice(0, 7)))
    return months.size >= 6
      ? pass('Finances coverage', `${months.size} distinct months`)
      : fail('Finances coverage', `expected >= 6 months, got ${months.size}`)
  } catch (err) {
    return fail('Finances coverage', err.message)
  }
}

export async function runAllChecks() {
  const results = []
  results.push(await checkAuth())
  results.push(await checkTestProjects())
  results.push(await checkPurchaseOrders())
  results.push(await checkRevenueTotal())
  results.push(await checkMarginsPositive())
  results.push(await checkFinancesCoverage())
  results.push(await checkResearchReport())
  results.push(await checkDecisions())

  const summary = results.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1
    return acc
  }, {})
  console.table(results)
  console.log('[testRunner] summary:', summary)
  return { results, summary }
}
