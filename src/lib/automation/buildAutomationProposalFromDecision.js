/**
 * D57.2 — Build automation proposal payload from a decision (no persist).
 */

import { VALIDITY_DAYS_BY_ACTION_TYPE } from './constants.js'
import { computeProposalRisk } from './automationRisk.js'

/**
 * Simple deterministic hash for context dedupe (non-crypto).
 * @param {object} obj
 * @returns {string}
 */
function simpleHash(obj) {
  try {
    const str = JSON.stringify(obj, Object.keys(obj).sort())
    let h = 0
    for (let i = 0; i < str.length; i++) {
      const c = str.charCodeAt(i)
      h = (h << 5) - h + c
      h = h & h
    }
    return String(Math.abs(h))
  } catch {
    return ''
  }
}

/**
 * Build proposal fields from decision + rule + context. Does not insert.
 *
 * @param {object} params
 * @param {object} params.decision — row from decisions (id, org_id, decision_type, priority_score, ...)
 * @param {object} params.rule — row from automation_rules
 * @param {Record<string, unknown>} params.context — decision_context key/value
 * @param {string} [params.decisionEventId]
 * @returns {object} Row shape for automation_proposals (camelCase for JS; caller maps to snake_case for insert)
 */
export function buildAutomationProposalFromDecision(params) {
  const { decision, rule, context = {}, decisionEventId = null } = params || {}
  if (!decision?.id || !rule?.org_id) {
    throw new Error('decision and rule are required')
  }

  const actionType = rule.action_type
  const now = new Date()
  const validFrom = now.toISOString()
  const days = VALIDITY_DAYS_BY_ACTION_TYPE[actionType] ?? 7
  const expiresAt = new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString()

  const contextSnapshot = { ...context }
  const contextHash = simpleHash(contextSnapshot)

  const idempotencyKey = `decision:${decision.id}:${actionType}:${contextHash}`

  const { risk_band, risk_score } = computeProposalRisk({
    priorityScore: decision.priority_score,
    context,
    actionType,
  })

  const approvalMode = rule.approval_mode || 'single'
  const requiresGate = approvalMode !== 'none'
  const proposalStatus = requiresGate ? 'pending_approval' : 'drafted'

  const payload = {
    decision_id: decision.id,
    decision_type: decision.decision_type,
    action_type: actionType,
    title: decision.title ?? null,
    context: contextSnapshot,
  }

  return {
    org_id: rule.org_id,
    decision_id: decision.id,
    decision_event_id: decisionEventId,
    action_type: actionType,
    source_entity_type: 'decision',
    source_entity_id: decision.id,
    target_entity_type: (context.asin && 'asin') || (context.project_id && 'project') || null,
    target_entity_id: context.project_id ?? null,
    proposal_status: proposalStatus,
    automation_level: rule.automation_level ?? 0,
    approval_mode: approvalMode,
    risk_score,
    risk_band,
    payload_json: payload,
    context_snapshot_json: contextSnapshot,
    context_hash: contextHash,
    idempotency_key: idempotencyKey,
    valid_from: validFrom,
    expires_at: expiresAt,
    created_by_system: true,
  }
}
