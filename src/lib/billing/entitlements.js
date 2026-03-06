/**
 * D11.7 — Feature Gating Engine (canonical).
 * Single source of truth: billing_org_entitlements.
 * Do not gate by Stripe, plan_code, or scattered checks.
 */

/**
 * Fetch org entitlements from billing_org_entitlements.
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} orgId
 * @returns {Promise<import('@supabase/supabase-js').BillingOrgEntitlementRow>}
 */
export async function getOrgEntitlements(supabase, orgId) {
  const { data, error } = await supabase
    .from('billing_org_entitlements')
    .select('*')
    .eq('org_id', orgId)
    .limit(1)

  if (error) throw new Error('billing_entitlements_lookup_failed')

  if (!data || data.length === 0) throw new Error('billing_entitlements_missing')

  return data[0]
}

/**
 * Check if a feature is enabled for the org.
 * @param {object} entitlements - row from getOrgEntitlements
 * @param {string} featureCode - e.g. 'amazon_ingest', 'profit_engine', 'analytics'
 * @returns {boolean}
 */
export function hasOrgFeature(entitlements, featureCode) {
  const feature = entitlements.features_jsonb?.[featureCode]
  if (!feature) return false
  return feature.enabled === true
}

/**
 * Get numeric limit for a feature (e.g. projects.max, team.seats).
 * @param {object} entitlements
 * @param {string} featureCode - e.g. 'projects.max', 'team.seats'
 * @returns {number|null}
 */
export function getOrgFeatureLimit(entitlements, featureCode) {
  const feature = entitlements.features_jsonb?.[featureCode]
  if (!feature) return null
  return feature.limit ?? null
}

/**
 * Throw if org billing is not active.
 * @param {object} entitlements
 */
export function assertOrgActive(entitlements) {
  if (!entitlements.is_active) {
    const err = new Error('org_billing_inactive')
    err.status = 403
    throw err
  }
}

/**
 * Throw if feature is not available for the org.
 * @param {object} entitlements
 * @param {string} featureCode
 */
export function assertOrgFeature(entitlements, featureCode) {
  if (!hasOrgFeature(entitlements, featureCode)) {
    const err = new Error('feature_not_available')
    err.status = 403
    throw err
  }
}

/**
 * Throw if current value is at or above the plan limit.
 * @param {object} entitlements
 * @param {string} featureCode - e.g. 'projects.max', 'team.seats'
 * @param {number} currentValue
 */
export function assertOrgWithinLimit(entitlements, featureCode, currentValue) {
  const limit = getOrgFeatureLimit(entitlements, featureCode)
  if (limit === null) return
  if (currentValue >= limit) {
    const err = new Error('plan_limit_reached')
    err.status = 403
    throw err
  }
}
