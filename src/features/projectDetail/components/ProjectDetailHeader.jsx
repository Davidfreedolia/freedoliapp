import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Package } from 'lucide-react'
import MarketplaceTag, { MarketplaceTagGroup } from '../../../components/MarketplaceTag'
import StatusBadge from '../../../components/StatusBadge'
import PhaseMark from '../../../components/Phase/PhaseMark'
import { getPhaseMeta } from '../../../utils/phaseStyles'
import { getProjectNextDecision } from '../../../lib/decisions/getProjectNextDecision'

const NEXT_ACTION_LABELS = {
  lifecycle_phase: 'Verify next operational step',
  review_launch_readiness: 'Review launch readiness',
  review_reorder: 'Review reorder need'
}

function getNextActionLabel(decision) {
  if (!decision) return ''
  return NEXT_ACTION_LABELS[decision.decision_type] ?? decision.title ?? 'Next action'
}

/**
 * Resolve where the next action should go. Prefer in-page scroll when possible; else existing app routes.
 * @param {object} decision - { decision_type, ... }
 * @param {number} [currentPhase] - project.current_phase
 * @returns {{ type: 'scroll', phaseId: number } | { type: 'navigate', path: string } | null}
 */
function getNextActionTarget(decision, currentPhase) {
  if (!decision?.decision_type) return { type: 'navigate', path: '/app/decisions' }
  switch (decision.decision_type) {
    case 'review_reorder':
      return { type: 'navigate', path: '/app/inventory' }
    case 'review_launch_readiness':
      return { type: 'scroll', phaseId: 6 }
    case 'lifecycle_phase':
      if (currentPhase != null && currentPhase >= 1 && currentPhase <= 7) {
        return { type: 'scroll', phaseId: currentPhase }
      }
      return { type: 'navigate', path: '/app/decisions' }
    default:
      return { type: 'navigate', path: '/app/decisions' }
  }
}

/**
 * Legacy project header card: thumb, title, meta, marketplaces, status, business/stock snapshot, phase progress.
 * Used below the new shell (ProjectHeader + ProjectPhaseChecklist + ProjectTabs).
 */
