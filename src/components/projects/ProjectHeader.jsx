import React from 'react'
import Card from '../ui/Card'
import Badge from '../ui/Badge'
import ProjectMiniPipeline from './ProjectMiniPipeline'
import ProjectNextAction from './ProjectNextAction'
import MarketplaceTag, { MarketplaceTagGroup } from '../MarketplaceTag'
import useT from '../../hooks/useT'

/**
 * F8.3.4 — Capçalera premium de detall de projecte.
 */
export default function ProjectHeader({ project, phase, marketplaceTags }) {
  const t = useT()

  if (!project) return null

  const title = project.name || '—'
  const projectCode = project.project_code || ''
  const sku = project.sku_internal || project.sku || ''

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

  const marketplacesArray = Array.isArray(marketplaceTags)
    ? marketplaceTags
    : []

  const activeMarketplaces = marketplacesArray.filter((m) =>
    typeof m === 'object' ? m.is_active !== false : true
  )

  const initials = (title || '')
    .toString()
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()

  const phaseId = Number(phase) || 1

  return (
    <Card className="project-header">
      <div className="project-header__top">
        <div className="project-header__main">
          <div className="project-header__media">
            {thumbnailUrl ? (
              <img
                src={thumbnailUrl}
                alt={asin ? `ASIN ${asin}` : title}
                className="project-header__mediaImg"
              />
            ) : (
              <div className="project-header__mediaPlaceholder">
                <span className="project-header__mediaInitials">
                  {initials || 'P'}
                </span>
              </div>
            )}
          </div>
          <div className="project-header__text">
            <h1 className="project-header__title">{title}</h1>
            <div className="project-header__meta">
              {projectCode && (
                <span className="project-header__metaItem">{projectCode}</span>
              )}
              {sku && (
                <span className="project-header__metaItem">SKU: {sku}</span>
              )}
            </div>
            <div className="project-header__badgesRow">
              {asin && (
                <Badge variant="neutral">
                  {t('projects.badges.asin')} {asin}
                </Badge>
              )}
              {activeMarketplaces?.length ? (
                <div className="project-header__marketplaces">
                  <MarketplaceTagGroup>
                    {activeMarketplaces.map((m) => (
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
            </div>
          </div>
        </div>
        <div className="project-header__cta">
          <ProjectNextAction project={project} size="md" />
        </div>
      </div>
      <div className="pipeline-lg">
        <ProjectMiniPipeline phase={phaseId} totalSteps={7} />
      </div>
    </Card>
  )
}

