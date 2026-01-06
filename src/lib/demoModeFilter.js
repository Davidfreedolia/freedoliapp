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
 * Add is_demo filter to a Supabase query
 * @param {object} query - Supabase query builder
 * @param {boolean} demoMode - Current demo mode state
 * @returns {object} Query with is_demo filter applied
 */
export function addDemoModeFilter(query, demoMode) {
  if (demoMode === null || demoMode === undefined) {
    // If demo mode not yet loaded, default to false (real data)
    return query.eq('is_demo', false)
  }
  return query.eq('is_demo', demoMode)
}




