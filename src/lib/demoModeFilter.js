/**
 * Demo Mode Filter Helper
 * Ensures complete separation between demo and real data
 * 
 * IMPORTANT: This module must NOT import supabase.js at module scope to avoid circular dependencies.
 * All supabase imports are done dynamically inside functions.
 */

let _cachedDemoMode = null
let _cacheTimestamp = null
const CACHE_TTL = 5000 // 5 seconds cache

/**
 * Get current demo_mode setting
 * @returns {Promise<boolean>} true if demo mode is ON, false otherwise
 */
export async function getDemoMode() {
  const now = Date.now()
  
  // Return cached value if still valid
  if (_cachedDemoMode !== null && _cacheTimestamp && (now - _cacheTimestamp) < CACHE_TTL) {
    return _cachedDemoMode
  }

  // Local demo toggle: skip Supabase lookups to avoid unauthenticated errors
  const { isDemoMode } = await import('../demo/demoMode')
  if (isDemoMode()) {
    _cachedDemoMode = false
    _cacheTimestamp = now
    return false
  }

  try {
    // Dynamic import to avoid circular dependency with supabase.js
    const { getCompanySettings } = await import('./supabase')
    const settings = await getCompanySettings()
    _cachedDemoMode = settings?.demo_mode || false
    _cacheTimestamp = now
    return _cachedDemoMode
  } catch (err) {
    console.error('Error getting demo mode:', err)
    // Default to false (real data) on error
    _cachedDemoMode = false
    _cacheTimestamp = now
    return false
  }
}

/**
 * Clear cache (call after toggling demo mode)
 */
export function clearDemoModeCache() {
  _cachedDemoMode = null
  _cacheTimestamp = null
}

/**
 * Taules org-scoped on la columna is_demo ha estat eliminada (S1.5/S1.4b).
 * No s'aplica filtre is_demo en aquestes taules.
 */
export const NO_IS_DEMO_TABLES = new Set([
  'recurring_expenses',
  'recurring_expense_occurrences',
  'warehouses',
  'documents',
  'expense_attachments',
  'tasks',
  'sticky_notes',
  'projects',
  'suppliers',
  'supplier_quotes',
  'purchase_orders',
  'product_identifiers',
  'payments'
])

/**
 * Add is_demo filter to a Supabase query (legacy).
 * @param {object} query - Supabase query builder
 * @param {boolean} demoMode - Current demo mode state
 * @param {string} [tableName] - Optional table name; if in NO_IS_DEMO_TABLES, filter is skipped
 * @returns {object} Query with is_demo filter applied (or unchanged if table is org-scoped)
 */
export function addDemoModeFilter(query, demoMode, tableName = null) {
  if (tableName && NO_IS_DEMO_TABLES.has(tableName)) {
    return query
  }
  if (demoMode === null || demoMode === undefined) {
    return query.eq('is_demo', false)
  }
  return query.eq('is_demo', demoMode)
}

/**
 * Apply demo mode filter only when the table is not org-scoped (no is_demo column).
 * @param {string} tableName - Table name
 * @param {object} query - Supabase query builder
 * @param {boolean} demoMode - Current demo mode state
 * @returns {object} Query unchanged if table in NO_IS_DEMO_TABLES, else with is_demo filter
 */
export function applyDemoModeFilter(tableName, query, demoMode) {
  if (tableName && NO_IS_DEMO_TABLES.has(tableName)) {
    return query
  }
  if (demoMode === null || demoMode === undefined) {
    return query.eq('is_demo', false)
  }
  return query.eq('is_demo', demoMode)
}




