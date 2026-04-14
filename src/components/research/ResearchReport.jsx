import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, CheckCircle2, XCircle, FileText, Rocket, Save } from 'lucide-react'
import jsPDF from 'jspdf'
import 'jspdf-autotable'
import Button from '../Button'

/**
 * ResearchReport — visualitza un informe de viabilitat IA (ai_analysis)
 *
 * Props:
 *   report: object { market, costs, margins, risks, viability_score, recommendation, next_steps, executive_summary }
 *   meta:   object { asin, description, marketplace, sources_used, report_id }
 *   onSaveAsBriefing?: () => void
 *   onCreateProject?: () => void
 *   darkMode?: boolean
 */
export default function ResearchReport({ report, meta = {}, onSaveAsBriefing, onCreateProject, darkMode = false }) {
  const { t } = useTranslation()

  const scoreColor = useMemo(() => {
    const s = Number(report?.viability_score ?? 0)
    if (s >= 70) return 'var(--success-1, #3FBF9A)'
    if (s >= 40) return 'var(--warning-1, #F2D94E)'
    return 'var(--danger-1, #F26C6C)'
  }, [report?.viability_score])

  const recoBadge = useMemo(() => {
    const r = (report?.recommendation || '').toLowerCase()
    if (r === 'go') return { label: t('research.reco.go', 'GO'), bg: 'rgba(63,191,154,0.18)', fg: '#2f9f7e' }
    if (r === 'no-go') return { label: t('research.reco.noGo', 'NO-GO'), bg: 'rgba(242,108,108,0.18)', fg: '#c94545' }
    return { label: t('research.reco.needsResearch', 'NECESSITA MÉS RECERCA'), bg: 'rgba(242,217,78,0.25)', fg: '#8a7318' }
  }, [report?.recommendation, t])

  const exportPDF = () => {
    const doc = new jsPDF('p', 'mm', 'a4')
    const marginL = 15
    let y = 18

    doc.setFontSize(18)
    doc.setTextColor(31, 95, 99)
    doc.text(t('research.pdf.title', 'Informe de Viabilitat — FreedoliApp'), marginL, y)
    y += 8

    doc.setFontSize(10)
    doc.setTextColor(90, 90, 90)
    if (meta.asin) { doc.text(`ASIN: ${meta.asin}`, marginL, y); y += 5 }
    if (meta.marketplace) { doc.text(`Marketplace: ${meta.marketplace}`, marginL, y); y += 5 }
    if (meta.description) { doc.text(`${t('research.pdf.desc', 'Descripció')}: ${meta.description.substring(0, 140)}`, marginL, y); y += 5 }
    y += 3

    doc.setFontSize(14)
    doc.setTextColor(0, 0, 0)
    doc.text(`${t('research.score', 'Puntuació')}: ${report?.viability_score ?? 0} / 100`, marginL, y); y += 7
    doc.setFontSize(11)
    doc.text(`${t('research.recommendation', 'Recomanació')}: ${recoBadge.label}`, marginL, y); y += 8

    if (report?.executive_summary) {
      doc.setFontSize(12)
      doc.text(t('research.executiveSummary', 'Resum executiu'), marginL, y); y += 5
      doc.setFontSize(10)
      const lines = doc.splitTextToSize(report.executive_summary, 180)
      doc.text(lines, marginL, y)
      y += lines.length * 5 + 4
    }

    if (report?.margins) {
      doc.autoTable({
        startY: y,
        head: [[t('research.margins.title', 'Escenari'), t('research.margins.price', 'Preu venda'), t('research.margins.cost', 'Cost'), t('research.margins.net', 'Marge net %')]],
        body: ['optimistic', 'realistic', 'pessimistic'].map((k) => {
          const r = report.margins[k] || {}
          return [k, r.selling_price ?? '—', r.total_cost ?? '—', r.net_margin_pct != null ? `${r.net_margin_pct}%` : '—']
        }),
        styles: { fontSize: 9 },
        headStyles: { fillColor: [31, 95, 99] },
      })
      y = (doc.lastAutoTable?.finalY ?? y) + 6
    }

    if (Array.isArray(report?.risks) && report.risks.length > 0) {
      doc.setFontSize(12)
      doc.text(t('research.risks', 'Riscos'), marginL, y); y += 5
      doc.setFontSize(9)
      report.risks.forEach((r) => {
        const line = `[${(r.severity || '').toUpperCase()}] ${r.type}: ${r.description || ''}`
        const wrapped = doc.splitTextToSize(line, 180)
        if (y + wrapped.length * 4 > 280) { doc.addPage(); y = 18 }
        doc.text(wrapped, marginL, y)
        y += wrapped.length * 4 + 2
      })
    }

    const filename = `research-${meta.asin || 'report'}-${Date.now()}.pdf`
    doc.save(filename)
  }

  const cardBg = darkMode ? '#1b1b2a' : '#ffffff'
  const borderColor = darkMode ? '#2a2a3a' : 'rgba(31,95,99,0.14)'
  const muted = darkMode ? '#9aa1b4' : '#6b7280'
  const ink = darkMode ? '#e6e9f2' : '#1f2937'

  const section = (title, children, key) => (
    <section
      key={key}
      style={{
        backgroundColor: cardBg,
        border: `1px solid ${borderColor}`,
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
      }}
    >
      <h3 style={{ margin: 0, marginBottom: 10, fontSize: 14, color: ink, fontWeight: 700 }}>{title}</h3>
      {children}
    </section>
  )

  const kv = (label, value) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13 }}>
      <span style={{ color: muted }}>{label}</span>
      <span style={{ color: ink, fontWeight: 500 }}>{value ?? '—'}</span>
    </div>
  )

  const severityColor = (sev) => {
    const s = (sev || '').toLowerCase()
    if (s === 'high') return { bg: 'rgba(242,108,108,0.18)', fg: '#c94545' }
    if (s === 'medium') return { bg: 'rgba(242,217,78,0.25)', fg: '#8a7318' }
    return { bg: 'rgba(63,191,154,0.18)', fg: '#2f9f7e' }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Header: score + recommendation */}
      <section
        style={{
          backgroundColor: cardBg,
          border: `1px solid ${borderColor}`,
          borderRadius: 12,
          padding: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 24,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 120 }}>
          <div style={{ fontSize: 48, fontWeight: 800, color: scoreColor, lineHeight: 1 }}>
            {Number(report?.viability_score ?? 0)}
          </div>
          <div style={{ fontSize: 11, color: muted, marginTop: 4 }}>{t('research.score', 'Puntuació')} /100</div>
        </div>
        <div style={{ flex: 1, minWidth: 220 }}>
          <div
            style={{
              display: 'inline-block',
              padding: '4px 10px',
              borderRadius: 999,
              backgroundColor: recoBadge.bg,
              color: recoBadge.fg,
              fontWeight: 700,
              fontSize: 11,
              letterSpacing: 0.5,
              marginBottom: 10,
            }}
          >
            {recoBadge.label}
          </div>
          <p style={{ margin: 0, color: ink, fontSize: 14, lineHeight: 1.5 }}>
            {report?.executive_summary || t('research.noSummary', 'Sense resum disponible.')}
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 180 }}>
          {onSaveAsBriefing && (
            <Button variant="secondary" onClick={onSaveAsBriefing}>
              <Save size={14} style={{ marginRight: 6 }} />
              {t('research.actions.saveBriefing', 'Desar com a briefing')}
            </Button>
          )}
          {onCreateProject && (
            <Button variant="primary" onClick={onCreateProject}>
              <Rocket size={14} style={{ marginRight: 6 }} />
              {t('research.actions.createProject', 'Crear projecte')}
            </Button>
          )}
          <Button variant="ghost" onClick={exportPDF}>
            <FileText size={14} style={{ marginRight: 6 }} />
            {t('research.actions.exportPdf', 'Exportar PDF')}
          </Button>
        </div>
      </section>

      {/* Market */}
      {report?.market && section(
        t('research.sections.market', 'Mercat'),
        <div>
          {kv(t('research.market.sellingPrice', 'Preu de venda'),
            report.market.selling_price
              ? `${report.market.selling_price.min ?? 0} – ${report.market.selling_price.max ?? 0} ${report.market.selling_price.currency ?? ''}`
              : '—')}
          {kv(t('research.market.bsr', 'BSR'), report.market.bsr ?? '—')}
          {kv(t('research.market.competition', 'Competència'), report.market.competition_level)}
          {kv(t('research.market.reviews', 'Rang de reviews'), report.market.reviews_range)}
          {kv(t('research.market.searchVolume', 'Volum de cerca'), report.market.search_volume)}
          {kv(t('research.market.trend', 'Tendència'), report.market.trend)}
          {report.market.summary && (
            <p style={{ color: muted, fontSize: 13, marginTop: 8, marginBottom: 0 }}>{report.market.summary}</p>
          )}
        </div>,
        'market',
      )}

      {/* Costs */}
      {report?.costs && section(
        t('research.sections.costs', 'Costos'),
        <div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ textAlign: 'left', color: muted, borderBottom: `1px solid ${borderColor}` }}>
                  <th style={{ padding: '6px 8px' }}>{t('research.costs.source', 'Font')}</th>
                  <th style={{ padding: '6px 8px' }}>{t('research.costs.priceRange', 'Preu')}</th>
                  <th style={{ padding: '6px 8px' }}>{t('research.costs.moq', 'MOQ')}</th>
                </tr>
              </thead>
              <tbody style={{ color: ink }}>
                <tr>
                  <td style={{ padding: '6px 8px' }}>Alibaba</td>
                  <td style={{ padding: '6px 8px' }}>{report.costs.alibaba_price ? `${report.costs.alibaba_price.min ?? 0} – ${report.costs.alibaba_price.max ?? 0}` : '—'}</td>
                  <td style={{ padding: '6px 8px' }}>{report.costs.alibaba_price?.moq ?? '—'}</td>
                </tr>
                <tr>
                  <td style={{ padding: '6px 8px' }}>1688 (fàbrica)</td>
                  <td style={{ padding: '6px 8px' }}>{report.costs.factory_price_1688 ? `${report.costs.factory_price_1688.min ?? 0} – ${report.costs.factory_price_1688.max ?? 0}` : '—'}</td>
                  <td style={{ padding: '6px 8px' }}>—</td>
                </tr>
                <tr>
                  <td style={{ padding: '6px 8px' }}>Zentrada</td>
                  <td style={{ padding: '6px 8px' }}>{report.costs.zentrada_price ? `${report.costs.zentrada_price.min ?? 0} – ${report.costs.zentrada_price.max ?? 0}` : '—'}</td>
                  <td style={{ padding: '6px 8px' }}>—</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: 10 }}>
            {kv(t('research.costs.shippingSea', 'Enviament mar/unit'), report.costs.estimated_shipping_per_unit?.sea)}
            {kv(t('research.costs.shippingAir', 'Enviament aire/unit'), report.costs.estimated_shipping_per_unit?.air)}
            {kv(t('research.costs.fba', 'FBA fees'), report.costs.estimated_fba_fees)}
          </div>
          {report.costs.summary && (
            <p style={{ color: muted, fontSize: 13, marginTop: 8, marginBottom: 0 }}>{report.costs.summary}</p>
          )}
        </div>,
        'costs',
      )}

      {/* Margins */}
      {report?.margins && section(
        t('research.sections.margins', 'Marges'),
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ textAlign: 'left', color: muted, borderBottom: `1px solid ${borderColor}` }}>
                <th style={{ padding: '6px 8px' }}>{t('research.margins.scenario', 'Escenari')}</th>
                <th style={{ padding: '6px 8px' }}>{t('research.margins.price', 'Preu venda')}</th>
                <th style={{ padding: '6px 8px' }}>{t('research.margins.cost', 'Cost total')}</th>
                <th style={{ padding: '6px 8px' }}>{t('research.margins.net', 'Marge net %')}</th>
              </tr>
            </thead>
            <tbody style={{ color: ink }}>
              {['optimistic', 'realistic', 'pessimistic'].map((k) => {
                const r = report.margins[k] || {}
                const pctColor =
                  r.net_margin_pct >= 25 ? 'var(--success-1,#3FBF9A)' :
                  r.net_margin_pct >= 10 ? 'var(--warning-1,#F2D94E)' : 'var(--danger-1,#F26C6C)'
                return (
                  <tr key={k} style={{ borderBottom: `1px solid ${borderColor}` }}>
                    <td style={{ padding: '6px 8px', textTransform: 'capitalize' }}>{t(`research.margins.${k}`, k)}</td>
                    <td style={{ padding: '6px 8px' }}>{r.selling_price ?? '—'}</td>
                    <td style={{ padding: '6px 8px' }}>{r.total_cost ?? '—'}</td>
                    <td style={{ padding: '6px 8px', color: pctColor, fontWeight: 600 }}>
                      {r.net_margin_pct != null ? `${r.net_margin_pct}%` : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {report.margins.summary && (
            <p style={{ color: muted, fontSize: 13, marginTop: 8, marginBottom: 0 }}>{report.margins.summary}</p>
          )}
        </div>,
        'margins',
      )}

      {/* Risks */}
      {Array.isArray(report?.risks) && report.risks.length > 0 && section(
        t('research.sections.risks', 'Riscos'),
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {report.risks.map((r, i) => {
            const c = severityColor(r.severity)
            return (
              <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <span
                  style={{
                    backgroundColor: c.bg,
                    color: c.fg,
                    borderRadius: 999,
                    padding: '2px 8px',
                    fontSize: 10,
                    fontWeight: 700,
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}
                >
                  {(r.severity || '').toUpperCase()}
                </span>
                <span style={{ color: ink, fontSize: 13 }}>
                  <strong style={{ textTransform: 'capitalize' }}>{r.type}</strong>: {r.description}
                </span>
              </li>
            )
          })}
        </ul>,
        'risks',
      )}

      {/* Next steps */}
      {Array.isArray(report?.next_steps) && report.next_steps.length > 0 && section(
        t('research.sections.nextSteps', 'Pròxims passos'),
        <ol style={{ paddingLeft: 18, margin: 0, color: ink, fontSize: 13, lineHeight: 1.7 }}>
          {report.next_steps.map((s, i) => <li key={i}>{s}</li>)}
        </ol>,
        'nextsteps',
      )}

      {/* Sources */}
      {Array.isArray(meta.sources_used) && meta.sources_used.length > 0 && (
        <div style={{ fontSize: 11, color: muted, marginTop: 4 }}>
          {t('research.sources', 'Fonts utilitzades')}: {meta.sources_used.join(', ')}
        </div>
      )}
    </div>
  )
}
