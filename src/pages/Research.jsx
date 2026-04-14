import { useEffect, useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Sparkles, Clock, Search, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useApp } from '../context/AppContext'
import Button from '../components/Button'
import ResearchWizard from '../components/research/ResearchWizard'
import ResearchReport from '../components/research/ResearchReport'

export default function Research() {
  const { t } = useTranslation()
  const { activeOrgId, darkMode } = useApp()

  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(false)
  const [wizardOpen, setWizardOpen] = useState(false)
  const [selected, setSelected] = useState(null)
  const [searchText, setSearchText] = useState('')
  const [error, setError] = useState(null)

  const loadReports = async () => {
    if (!activeOrgId) return
    setLoading(true)
    setError(null)
    try {
      const { data, error: err } = await supabase
        .from('research_reports')
        .select('id, input_asin, input_description, marketplace, viability_score, recommendation, ai_analysis, sources_used, created_at')
        .eq('org_id', activeOrgId)
        .order('created_at', { ascending: false })
        .limit(50)
      if (err) throw err
      setReports(data ?? [])
    } catch (err) {
      setError(err.message ?? String(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadReports() }, [activeOrgId])

  const filtered = useMemo(() => {
    const q = searchText.trim().toLowerCase()
    if (!q) return reports
    return reports.filter((r) =>
      (r.input_asin || '').toLowerCase().includes(q) ||
      (r.input_description || '').toLowerCase().includes(q) ||
      (r.marketplace || '').toLowerCase().includes(q)
    )
  }, [reports, searchText])

  const handleDelete = async (id) => {
    if (!confirm(t('research.confirmDelete', 'Vols eliminar aquest informe?'))) return
    const { error: err } = await supabase.from('research_reports').delete().eq('id', id)
    if (!err) {
      setReports((prev) => prev.filter((r) => r.id !== id))
      if (selected?.id === id) setSelected(null)
    }
  }

  const scoreBadge = (score) => {
    const s = Number(score ?? 0)
    const color = s >= 70 ? 'var(--success-1,#3FBF9A)' : s >= 40 ? 'var(--warning-1,#F2D94E)' : 'var(--danger-1,#F26C6C)'
    return (
      <span style={{
        display: 'inline-block', minWidth: 36, padding: '2px 8px',
        borderRadius: 6, backgroundColor: `${color}22`, color, fontWeight: 700, fontSize: 12, textAlign: 'center',
      }}>
        {s}
      </span>
    )
  }

  const muted = darkMode ? '#9aa1b4' : '#6b7280'
  const ink = darkMode ? '#e6e9f2' : '#1f2937'
  const borderColor = darkMode ? '#2a2a3a' : 'rgba(31,95,99,0.14)'
  const cardBg = darkMode ? '#1b1b2a' : '#ffffff'

  return (
    <div style={{ padding: '20px 24px', color: ink }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Sparkles size={20} color="var(--brand-1,#1F5F63)" />
            {t('research.page.title', 'Recerca IA')}
          </h1>
          <p style={{ margin: '4px 0 0', color: muted, fontSize: 13 }}>
            {t('research.page.subtitle', 'Anàlisi de viabilitat amb dades reals de mercat i proveïdors.')}
          </p>
        </div>
        <Button variant="primary" onClick={() => setWizardOpen(true)}>
          <Sparkles size={14} style={{ marginRight: 6 }} />
          {t('research.page.newAnalysis', 'Nova anàlisi')}
        </Button>
      </div>

      {/* Search */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 12px', borderRadius: 10,
        border: `1px solid ${borderColor}`, backgroundColor: cardBg, marginBottom: 16,
      }}>
        <Search size={16} color={muted} />
        <input
          type="text"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          placeholder={t('research.page.searchPlaceholder', 'Cerca per ASIN, descripció o marketplace…')}
          style={{
            flex: 1, border: 'none', background: 'transparent', color: ink,
            fontSize: 14, outline: 'none', fontFamily: 'inherit',
          }}
        />
      </div>

      {error && (
        <div style={{
          padding: '10px 12px', borderRadius: 8, marginBottom: 12,
          backgroundColor: 'rgba(242,108,108,0.14)', color: '#c94545', fontSize: 13,
        }}>{error}</div>
      )}

      {/* Layout: list + detail */}
      <div style={{ display: 'grid', gridTemplateColumns: selected ? '320px 1fr' : '1fr', gap: 16 }}>
        <div>
          {loading && <div style={{ color: muted, fontSize: 13 }}>{t('common.loading', 'Carregant…')}</div>}
          {!loading && filtered.length === 0 && (
            <div style={{
              padding: 24, border: `1px dashed ${borderColor}`, borderRadius: 12,
              textAlign: 'center', color: muted, fontSize: 14, backgroundColor: cardBg,
            }}>
              {t('research.page.empty', 'Encara no hi ha informes. Crea el primer amb «Nova anàlisi».')}
            </div>
          )}
          {!loading && filtered.length > 0 && (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {filtered.map((r) => (
                <li
                  key={r.id}
                  onClick={() => setSelected(r)}
                  style={{
                    padding: 12, borderRadius: 10, cursor: 'pointer',
                    border: `1px solid ${selected?.id === r.id ? 'var(--brand-1,#1F5F63)' : borderColor}`,
                    backgroundColor: cardBg, transition: 'border-color 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    {scoreBadge(r.viability_score)}
                    <strong style={{ fontSize: 13, color: ink, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r.input_asin || r.input_description?.substring(0, 40) || '—'}
                    </strong>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(r.id) }}
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 4, color: muted }}
                      aria-label={t('common.delete', 'Elimina')}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div style={{ fontSize: 11, color: muted, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Clock size={11} />
                    {new Date(r.created_at).toLocaleString()}
                    <span>• {r.marketplace}</span>
                    {r.recommendation && <span>• {r.recommendation}</span>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {selected && (
          <div>
            <ResearchReport
              report={selected.ai_analysis}
              meta={{
                asin: selected.input_asin,
                description: selected.input_description,
                marketplace: selected.marketplace,
                sources_used: selected.sources_used,
                report_id: selected.id,
              }}
              darkMode={darkMode}
            />
          </div>
        )}
      </div>

      <ResearchWizard
        isOpen={wizardOpen}
        onClose={() => setWizardOpen(false)}
        darkMode={darkMode}
        onCompleted={() => { loadReports() }}
      />
    </div>
  )
}
