import React, { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Camera } from 'lucide-react'
import Card from '../ui/Card'
import Badge from '../ui/Badge'
import Button from '../ui/Button'
import ProjectMiniPipeline from './ProjectMiniPipeline'
import ProjectNextAction from './ProjectNextAction'
import useT from '../../hooks/useT'
import { storageService } from '../../lib/storageService'
import { updateProject } from '../../lib/supabase'
import { supabase } from '../../lib/supabase'

/**
 * F8.3.3 — Targeta premium de projecte/producte per llistat de `/app/projects`.
 * Inclou drag & drop d'imatge directament sobre la miniatura.
 */
export default function ProjectCard({ project, onProjectUpdated }) {
  const t = useT()
  const navigate = useNavigate()
  const imgInputRef = useRef()
  const [hovering, setHovering] = useState(false)
  const [draggingImg, setDraggingImg] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [localImageUrl, setLocalImageUrl] = useState(null)

  const title = project?.name || '—'
  const projectCode = project?.project_code || null

  const asin =
    project?.asin ||
    project?.asin_code ||
    project?.amazon_asin ||
    project?.asin_id ||
    project?.main_asin ||
    null

  const thumbnailUrl =
    localImageUrl ||
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
    .toString().trim().split(/\s+/).slice(0, 2)
    .map((part) => part[0]).join('').toUpperCase()

  // ── Image upload ────────────────────────────────────────────────────────
  const handleImageFile = async (file) => {
    if (!file || !file.type.startsWith('image/') || !project?.id) return
    setUploading(true)
    try {
      // Preview optimistic local
      const reader = new FileReader()
      reader.onload = (e) => setLocalImageUrl(e.target.result)
      reader.readAsDataURL(file)

      // Upload to Supabase storage
      const path = `projects/${project.id}/listing/thumbnail.jpg`
      await storageService.uploadFile(path, file)

      // Get public URL
      const { data } = supabase.storage.from('project-files').getPublicUrl(path)
      const publicUrl = data?.publicUrl

      if (publicUrl) {
        await updateProject(project.id, { main_image_url: publicUrl })
        setLocalImageUrl(publicUrl)
        onProjectUpdated?.({ ...project, main_image_url: publicUrl })
      }
    } catch (err) {
      console.error('[ProjectCard] Image upload error:', err)
    } finally {
      setUploading(false)
    }
  }

  const handleOpenDetails = (e) => {
    e.stopPropagation()
    if (project?.id) navigate(`/app/projects/${project.id}`)
  }

  const handleCardClick = () => {
    if (project?.id) navigate(`/app/projects/${project.id}`)
  }

  return (
    <Card className="project-card project-card--workspace" onClick={handleCardClick}>
      {/* ── Media / thumbnail amb overlay d'edició ── */}
      <div
        className="project-card__media"
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => { setHovering(false); setDraggingImg(false) }}
        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDraggingImg(true) }}
        onDragLeave={() => setDraggingImg(false)}
        onDrop={(e) => {
          e.preventDefault(); e.stopPropagation()
          setDraggingImg(false)
          handleImageFile(e.dataTransfer.files[0])
        }}
        style={{ position: 'relative', cursor: 'default' }}
        onClick={(e) => e.stopPropagation()}
      >
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={asin ? `ASIN ${asin}` : title}
            className="project-card__mediaImg"
            style={{ opacity: uploading ? 0.5 : 1, transition: 'opacity 200ms' }}
            onError={(e) => { e.target.style.display = 'none' }}
          />
        ) : (
          <div
            className="project-card__mediaPlaceholder"
            style={{
              background: draggingImg ? 'rgba(110,203,195,0.12)' : undefined,
              border: draggingImg ? '2px dashed var(--c-cta-500)' : undefined
            }}
          >
            <span className="project-card__mediaInitials">{initials || 'P'}</span>
          </div>
        )}

        {/* Overlay "Canviar imatge" */}
        {(hovering || draggingImg) && (
          <div
            style={{
              position: 'absolute', inset: 0,
              background: draggingImg ? 'rgba(110,203,195,0.22)' : 'rgba(0,0,0,0.38)',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 6,
              borderRadius: 'inherit',
              transition: 'background 150ms'
            }}
          >
            {uploading ? (
              <div style={{ color: '#fff', fontSize: 12, fontWeight: 600 }}>Pujant…</div>
            ) : draggingImg ? (
              <div style={{ color: 'var(--c-cta-500)', fontSize: 12, fontWeight: 700, textAlign: 'center' }}>
                Deixa anar la imatge
              </div>
            ) : (
              <>
                <Camera size={20} color="#fff" />
                <span style={{ color: '#fff', fontSize: 11, fontWeight: 600 }}>
                  Canviar imatge
                </span>
              </>
            )}
          </div>
        )}

        {/* Botó canviar (click) */}
        {hovering && !uploading && !draggingImg && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); imgInputRef.current?.click() }}
            style={{
              position: 'absolute', inset: 0, width: '100%', height: '100%',
              background: 'transparent', border: 'none', cursor: 'pointer'
            }}
            aria-label="Canviar imatge del projecte"
          />
        )}

        <input
          ref={imgInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={(e) => handleImageFile(e.target.files[0])}
        />
      </div>

      {/* ── Cos de la targeta ── */}
      <div className="project-card__body">
        <div className="project-card__titleRow">
          <div className="project-card__titleBlock">
            {(projectCode || project?.sku) && (
              <div className="project-card__eyebrowRow">
                {projectCode ? <span className="project-card__code">{projectCode}</span> : null}
                {project?.sku ? <span className="project-card__subtitle">SKU {project.sku}</span> : null}
              </div>
            )}
            <h3 className="project-card__title">{title}</h3>
          </div>
          {asin && (
            <div className="project-card__asinBadge">
              <Badge variant="neutral">
                {t('projects.badges.asin')} {asin}
              </Badge>
            </div>
          )}
        </div>

        {activeMarketplaces?.length ? (
          <div className="project-card__badges">
            {activeMarketplaces.map((m, index) => {
              const code = typeof m === 'string' ? m : m.marketplace_code || m.code || m.marketplace
              if (!code) return null
              return <span key={`${code}-${index}`} className="project-card__badge">{code}</span>
            })}
          </div>
        ) : null}

        {/* Timeline vermell → verd */}
        <div className="project-card__pipelineRow">
          <ProjectMiniPipeline phase={phaseId} />
        </div>

        <div className="project-card__footer">
          <div className="project-card__actions">
            <ProjectNextAction project={project} />
            <Button
              className="project-card__secondaryAction"
              variant="ghost"
              size="sm"
              onClick={handleOpenDetails}
            >
              {t('common.buttons.details')}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  )
}
