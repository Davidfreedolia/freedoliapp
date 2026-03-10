/**
 * D58.1 — Operator UI permissions for automation.
 *
 * @param {string} userRole - owner | admin | member
 */
export function useAutomationPermissions(userRole) {
  const role = (userRole || 'member').toString()
  const isOwner = role === 'owner'
  const isAdmin = role === 'admin'
  const canView = true
  const canApprove = isOwner || isAdmin
  const canReject = isOwner || isAdmin
  const canExecute = isOwner || isAdmin

  return { canView, canApprove, canReject, canExecute }
}

