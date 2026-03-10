import { supabase } from '../../supabase'
import { rejectAutomationProposal as rejectHelper } from '../../automation/rejectAutomationProposal.js'

/**
 * Operator UI mutation: reject a proposal (D57.3).
 */
export async function rejectAutomationProposal(params) {
  return rejectHelper(supabase, params)
}

