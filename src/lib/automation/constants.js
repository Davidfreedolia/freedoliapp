/**
 * D57.2 — Automation constants: action type mapping, validity window.
 * Single place for action types and default validity days.
 */

/** Decision type → automation action_type (only these three implemented). */
export const DECISION_TYPE_TO_ACTION_TYPE = {
  reorder: 'prepare_reorder',
  internal_task: 'create_internal_task',
  schedule_review: 'schedule_review',
}

/** Action types supported in D57.2. */
export const SUPPORTED_ACTION_TYPES = ['prepare_reorder', 'create_internal_task', 'schedule_review']

/** Action types allowed for manual execution in D57.6 (no prepare_reorder, no PO/price/messages). */
export const MANUAL_EXECUTION_ACTION_TYPES = ['create_internal_task', 'schedule_review']

/** Default validity: days until proposal expires (by action_type). */
export const VALIDITY_DAYS_BY_ACTION_TYPE = {
  prepare_reorder: 7,
  create_internal_task: 14,
  schedule_review: 7,
}

/** Proposal statuses considered "active" for dedupe (no second proposal for same decision/action). */
export const ACTIVE_PROPOSAL_STATUSES = [
  'drafted',
  'pending_approval',
  'approved',
  'queued_for_execution',
]