export default function ProjectDetailHeader({
  project,
  effectiveThumbUrl,
  marketplaceTags,
  businessSnapshot,
  stockSnapshot,
  projectState,
  phaseLabel,
  darkMode,
  onScrollToPhase
}) {
  const navigate = useNavigate()
  const [nextDecision, setNextDecision] = useState(null)
  const cur = project?.current_phase || 0

  const handleNextActionClick = useCallback(() => {
    if (!nextDecision) return
    const target = getNextActionTarget(nextDecision, project?.current_phase)
    if (!target) return
    if (target.type === 'scroll' && typeof onScrollToPhase === 'function') {
      onScrollToPhase(target.phaseId)
    } else if (target.type === 'navigate' && target.path) {
      navigate(target.path)
    } else if (target.type === 'scroll') {
      navigate('/app/decisions')
    }
  }, [nextDecision, project?.current_phase, onScrollToPhase, navigate])

  useEffect(() => {
    const orgId = project?.org_id
    const projectId = project?.id
    if (!orgId || !projectId) {
      setNextDecision(null)
      return
    }
    let cancelled = false
    getProjectNextDecision({ orgId, projectId })
      .then((d) => {
        if (!cancelled && d) setNextDecision(d)
        else if (!cancelled) setNextDecision(null)
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [project?.org_id, project?.id])
  const ratio = projectState?.progress_ratio
  const pct = ratio != null && Number.isFinite(ratio)
    ? Math.max(0, Math.min(100, Math.round(ratio <= 1 ? ratio * 100 : ratio)))
    : Math.max(0, Math.min(100, Math.round((cur / 7) * 100)))
  const meta = getPhaseMeta(cur)
  const isBlocked = !!projectState?.is_blocked
  const blockedReason = (projectState?.blocked_reason ?? '').toString().trim()
  const tags = marketplaceTags || [{ marketplace_code: 'ES', is_primary: true, stock_state: 'none' }]

  return (
    <div
      className="project-header project-header--canon ui-card"
      style={{
        display: 'flex',
        alignItems: 'stretch',
        justifyContent: 'space-between',
        gap: 8,
        padding: '12px 16px',
        marginBottom: 8,
        background: 'var(--surface-bg)',
        borderRadius: 'var(--radius-ui)',
        width: '100%',
        boxSizing: 'border-box'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
        <div
          className="project-header__thumb"
          style={{
            width: 48,
            minWidth: 48,
            height: 48,
            borderRadius: 10,
            overflow: 'hidden',
            flex: '0 0 auto',
            background: 'var(--surface-bg-2)',
            border: '1px solid var(--border-1)',
            display: 'grid',
            placeItems: 'center'
          }}
          aria-label="Project thumbnail"
        >
          {effectiveThumbUrl ? (
            <img
              src={effectiveThumbUrl}
              alt=""
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              loading="lazy"
              onError={(e) => { e.currentTarget.style.display = 'none' }}
            />
          ) : (
            <Package size={18} color="var(--muted-1)" />
          )}
        </div>
        <div className="project-header__main" style={{ minWidth: 0 }}>
          <h2 style={{ margin: 0, lineHeight: 1.3 }}>{project.name}</h2>
          <div className="project-header__meta" style={{ marginTop: 0, opacity: 0.8 }}>
            <strong>{project.project_code}</strong>
            <span style={{ opacity: 0.6 }}> · </span>
            <span>{project.sku_internal || '—'}</span>
          </div>
          <div style={{ marginTop: 5 }}>
            <div className="project-card__marketplaces">
              <span className="project-card__marketplacesLabel">Marketplaces actius</span>
              <div className="project-card__marketplacesTags">
                <MarketplaceTagGroup>
                  {tags.map((m) => (
                    <MarketplaceTag
                      key={`${m.marketplace_code}-${m.is_primary ? 'p' : 's'}`}
                      code={m.marketplace_code}
                      isPrimary={!!m.is_primary}
                      stockState={m.stock_state || 'none'}
                    />
                  ))}
                </MarketplaceTagGroup>
              </div>
            </div>
          </div>
          {nextDecision && (() => {
            const target = getNextActionTarget(nextDecision, project?.current_phase)
            const hasTarget = !!target
            const blockStyle = {
              marginTop: 8,
              padding: '6px 10px',
              background: 'var(--surface-bg-2, #f3f4f6)',
              border: '1px solid var(--border-subtle, var(--border-1, #e5e7eb))',
              borderRadius: 8,
              fontSize: 12,
              color: 'var(--text-1, #111827)',
              ...(hasTarget ? { cursor: 'pointer', transition: 'border-color 0.15s ease' } : {})
            }
            return (
              <div
                role={hasTarget ? 'button' : undefined}
                tabIndex={hasTarget ? 0 : undefined}
                onClick={hasTarget ? handleNextActionClick : undefined}
                onKeyDown={hasTarget ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleNextActionClick() } } : undefined}
                style={blockStyle}
                title={hasTarget ? (target?.type === 'scroll' ? 'Anar a la secció' : 'Obrir') : undefined}
                onMouseEnter={hasTarget ? (e) => { e.currentTarget.style.borderColor = 'var(--border-1, #d1d5db)' } : undefined}
                onMouseLeave={hasTarget ? (e) => { e.currentTarget.style.borderColor = '' } : undefined}
              >
                <span style={{ color: 'var(--muted-1, #6b7280)', marginRight: 6 }}>Next action</span>
                <span style={{ fontWeight: 500 }}>{getNextActionLabel(nextDecision)}</span>
              </div>
            )
          })()}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <StatusBadge status={project.status} decision={project.decision} />
        </div>
        {businessSnapshot && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2, minWidth: 0 }}>
            <span
              style={{
                fontSize: 12,
                padding: '4px 8px',
                border: '1px solid var(--border-1)',
                background: 'var(--surface-bg-2)',
                borderRadius: 999,
                color: businessSnapshot.badge.tone === 'success' ? 'var(--success-1)' : businessSnapshot.badge.tone === 'warn' ? 'var(--warning-1)' : businessSnapshot.badge.tone === 'danger' ? 'var(--danger-1)' : 'var(--muted-1)',
                fontWeight: 600,
                whiteSpace: 'nowrap'
              }}
            >
              {businessSnapshot.roi_percent != null ? `ROI ${Math.round(businessSnapshot.roi_percent)}% · ${businessSnapshot.badge.label}` : `— · ${businessSnapshot.badge.label}`}
            </span>
            <span style={{ fontSize: 11, color: 'var(--muted-1)' }}>
              Inv: €{businessSnapshot.invested_total.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              {' · Unit: '}
              {businessSnapshot.unit_cost != null ? `€${businessSnapshot.unit_cost.toFixed(2)}` : '—'}
              {' · BE: '}
              {businessSnapshot.breakeven_units != null ? `${Math.round(businessSnapshot.breakeven_units)}u` : '—'}
            </span>
          </div>
        )}
        {stockSnapshot && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2, minWidth: 0 }}>
            <span
              style={{
                fontSize: 12,
                padding: '4px 8px',
                border: '1px solid var(--border-1)',
                background: 'var(--surface-bg-2)',
                borderRadius: 999,
                color: stockSnapshot.tone === 'success' ? 'var(--success-1)' : stockSnapshot.tone === 'warn' ? 'var(--warning-1)' : stockSnapshot.tone === 'danger' ? 'var(--danger-1)' : 'var(--muted-1)',
                fontWeight: 600,
                whiteSpace: 'nowrap'
              }}
            >
              {stockSnapshot.badgeTextPrimary}
            </span>
            <span style={{ fontSize: 11, color: 'var(--muted-1)' }}>
              {stockSnapshot.badgeTextSecondary}
            </span>
          </div>
        )}
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, opacity: 0.8, marginBottom: 4 }}>
            <span>{phaseLabel}</span>
            <span>{project.current_phase}/7 · {pct}%</span>
          </div>
          <div
            style={{
              width: '100%',
              height: 5,
              borderRadius: 999,
              background: 'var(--surface-bg-2)',
              border: '1px solid var(--border-1)',
              overflow: 'hidden'
            }}
            data-progress-track="true"
          >
            <div
              style={{
                height: '100%',
                width: `${pct}%`,
                borderRadius: 999,
                background: meta.color
              }}
              data-progress-fill="true"
              data-phase-id={cur}
            />
          </div>
          {isBlocked && (
            <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
              <span
                style={{
                  fontSize: 12,
                  padding: '4px 8px',
                  border: '1px solid var(--danger-1)',
                  background: 'var(--surface-bg-2)',
                  borderRadius: 999,
                  color: 'var(--danger-1)',
                  fontWeight: 600,
                  whiteSpace: 'nowrap'
                }}
              >
                BLOCKED
              </span>
              {blockedReason ? (
                <div
                  style={{
                    fontSize: 11,
                    color: 'var(--text-secondary)',
                    maxWidth: '100%',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}
                  title={blockedReason}
                >
                  {blockedReason}
                </div>
              ) : null}
            </div>
          )}
          <div style={{ marginTop: 6, overflowX: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'nowrap', minWidth: 'max-content' }}>
              {[1, 2, 3, 4, 5, 6, 7].map((phaseId, idx) => {
                const isDone = cur > phaseId
                return (
                  <div key={phaseId} style={{ display: 'flex', alignItems: 'center', gap: 8, flex: idx === 6 ? '0 0 auto' : '1 1 auto' }}>
                    <span
                      title={getPhaseMeta(phaseId).label}
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 999,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'var(--surface-bg)',
                        border: '1px solid var(--border-1)'
                      }}
                    >
                      <PhaseMark phaseId={phaseId} size={16} showLabel={false} />
                    </span>
                    {idx < 6 ? (
                      <span
                        aria-hidden="true"
                        style={{
                          height: 2,
                          flex: 1,
                          borderRadius: 999,
                          background: isDone ? 'var(--success-1)' : 'var(--border-1)',
                          opacity: isDone ? 0.9 : 0.6
                        }}
                      />
                    ) : null}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
