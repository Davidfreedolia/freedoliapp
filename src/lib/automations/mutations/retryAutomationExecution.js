import { supabase } from '../../supabase'
import { runAutomationExecutionManually } from '../../automation/runAutomationExecutionManually.js'

/**
 * Operator UI mutation: run (or retry) an existing queued execution manually (D57.6).
 */
export async function retryAutomationExecution(params) {
  const { executionId, orgId, actorUserId } = params || {}
  return runAutomationExecutionManually(supabase, { executionId, orgId, actorUserId })
}

