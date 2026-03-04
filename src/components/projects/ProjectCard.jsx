import React from 'react'
import { useNavigate } from 'react-router-dom'
import Card from '../ui/Card'
import Badge from '../ui/Badge'
import Button from '../ui/Button'
import ProjectMiniPipeline from './ProjectMiniPipeline'
import ProjectNextAction from './ProjectNextAction'
import useT from '../../hooks/useT'

/**
 * F8.3.3 — Targeta premium de projecte/producte per llistat de `/app/projects`.
 */
export default function ProjectCard({ project }) {
  const t = useT()
  const navigate = useNavigate()

  const title = project?.name || '—'

  const asin =
    project?.asin ||
    project?.asin_code ||
    project?.amazon_asin ||
    project?.asin_id ||
    project?.main_asin ||
    null

  const thumbnailUrl =
    project?.main_image_url ||
    project?.asin_image_url ||
    project?.asin_image ||
    project?.image_url ||
    project?.image ||
    null

  const marketplacesArray = Array.isArray(project?.marketplace_tags)
    ? project.marketplace_tags
    : Array.isArray(project?.marketplaces)
      ? project.marketplaces
      : Array.isArray(project?.marketplace_codes)
        ? project.marketplace_codes
        : project?.marketplace
          ? [project.marketplace]
          : []

  const activeMarketplaces = marketplacesArray.filter((m) =>
    typeof m === 'object' ? m.is_active !== false : true
  )

  const phaseId = project?.phase ?? project?.phase_id ?? project?.current_phase ?? 1

  const initials = (title || '')
    .toString()
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()

  const handleOpenDetails = (e) => {
    e.stopPropagation()
    if (project?.id) {
      navigate(`/app/projects/${project.id}`)
    }
  }

  const handleCardClick = () => {
    if (project?.id) {
      navigate(`/app/projects/${project.id}`)
    }
  }

  return (
    <Card className="project-card" onClick={handleCardClick}>
      <div className="project-card__media">
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={asin ? `ASIN ${asin}` : title}
            className="project-card__mediaImg"
          />
        ) : (
          <div className="project-card__mediaPlaceholder">
            <span className="project-card__mediaInitials">
              {initials || 'P'}
            </span>
          </div>
        )}
      </div>
      <div className="project-card__body">
        <div className="project-card__titleRow">
          <div className="project-card__titleBlock">
            <h3 className="project-card__title">{title}</h3>
            {project?.sku && (
              <div className="project-card__subtitle">
                {project.sku}
              </div>
            )}
          </div>
          {asin && (
            <Badge variant="neutral">
              {t('projects.badges.asin')} {asin}
            </Badge>
          )}
        </div>

        {activeMarketplaces?.length ? (
          <div className="project-card__badges">
            {activeMarketplaces.map((m, index) => {
              const code =
                typeof m === 'string'
                  ? m
                  : m.marketplace_code || m.code || m.marketplace
              if (!code) return null
              return (
                <span
                  key={`${code}-${index}`}
                  className="project-card__badge"
                >
                  {code}
                </span>
              )
            })}
          </div>
        ) : null}

        <div className="project-card__pipelineRow">
          <ProjectMiniPipeline phase={phaseId} />
        </div>

        <div className="project-card__footer">
          <ProjectNextAction project={project} />
          <Button
            variant="ghost"
            size="sm"
            onClick={handleOpenDetails}
          >
            {t('common.buttons.details')}
          </Button>
        </div>
      </div>
    </Card>
  )
}

