import { useEffect, useMemo, useRef, useState, lazy, Suspense } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, AlertCircle } from 'lucide-react'
import Header from '../components/Header'
import PageGutter from '../components/ui/PageGutter'
import PhasePanel from '../components/projects/PhasePanel'
import PhaseContent from '../components/projects/PhaseContent'
import { getProject, updateProject } from '../lib/supabase'
import { PHASE_META } from '../utils/phaseStyles'

const ResearchWizard = lazy(() => import('../components/research/ResearchWizard'))

/**
 * Whitelist of project columns we are confident exist in the projects table
 * (verified against supabase/migrations/*.sql). Phase forms write to many more
 * fields conceptually — anything not on this list is held in local state only,
 * keeping the UX functional without requiring a schema migration in this commit.
 */
const SAFE_COLUMNS = new Set([
  'name',
  'sku',
  'sku_internal',
  'asin',
  'product_url',
  'description',
  'notes',
  'viability_notes',
  'decision',
  'status',
  'current_phase',
  'phase'
])

const getCurrentPhaseId = (project) => {
  if (!project) return 1
  const fromCurrent = Number(project.current_phase)
  if (Number.isFinite(fromCurrent) && fromCurrent >= 1 && fromCurrent <= 7) return fromCurrent
  const fromPhase = Number(project.phase)
  if (Number.isFinite(fromPhase) && fromPhase >= 1 && fromPhase <= 7) return fromPhase
  return 1
}

export default function ProjectDetailImpl() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [project, setProject] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activePhase, setActivePhase] = useState(1)
  const [lockedToast, setLockedToast] = useState(null)
  const [researchOpen, setResearchOpen] = useState(false)
  // Local-only patch held over the project for fields outside SAFE_COLUMNS.
  const [localPatch, setLocalPatch] = useState({})
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    setLocalPatch({})
    getProject(id)
      .then((row) => {
        if (cancelled) return
        if (!row) {
          setError('No s’ha trobat el projecte.')
          setProject(null)
        } else {
          setProject(row)
          setActivePhase(getCurrentPhaseId(row))
        }
      })
      .catch((err) => {
        if (cancelled) return
        setError(err?.message || 'Error carregant el projecte.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [id])

  const merged = useMemo(() => ({ ...(project || {}), ...localPatch }), [project, localPatch])
  const currentPhase = getCurrentPhaseId(merged)

  const handleSelect = (phaseId) => setActivePhase(phaseId)

  const handleLockedAttempt = (targetId, currId) => {
    const meta = PHASE_META[currId]
    setLockedToast(`Completa primer la fase de ${meta?.label || `#${currId}`} per accedir a ${PHASE_META[targetId]?.label || `#${targetId}`}.`)
    window.clearTimeout(handleLockedAttempt._t)
    handleLockedAttempt._t = window.setTimeout(() => {
      if (mountedRef.current) setLockedToast(null)
    }, 3500)
  }

  const handleUpdate = async (patch) => {
    if (!patch || typeof patch !== 'object') return
    // Optimistic local merge for ALL keys.
    setLocalPatch((prev) => ({ ...prev, ...patch }))
    // Send only the safe ones to Supabase.
    const persistable = {}
    for (const [k, v] of Object.entries(patch)) {
      if (SAFE_COLUMNS.has(k)) persistable[k] = v
    }
    if (Object.keys(persistable).length === 0) return
    try {
      const updated = await updateProject(id, persistable)
      if (!mountedRef.current) return
      if (updated) setProject((p) => ({ ...(p || {}), ...updated }))
    } catch (err) {
      console.warn('updateProject failed:', err?.message || err)
    }
  }

  const handleAdvance = async () => {
    const next = Math.min(7, currentPhase + 1)
    if (next === currentPhase) return
    await handleUpdate({ current_phase: next, phase: next })
    setActivePhase(next)
  }

  if (loading) {
    return (
      <>
        <Header />
        <PageGutter>
          <div style={{ padding: 48, color: 'var(--text-2)' }}>Carregant projecte…</div>
        </PageGutter>
      </>
    )
  }

  if (error || !project) {
    return (
      <>
        <Header />
        <PageGutter>
          <div style={{
            margin: '24px 0',
            padding: 16,
            border: '1px solid var(--danger, #dc2626)',
            borderRadius: 10,
            background: 'var(--danger-bg, #dc262611)',
            color: 'var(--danger, #dc2626)',
            display: 'flex',
            alignItems: 'center',
            gap: 10
          }}>
            <AlertCircle size={18} />
            {error || 'No s’ha trobat el projecte.'}
          </div>
          <button type="button" onClick={() => navigate('/projects')} style={backLinkStyle}>
            <ArrowLeft size={16} /> Tornar a Projectes
          </button>
        </PageGutter>
      </>
    )
  }

  return (
    <>
      <Header />
      <PageGutter>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '16px 0 20px' }}>
          <button type="button" onClick={() => navigate('/projects')} style={backLinkStyle}>
            <ArrowLeft size={16} /> Projectes
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{
              margin: 0,
              fontSize: 22,
              fontWeight: 700,
              color: 'var(--text-1)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
              {merged.name || 'Projecte sense nom'}
            </h1>
            <div style={{ fontSize: 13, color: 'var(--text-2)' }}>
              {merged.code || merged.project_code || ''}
              {merged.sku ? ` · SKU ${merged.sku}` : ''}
              {merged.asin ? ` · ASIN ${merged.asin}` : ''}
            </div>
          </div>
        </div>

        {lockedToast && (
          <div role="status" style={{
            margin: '0 0 16px',
            padding: '10px 14px',
            border: '1px solid var(--warning, #d97706)',
            borderRadius: 10,
            background: 'var(--warning-bg, #d9770611)',
            color: 'var(--warning, #d97706)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 13,
            fontWeight: 600
          }}>
            <AlertCircle size={16} /> {lockedToast}
          </div>
        )}

        <div
          className="project-detail-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(280px, 30%) 1fr',
            gap: 20,
            alignItems: 'start',
            paddingBottom: 32
          }}
        >
          <PhasePanel
            currentPhase={currentPhase}
            activePhase={activePhase}
            onSelect={handleSelect}
            onLockedAttempt={handleLockedAttempt}
          />
          <PhaseContent
            project={merged}
            activePhase={activePhase}
            onAdvance={handleAdvance}
            onUpdateProject={handleUpdate}
            onOpenResearchWizard={() => setResearchOpen(true)}
          />
        </div>
      </PageGutter>

      {researchOpen && (
        <Suspense fallback={null}>
          <ResearchWizard
            isOpen={researchOpen}
            onClose={() => setResearchOpen(false)}
            initialAsin={merged.asin || ''}
            initialDescription={merged.description || merged.name || ''}
            projectId={merged.id}
          />
        </Suspense>
      )}

      <style>{`
        @media (max-width: 900px) {
          .project-detail-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </>
  )
}

const backLinkStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '8px 12px',
  background: 'var(--surface-bg)',
  border: '1px solid var(--border-1)',
  borderRadius: 8,
  color: 'var(--text-1)',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
  textDecoration: 'none'
}
