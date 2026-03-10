import { supabase } from '../../supabase'
import { approveAutomationProposal as approveHelper } from '../../automation/approveAutomationProposal.js'

/**
 * Operator UI mutation: approve a proposal step (D57.3).
 */
export async function approveAutomationProposal(params) {
  return approveHelper(supabase, params)
}

