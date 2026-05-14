/**
 * SuperAdminBadge — discreet pill that surfaces in the topbar only when the
 * authenticated user is on the platform super-admin allowlist (currently
 * david@freedolia.com). Renders nothing for every other user.
 *
 * Purpose: a constant visual cue so that, during cross-tenant support, the
 * super-admin always knows they are operating with elevated privileges.
 * Clicking the badge jumps straight to the Admin Console.
 */
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ShieldCheck } from 'lucide-react'
import { useIsSuperAdmin } from '../hooks/useIsSuperAdmin'

export default function SuperAdminBadge() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { isSuperAdmin, loading } = useIsSuperAdmin()

  if (loading || !isSuperAdmin) return null

  return (
    <button
      type="button"
      onClick={() => navigate('/app/admin')}
      title={t('superAdminBadge.tooltip')}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        height: 28,
        padding: '0 10px',
        borderRadius: 999,
        background: 'rgba(229, 83, 83, 0.10)',
        border: '1px solid rgba(229, 83, 83, 0.32)',
        color: 'var(--danger-1, #B0413F)',
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        cursor: 'pointer',
        transition: 'background-color 0.15s ease, transform 0.05s ease',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(229, 83, 83, 0.16)' }}
      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(229, 83, 83, 0.10)' }}
      onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.97)' }}
      onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)' }}
    >
      <ShieldCheck size={13} />
      {t('superAdminBadge.label')}
    </button>
  )
}
