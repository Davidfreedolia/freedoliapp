import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
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
  marketplaceTags,
  businessSnapshot,
  stockSnapshot,
  projectState,
  phaseLabel,
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
    <div className="project-detail-summary ui-card">
      <div className="project-detail-summary__header">
        <div className="project-detail-summary__intro">
          <div className="project-detail-summary__eyebrow">Project summary</div>
          <div className="project-detail-summary__statusRow">
            <StatusBadge status={project.status} decision={project.decision} />
            <span className="project-detail-summary__phaseTag">{phaseLabel}</span>
            {isBlocked ? <span className="project-detail-summary__blockedTag">Blocked</span> : null}
          </div>
          {tags?.length ? (
            <div className="project-detail-summary__marketplaces">
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
          ) : null}
          {nextDecision && (() => {
            const target = getNextActionTarget(nextDecision, project?.current_phase)
            const hasTarget = !!target
            return (
              <div
                role={hasTarget ? 'button' : undefined}
                tabIndex={hasTarget ? 0 : undefined}
                onClick={hasTarget ? handleNextActionClick : undefined}
                onKeyDown={hasTarget ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleNextActionClick() } } : undefined}
                className={`project-detail-summary__nextAction${hasTarget ? ' is-clickable' : ''}`}
                title={hasTarget ? (target?.type === 'scroll' ? 'Anar a la secció' : 'Obrir') : undefined}
              >
                <span className="project-detail-summary__nextActionLabel">Next action</span>
                <span className="project-detail-summary__nextActionValue">{getNextActionLabel(nextDecision)}</span>
              </div>
            )
          })()}
          {blockedReason ? (
            <div className="project-detail-summary__blockedReason" title={blockedReason}>
              {blockedReason}
            </div>
          ) : null}
        </div>

        <div className="project-detail-summary__metrics">
          {businessSnapshot && (
            <div className="project-detail-summary__metricCard">
              <span
                className={`project-detail-summary__metricBadge project-detail-summary__metricBadge--${businessSnapshot.badge.tone || 'muted'}`}
              >
                {businessSnapshot.roi_percent != null ? `ROI ${Math.round(businessSnapshot.roi_percent)}%` : 'ROI —'}
              </span>
              <div className="project-detail-summary__metricValue">{businessSnapshot.badge.label}</div>
              <div className="project-detail-summary__metricMeta">
                Inv: EUR {businessSnapshot.invested_total.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                {' · Unit: '}
                {businessSnapshot.unit_cost != null ? `EUR ${businessSnapshot.unit_cost.toFixed(2)}` : '—'}
              </div>
            </div>
          )}

          {stockSnapshot && (
            <div className="project-detail-summary__metricCard">
              <span
                className={`project-detail-summary__metricBadge project-detail-summary__metricBadge--${stockSnapshot.tone || 'muted'}`}
              >
                {stockSnapshot.badgeTextPrimary}
              </span>
              <div className="project-detail-summary__metricValue">{stockSnapshot.badgeTextSecondary}</div>
            </div>
          )}

          <div className="project-detail-summary__progress">
            <div className="project-detail-summary__progressMeta">
              <span>{phaseLabel}</span>
              <span>{project.current_phase}/7 · {pct}%</span>
            </div>
            <div className="project-detail-summary__progressTrack" data-progress-track="true">
              <div
                className="project-detail-summary__progressFill"
                style={{ width: `${pct}%`, background: meta.color }}
                data-progress-fill="true"
                data-phase-id={cur}
              />
            </div>
            <div className="project-detail-summary__phaseRail">
              {[1, 2, 3, 4, 5, 6, 7].map((phaseId, idx) => {
                const isDone = cur > phaseId
                return (
                  <div key={phaseId} className="project-detail-summary__phaseStep">
                    <span
                      title={getPhaseMeta(phaseId).label}
                      className={`project-detail-summary__phaseDot${cur === phaseId ? ' is-current' : ''}${isDone ? ' is-done' : ''}`}
                    >
                      <PhaseMark phaseId={phaseId} size={16} showLabel={false} />
                    </span>
                    {idx < 6 ? (
                      <span
                        aria-hidden="true"
                        className={`project-detail-summary__phaseConnector${isDone ? ' is-done' : ''}`}
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
