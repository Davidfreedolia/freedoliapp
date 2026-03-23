import { AlertCircle } from 'lucide-react'
import Button from '../../../components/Button'

const bannerStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  padding: '12px 16px',
  borderRadius: '10px',
  border: '2px solid',
  marginBottom: '18px'
}
const restoreButtonStyle = {
  padding: '10px 20px',
  backgroundColor: '#4f46e5',
  color: '#ffffff',
  border: 'none',
  borderRadius: '8px',
  fontSize: '14px',
  fontWeight: '500',
  cursor: 'pointer'
}

/**
 * Banner shown when project has been discarded; includes restore action.
 */
export default function ProjectDetailDiscardedBanner({ project, darkMode, onRestore, t }) {
  if (project?.decision !== 'DISCARDED') return null
  return (
    <div
      className="project-detail-discarded"
      style={{
        ...bannerStyle,
        backgroundColor: darkMode ? '#7f1d1d' : '#fef2f2',
        borderColor: '#ef4444'
      }}
    >
      <AlertCircle className="project-detail-discarded__icon" size={20} color="#ef4444" />
      <div className="project-detail-discarded__copy" style={{ flex: 1 }}>
        <strong className="project-detail-discarded__title" style={{ color: '#ef4444', display: 'block', marginBottom: '4px' }}>
          Aquest projecte ha estat descartat
        </strong>
        <span className="project-detail-discarded__text" style={{ color: darkMode ? '#fca5a5' : '#991b1b', fontSize: '13px' }}>
          {project.discarded_reason || 'No s\'ha proporcionat una raó.'}
          {project.discarded_at && (
            <span className="project-detail-discarded__date" style={{ display: 'block', marginTop: '4px' }}>
              Data: {new Date(project.discarded_at).toLocaleDateString('ca-ES')}
            </span>
          )}
        </span>
      </div>
      <Button
        variant="primary"
        size="sm"
        onClick={onRestore}
        className="project-detail-discarded__action"
        style={restoreButtonStyle}
      >
        {t ? t('common.restore') : 'Restaurar'} Projecte
      </Button>
    </div>
  )
}
