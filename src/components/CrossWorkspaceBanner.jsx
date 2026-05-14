/**
 * CrossWorkspaceBanner — shows a sticky warning strip below the topbar when
 * a super-admin's active workspace is NOT one they are a regular member of.
 *
 * This is a guardrail: during support sessions the super-admin may switch
 * (or be granted temporary visibility into) another tenant's workspace. The
 * banner ensures they never confuse it with their own data.
 *
 * Renders nothing for regular users.
 */
import { useTranslation } from 'react-i18next'
import { AlertTriangle } from 'lucide-react'
import { useIsSuperAdmin } from '../hooks/useIsSuperAdmin'
import { useWorkspace } from '../contexts/WorkspaceContext'

export default function CrossWorkspaceBanner() {
  const { t } = useTranslation()
  const { isSuperAdmin, loading } = useIsSuperAdmin()
  const { activeOrgId, memberships } = useWorkspace()

  if (loading || !isSuperAdmin || !activeOrgId) return null

  const isMember = (memberships || []).some((m) => m.org_id === activeOrgId)
  if (isMember) return null

  // Try to surface the org name from memberships fallback (if cached) else id.
  const orgName = (memberships || []).find((m) => m.org_id === activeOrgId)?.orgs?.name
    || activeOrgId.slice(0, 8) + '…'

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'sticky',
        top: 'var(--topbar-h, 56px)',
        zIndex: 150,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '8px 16px',
        background: 'rgba(240, 180, 41, 0.14)',
        borderBottom: '1px solid rgba(240, 180, 41, 0.42)',
        color: 'var(--text-1)',
        fontSize: 13,
        fontWeight: 500,
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
    >
      <AlertTriangle size={16} style={{ color: 'var(--warning-1, #F0B429)', flexShrink: 0 }} />
      <span>
        <strong style={{ fontWeight: 700 }}>{t('crossWorkspace.label')}:</strong>{' '}
        {t('crossWorkspace.message', { workspace: orgName })}
      </span>
    </div>
  )
}
