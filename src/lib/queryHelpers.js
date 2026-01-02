/**
 * Query Helpers for Supabase
 * Ensures consistent filtering across all queries
 */

import { getDemoMode } from './demoModeFilter'
import { getCurrentUserId } from './supabase'

/**
 * Apply demo mode filter to any Supabase query
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
 * Get base query with user_id and demo mode filters
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
  return supabase
    .from(table)
    .select('*')
    .eq('user_id', userId)
    .eq('is_demo', demoMode)
}


