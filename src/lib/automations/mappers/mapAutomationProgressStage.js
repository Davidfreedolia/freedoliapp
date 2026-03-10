/**
 * Map proposal/execution state to a progress stage for the UI.
 *
 * Stages: decision → proposal → approval → execution → result
 */
export function mapAutomationProgressStage({ proposalStatus, latestExecutionStatus }) {
  const ps = (proposalStatus || '').toString()
  const es = (latestExecutionStatus || '').toString()

  if (ps === 'drafted') return 'proposal'
  if (ps === 'pending_approval') return 'approval'
  if (ps === 'approved') return 'execution'
  if (ps === 'queued_for_execution') return 'execution'
  if (ps === 'executed' || ps === 'execution_failed') return 'result'

  if (es === 'queued' || es === 'running') return 'execution'
  if (es === 'succeeded' || es === 'failed') return 'result'

  return 'proposal'
}

