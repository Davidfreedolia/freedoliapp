/**
 * Query Helpers for Supabase
 * Ensures consistent filtering across all queries
 */

import { getDemoMode, NO_IS_DEMO_TABLES } from './demoModeFilter'
import { getCurrentUserId } from './supabase'

/**
 * Apply demo mode filter to any Supabase query (legacy; no table context).
 * @param {object} query - Supabase query builder
 * @param {boolean} demoMode - Current demo mode state
 * @returns {object} Query with is_demo filter applied
 */
export async function withDemoFilter(query, demoMode = null) {
  if (demoMode === null) {
    demoMode = await getDemoMode()
  }
  return query.eq('is_demo', demoMode)
}

/**
 * Apply demo mode filter only when table is not org-scoped (S1.6).
 * @param {string} tableName - Table name
 * @param {object} query - Supabase query builder
 * @param {boolean} demoMode - Current demo mode state
 * @returns {object} Query unchanged if table in NO_IS_DEMO_TABLES, else with is_demo filter
 */
export function withDemoFilterForTable(tableName, query, demoMode) {
  if (tableName && NO_IS_DEMO_TABLES.has(tableName)) {
    return query
  }
  return query.eq('is_demo', demoMode ?? false)
}

/**
 * Get base query with user_id and demo mode filters.
 * Skips is_demo for org-scoped tables (NO_IS_DEMO_TABLES).
 * @param {string} table - Table name
 * @param {object} supabase - Supabase client
 * @param {boolean} demoMode - Optional demo mode (will fetch if not provided)
 * @returns {object} Query with filters applied
 */
export async function getBaseQuery(table, supabase, demoMode = null) {
  const userId = await getCurrentUserId()
  if (demoMode === null) {
    demoMode = await getDemoMode()
  }
  let q = supabase.from(table).select('*').eq('user_id', userId)
  if (!NO_IS_DEMO_TABLES.has(table)) {
    q = q.eq('is_demo', demoMode)
  }
  return q
}




