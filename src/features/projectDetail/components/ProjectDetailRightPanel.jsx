import { Suspense, lazy } from 'react'
import Button from '../../../components/Button'
import ProjectDriveExplorer from '../../../components/projects/ProjectDriveExplorer'
import ProjectDetailLifecycleEventsBlock from './ProjectDetailLifecycleEventsBlock'

const ProjectEventsTimeline = lazy(() => import('../../../components/ProjectEventsTimeline'))

/**
 * Right sticky panel: project title, drive explorer, events timeline. Optional research import info.
 */
export default function ProjectDetailRightPanel({
  projectTitle,
  activeFolderLabel,
  researchImport,
  onCopyResearchPayload,
  projectId,
  darkMode,
  onUploadComplete,
  onActivePathChange,
  phaseId,
  project,
  eventsRefreshToken,
  currentPhase
}) {
  return (
    <aside className="project-split__right">
      <div className="project-split__sticky project-detail-rightpanel">
        <div className="projects-split__panel projects-split__panel--drive project-detail-rightpanel__files">
          <div className="projects-split__panelHeader" style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
            <div style={{ minWidth: 0 }}>
              <div className="projects-panel__title">{projectTitle}</div>
              <div className="projects-panel__subtitle">{activeFolderLabel || '—'}</div>
            </div>
          </div>
          {researchImport && (
            <div style={{ padding: '6px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <div style={{ fontSize: 13, color: 'var(--muted-1)' }}>
                Informe: <strong style={{ color: 'var(--text-1)' }}>{researchImport.asin}</strong> · {researchImport.decision}
              </div>
              <Button variant="ghost" size="sm" onClick={onCopyResearchPayload}>
                Copiar payload
              </Button>
            </div>
          )}
          <ProjectDriveExplorer
            projectId={projectId}
            darkMode={darkMode}
            onUploadComplete={onUploadComplete}
            onActivePathChange={onActivePathChange}
            fixedFolderId={phaseId === 1 ? `projects/${projectId}/research/` : null}
          />
        </div>
        <details className="project-detail-activity" open={false}>
          <summary className="project-detail-activity__summary">
            <span className="project-detail-activity__title">Activitat i timeline</span>
            <span className="project-detail-activity__meta">Secundari</span>
          </summary>
          <div className="project-detail-activity__content">
            <ProjectDetailLifecycleEventsBlock projectId={projectId} />
            <Suspense fallback={<div className="project-detail-activity__loading" style={{ padding: 8, fontSize: 12, color: 'var(--muted-1)' }}>Carregant timeline…</div>}>
              <ProjectEventsTimeline
                projectId={projectId}
                projectStatus={project?.status}
                darkMode={darkMode}
                phaseStyle={currentPhase}
                refreshToken={eventsRefreshToken}
              />
            </Suspense>
          </div>
        </details>
      </div>
    </aside>
  )
}
