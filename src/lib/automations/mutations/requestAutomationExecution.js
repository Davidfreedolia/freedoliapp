import { supabase } from '../../supabase'
import { createAutomationExecutionIntent } from '../../automation/createAutomationExecutionIntent.js'

/**
 * Operator UI mutation: request an execution intent for an approved proposal (D57.5).
 * Does not execute business actions; just creates/returns an intent.
 */
export async function requestAutomationExecution(params) {
  const { proposalId, orgId } = params || {}
  return createAutomationExecutionIntent(supabase, { proposalId, orgId })
}

