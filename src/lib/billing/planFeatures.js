/**
 * Static plan-feature matrix — source of truth for UI gating.
 *
 * Use this alongside entitlements.js: entitlements is the authoritative
 * server-driven source (billing_org_entitlements.features_jsonb), while
 * this module provides the static plan-code mapping for fast UI checks
 * and declarative routing/sidebar gating.
 *
 * Keep feature keys semantic (not route-specific) so one key can gate
 * multiple surfaces (sidebar item, route guard, UI section).
 */

/**
 * @typedef {'starter'|'growth'|'scale'|'trial'} PlanCode
 */

export const PLAN_CODES = /** @type {const} */ (['starter', 'growth', 'scale', 'trial'])

export const PLAN_FEATURES = {
  starter: {
    max_users: 1,
    max_projects: 10,
    ai_research_per_month: 5,
    sp_api: false,
    tracking: false,
    decision_engine: false,
    automations: false,
    advanced_analytics: false,
    amazon_imports: false,
    finance_exports: false,
    calendar: false,
    task_inbox: false,
    operations_planning: false,
    data_import: true,
  },
  growth: {
    max_users: 3,
    max_projects: -1, // unlimited
    ai_research_per_month: 50,
    sp_api: true,
    tracking: true,
    decision_engine: true,
    automations: false,
    advanced_analytics: false,
    amazon_imports: true,
    finance_exports: true,
    calendar: true,
    task_inbox: true,
    operations_planning: false,
    data_import: true,
  },
  scale: {
    max_users: -1,
    max_projects: -1,
    ai_research_per_month: -1,
    sp_api: true,
    tracking: true,
    decision_engine: true,
    automations: true,
    advanced_analytics: true,
    amazon_imports: true,
    finance_exports: true,
    calendar: true,
    task_inbox: true,
    operations_planning: true,
    data_import: true,
  },
  trial: {
    // 14 dies de Growth gratis
    max_users: 3,
    max_projects: -1,
    ai_research_per_month: 50,
    sp_api: true,
    tracking: true,
    decision_engine: true,
    automations: false,
    advanced_analytics: false,
    amazon_imports: true,
    finance_exports: true,
    calendar: true,
    task_inbox: true,
    operations_planning: false,
    data_import: true,
  },
}

/** Normalize arbitrary plan code → canonical PLAN_FEATURES key. Unknown ⇒ 'starter'. */
export function normalizePlanCode(code) {
  if (!code) return 'starter'
  const lower = String(code).toLowerCase().trim()
  if (PLAN_CODES.includes(lower)) return lower
  if (lower.includes('scale') || lower.includes('enterprise')) return 'scale'
  if (lower.includes('growth') || lower.includes('pro')) return 'growth'
  if (lower.includes('trial')) return 'trial'
  return 'starter'
}

/** Returns true if the feature flag is enabled (truthy) for the given plan. */
export function hasPlanFeature(planCode, featureKey) {
  const plan = PLAN_FEATURES[normalizePlanCode(planCode)]
  if (!plan) return false
  const val = plan[featureKey]
  if (val === -1) return true // unlimited
  return Boolean(val)
}

/** Returns numeric limit for a feature (e.g. max_projects). -1 = unlimited, null if unknown. */
export function getPlanLimit(planCode, featureKey) {
  const plan = PLAN_FEATURES[normalizePlanCode(planCode)]
  if (!plan) return null
  const val = plan[featureKey]
  return typeof val === 'number' ? val : null
}

/** Returns the plan where a given feature first becomes available (for upgrade CTAs). */
export function getUpgradePlanForFeature(featureKey) {
  const order = ['starter', 'growth', 'scale']
  for (const code of order) {
    if (hasPlanFeature(code, featureKey)) return code
  }
  return 'scale'
}
