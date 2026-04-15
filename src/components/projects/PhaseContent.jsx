import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, ChevronRight, Sparkles, Plus, ExternalLink, AlertCircle, Rocket } from 'lucide-react'
import { PHASE_META } from '../../utils/phaseStyles'

/**
 * Right-panel content of ProjectDetail. Renders the active phase's form,
 * required-check list and "Mark complete & advance" button.
 *
 * Props:
 * - project: project row
 * - activePhase {1..7}
 * - onAdvance(): called when user finishes the active phase (parent persists
 *   `current_phase = activePhase + 1` and refetches)
 * - onUpdateProject(patch): called to persist field edits in-line
 * - onOpenResearchWizard(): launches AI research modal (parent owns it)
 *
 * The phase forms keep a small slice of local state for the optional
 * project-side fields that don't (yet) live in the projects table — that data
 * is intentionally ephemeral here; the spec is UX-first and the schema is
 * already wide enough for the canonical fields (asin, decision, current_phase).
 */
export default function PhaseContent({
  project,
  activePhase = 1,
  onAdvance = () => {},
  onUpdateProject = async () => {},
  onOpenResearchWizard = () => {}
}) {
  const meta = PHASE_META[activePhase] || PHASE_META[1]
  const Icon = meta.icon
  const nextMeta = PHASE_META[activePhase + 1]

  // Per-phase locally-tracked checklists. Persists in component state only —
  // hydrated from project fields where they exist.
  const [checks, setChecks] = useState({})
  useEffect(() => {
    // Re-derive checks from project for canonical fields.
    setChecks((prev) => ({
      ...prev,
      research_reviewed: !!project?.research_prompt_generated || prev.research_reviewed === true,
      viability_confirmed: project?.decision === 'GO' || prev.viability_confirmed === true
    }))
  }, [project?.id, activePhase])

  const setCheck = (key, value) => setChecks((c) => ({ ...c, [key]: value }))

  const PhaseForm = PHASE_FORMS[activePhase] || (() => null)

  const requiredChecks = REQUIRED_CHECKS[activePhase] || []
  const allRequiredChecked = requiredChecks.every((k) => !!checks[k])
  const isFinalPhase = activePhase >= 7

  return (
    <section style={{
      background: 'var(--surface-bg)',
      border: '1px solid var(--border-1)',
      borderRadius: 12,
      padding: 20,
      display: 'flex',
      flexDirection: 'column',
      gap: 16,
      minHeight: 400
    }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 44,
          height: 44,
          borderRadius: 10,
          background: 'var(--accent-bg, #3b82f622)',
          color: 'var(--accent-primary, #3b82f6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Icon size={22} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, color: 'var(--text-2)', fontWeight: 700, letterSpacing: 0.6 }}>
            FASE {activePhase} DE 7
          </div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: 'var(--text-1)' }}>
            {meta.label}
          </h2>
          <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 2 }}>
            {meta.description}
          </div>
        </div>
      </header>

      <PhaseForm
        project={project}
        checks={checks}
        setCheck={setCheck}
        onUpdateProject={onUpdateProject}
        onOpenResearchWizard={onOpenResearchWizard}
      />

      {!isFinalPhase && (
        <footer style={{
          marginTop: 'auto',
          paddingTop: 16,
          borderTop: '1px solid var(--border-1)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          flexWrap: 'wrap'
        }}>
          {!allRequiredChecked && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 12,
              color: 'var(--warning, #d97706)'
            }}>
              <AlertCircle size={14} />
              Marca tots els checks obligatoris per avançar.
            </div>
          )}
          <button
            type="button"
            disabled={!allRequiredChecked}
            onClick={onAdvance}
            style={{
              marginLeft: 'auto',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '12px 18px',
              background: allRequiredChecked ? 'var(--accent-primary, #3b82f6)' : 'var(--surface-bg-2)',
              color: allRequiredChecked ? '#fff' : 'var(--text-2)',
              border: 'none',
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 600,
              cursor: allRequiredChecked ? 'pointer' : 'not-allowed',
              boxShadow: allRequiredChecked ? '0 1px 2px rgba(0,0,0,.08)' : 'none'
            }}
          >
            <CheckCircle2 size={16} />
            Completar fase de {meta.label}
            {nextMeta && <ChevronRight size={16} />}
            {nextMeta && <span style={{ opacity: 0.85 }}>{nextMeta.label}</span>}
          </button>
        </footer>
      )}
    </section>
  )
}

/* ----------------------------------------------------------------------------
 * Field primitives
 * ------------------------------------------------------------------------- */

const labelStyle = {
  display: 'block',
  fontSize: 12,
  fontWeight: 600,
  color: 'var(--text-2)',
  marginBottom: 6
}
const inputStyle = {
  width: '100%',
  padding: '10px 12px',
  border: '1px solid var(--border-1)',
  borderRadius: 8,
  background: 'var(--surface-bg-2)',
  color: 'var(--text-1)',
  fontSize: 14,
  fontFamily: 'inherit',
  boxSizing: 'border-box'
}

function Field({ label, children }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  )
}

function Grid({ children, cols = 2 }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
      gap: 14
    }}>
      {children}
    </div>
  )
}

function Check({ id, checks, setCheck, label, required = true }) {
  const checked = !!checks[id]
  return (
    <label style={{
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '10px 12px',
      border: `1.5px solid ${checked ? 'var(--success, #10b981)' : 'var(--border-1)'}`,
      borderRadius: 8,
      background: checked ? 'var(--success-bg, #10b98111)' : 'var(--surface-bg-2)',
      cursor: 'pointer',
      fontSize: 13,
      color: 'var(--text-1)',
      transition: 'border 120ms, background 120ms'
    }}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => setCheck(id, e.target.checked)}
        style={{ width: 16, height: 16, accentColor: 'var(--success, #10b981)' }}
      />
      <span>{label}</span>
      {required && <span style={{ fontSize: 10, color: 'var(--text-2)', marginLeft: 'auto' }}>OBLIGATORI</span>}
    </label>
  )
}

function PhaseSubhead({ children }) {
  return (
    <div style={{
      fontSize: 12,
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      color: 'var(--text-2)',
      marginTop: 4
    }}>
      {children}
    </div>
  )
}

function FieldDebounced({ label, value, onCommit, placeholder, type = 'text', rows }) {
  const [draft, setDraft] = useState(value ?? '')
  useEffect(() => { setDraft(value ?? '') }, [value])
  const commit = () => {
    if ((draft ?? '') !== (value ?? '')) onCommit(draft)
  }
  if (rows) {
    return (
      <Field label={label}>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          placeholder={placeholder}
          rows={rows}
          style={{ ...inputStyle, resize: 'vertical', minHeight: rows * 22 }}
        />
      </Field>
    )
  }
  return (
    <Field label={label}>
      <input
        type={type}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        placeholder={placeholder}
        style={inputStyle}
      />
    </Field>
  )
}

/* ----------------------------------------------------------------------------
 * Phase 1 — Research
 * ------------------------------------------------------------------------- */

function ResearchForm({ project, checks, setCheck, onUpdateProject, onOpenResearchWizard }) {
  return (
    <>
      <PhaseSubhead>Idea i mercat</PhaseSubhead>
      <FieldDebounced
        label="Idea / descripció del producte"
        value={project?.description || project?.name || ''}
        onCommit={(v) => onUpdateProject({ description: v })}
        rows={3}
        placeholder="Què vols vendre? Per qui? Quina necessitat resol?"
      />
      <Grid cols={2}>
        <FieldDebounced
          label="ASIN de referència (opcional)"
          value={project?.asin || ''}
          onCommit={(v) => onUpdateProject({ asin: v })}
          placeholder="B0XXXXXXXX"
        />
        <FieldDebounced
          label="URL del producte / referència"
          value={project?.product_url || ''}
          onCommit={(v) => onUpdateProject({ product_url: v })}
          placeholder="https://..."
        />
      </Grid>

      <PhaseSubhead>Acció</PhaseSubhead>
      <button
        type="button"
        onClick={onOpenResearchWizard}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 14px',
          border: '1.5px solid var(--accent-primary, #3b82f6)',
          background: 'var(--accent-bg, #3b82f622)',
          color: 'var(--accent-primary, #3b82f6)',
          borderRadius: 10,
          fontSize: 14,
          fontWeight: 600,
          cursor: 'pointer',
          alignSelf: 'flex-start'
        }}
      >
        <Sparkles size={16} /> Llançar recerca IA
      </button>

      <PhaseSubhead>Validació</PhaseSubhead>
      <Check id="research_reviewed" checks={checks} setCheck={setCheck} label="He revisat les dades de mercat i els resultats de la recerca." />
    </>
  )
}

/* ----------------------------------------------------------------------------
 * Phase 2 — Viability
 * ------------------------------------------------------------------------- */

function ViabilityForm({ project, checks, setCheck, onUpdateProject }) {
  return (
    <>
      <PhaseSubhead>Decisió</PhaseSubhead>
      <Grid cols={3}>
        {['GO', 'HOLD', 'DISCARDED'].map((opt) => {
          const active = project?.decision === opt
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onUpdateProject({ decision: opt })}
              style={{
                padding: '12px 10px',
                borderRadius: 10,
                border: `1.5px solid ${active ? 'var(--accent-primary, #3b82f6)' : 'var(--border-1)'}`,
                background: active ? 'var(--accent-bg, #3b82f622)' : 'var(--surface-bg-2)',
                color: 'var(--text-1)',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              {opt === 'GO' ? '✅ Go' : opt === 'HOLD' ? '⏸️ Hold' : '❌ Descartar'}
            </button>
          )
        })}
      </Grid>
      <Grid cols={2}>
        <FieldDebounced
          label="Preu de venda objectiu (€)"
          value={project?.target_price ?? ''}
          onCommit={(v) => onUpdateProject({ target_price: v ? Number(v) : null })}
          type="number"
          placeholder="29.90"
        />
        <FieldDebounced
          label="Marge objectiu (%)"
          value={project?.target_margin ?? ''}
          onCommit={(v) => onUpdateProject({ target_margin: v ? Number(v) : null })}
          type="number"
          placeholder="30"
        />
      </Grid>
      <FieldDebounced
        label="Notes d'avaluació"
        value={project?.viability_notes || ''}
        onCommit={(v) => onUpdateProject({ viability_notes: v })}
        rows={3}
        placeholder="Riscos, oportunitats, hipòtesis..."
      />

      <PhaseSubhead>Validació</PhaseSubhead>
      <Check id="viability_confirmed" checks={checks} setCheck={setCheck} label="He confirmat que el producte és viable amb els marges objectiu." />
    </>
  )
}

/* ----------------------------------------------------------------------------
 * Phase 3 — Suppliers
 * ------------------------------------------------------------------------- */

function SuppliersForm({ project, checks, setCheck, onUpdateProject }) {
  return (
    <>
      <PhaseSubhead>Proveïdors vinculats</PhaseSubhead>
      <div style={{
        padding: 12,
        border: '1px dashed var(--border-1)',
        borderRadius: 10,
        background: 'var(--surface-bg-2)',
        fontSize: 13,
        color: 'var(--text-2)',
        display: 'flex',
        alignItems: 'center',
        gap: 10
      }}>
        <span>Gestiona els proveïdors vinculats a aquest projecte des de la pàgina de Proveïdors.</span>
        <a
          href="/suppliers"
          style={{
            marginLeft: 'auto',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            color: 'var(--accent-primary, #3b82f6)',
            fontWeight: 600,
            textDecoration: 'none'
          }}
        >
          Obrir <ExternalLink size={14} />
        </a>
      </div>
      <Grid cols={2}>
        <FieldDebounced
          label="Preu negociat unitari (€)"
          value={project?.supplier_unit_price ?? ''}
          onCommit={(v) => onUpdateProject({ supplier_unit_price: v ? Number(v) : null })}
          type="number"
        />
        <FieldDebounced
          label="MOQ acordat"
          value={project?.supplier_moq ?? ''}
          onCommit={(v) => onUpdateProject({ supplier_moq: v ? Number(v) : null })}
          type="number"
        />
      </Grid>
      <PhaseSubhead>Validació</PhaseSubhead>
      <Check id="supplier_selected" checks={checks} setCheck={setCheck} label="He seleccionat el proveïdor i tinc el preu i MOQ acordats." />
    </>
  )
}

/* ----------------------------------------------------------------------------
 * Phase 4 — Samples
 * ------------------------------------------------------------------------- */

function SamplesForm({ project, checks, setCheck, onUpdateProject }) {
  return (
    <>
      <PhaseSubhead>Comanda i recepció de mostres</PhaseSubhead>
      <Grid cols={2}>
        <FieldDebounced
          label="Data de comanda"
          value={(project?.samples_ordered_at || '').slice(0, 10)}
          onCommit={(v) => onUpdateProject({ samples_ordered_at: v || null })}
          type="date"
        />
        <FieldDebounced
          label="Data de recepció"
          value={(project?.samples_received_at || '').slice(0, 10)}
          onCommit={(v) => onUpdateProject({ samples_received_at: v || null })}
          type="date"
        />
        <FieldDebounced
          label="Cost de les mostres (€)"
          value={project?.samples_cost ?? ''}
          onCommit={(v) => onUpdateProject({ samples_cost: v ? Number(v) : null })}
          type="number"
        />
        <FieldDebounced
          label="Tracking number"
          value={project?.samples_tracking || ''}
          onCommit={(v) => onUpdateProject({ samples_tracking: v })}
        />
      </Grid>
      <Field label="Resultat de la revisió">
        <select
          value={project?.samples_result || ''}
          onChange={(e) => onUpdateProject({ samples_result: e.target.value || null })}
          style={inputStyle}
        >
          <option value="">— Pendent —</option>
          <option value="approved">✅ Aprovada</option>
          <option value="changes">⚠️ Requereix canvis</option>
          <option value="rejected">❌ Rebutjada</option>
        </select>
      </Field>
      <PhaseSubhead>Validació</PhaseSubhead>
      <Check id="samples_approved" checks={checks} setCheck={setCheck} label="Les mostres han estat aprovades i puc passar a producció." />
    </>
  )
}

/* ----------------------------------------------------------------------------
 * Phase 5 — Production
 * ------------------------------------------------------------------------- */

function ProductionForm({ project, checks, setCheck, onUpdateProject }) {
  return (
    <>
      <PhaseSubhead>Ordre de producció</PhaseSubhead>
      <div style={{
        padding: 12,
        border: '1px dashed var(--border-1)',
        borderRadius: 10,
        background: 'var(--surface-bg-2)',
        fontSize: 13,
        color: 'var(--text-2)',
        display: 'flex',
        alignItems: 'center',
        gap: 10
      }}>
        <span>Crea o vincula una purchase order des de la pàgina de Comandes.</span>
        <a
          href="/orders"
          style={{
            marginLeft: 'auto',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            color: 'var(--accent-primary, #3b82f6)',
            fontWeight: 600,
            textDecoration: 'none'
          }}
        >
          <Plus size={14} /> Nova PO
        </a>
      </div>
      <Grid cols={2}>
        <FieldDebounced
          label="Quantitat de producció"
          value={project?.production_qty ?? ''}
          onCommit={(v) => onUpdateProject({ production_qty: v ? Number(v) : null })}
          type="number"
        />
        <FieldDebounced
          label="Cost total (€)"
          value={project?.production_cost ?? ''}
          onCommit={(v) => onUpdateProject({ production_cost: v ? Number(v) : null })}
          type="number"
        />
        <FieldDebounced
          label="Data estimada de lliurament"
          value={(project?.production_eta || '').slice(0, 10)}
          onCommit={(v) => onUpdateProject({ production_eta: v || null })}
          type="date"
        />
        <FieldDebounced
          label="Tracking enviament"
          value={project?.production_tracking || ''}
          onCommit={(v) => onUpdateProject({ production_tracking: v })}
        />
      </Grid>
      <Field label="Estat de la producció">
        <select
          value={project?.production_status || ''}
          onChange={(e) => onUpdateProject({ production_status: e.target.value || null })}
          style={inputStyle}
        >
          <option value="">— Pendent —</option>
          <option value="confirmed">Confirmat</option>
          <option value="in_production">En producció</option>
          <option value="shipped">Enviat</option>
          <option value="received">Rebut</option>
        </select>
      </Field>
      <PhaseSubhead>Validació</PhaseSubhead>
      <Check id="production_received" checks={checks} setCheck={setCheck} label="He rebut la producció i està al magatzem o en camí a FBA." />
    </>
  )
}

/* ----------------------------------------------------------------------------
 * Phase 6 — Listing
 * ------------------------------------------------------------------------- */

function ListingForm({ project, checks, setCheck, onUpdateProject }) {
  return (
    <>
      <PhaseSubhead>Llistat Amazon</PhaseSubhead>
      <FieldDebounced
        label="Títol del listing"
        value={project?.listing_title || project?.name || ''}
        onCommit={(v) => onUpdateProject({ listing_title: v })}
        placeholder="Títol comercial complet..."
      />
      <FieldDebounced
        label="Bullet points (un per línia, màx 5)"
        value={project?.listing_bullets || ''}
        onCommit={(v) => onUpdateProject({ listing_bullets: v })}
        rows={5}
        placeholder={'• Bullet 1\n• Bullet 2\n• ...'}
      />
      <Grid cols={3}>
        <FieldDebounced
          label="Preu de venda final (€)"
          value={project?.listing_price ?? project?.target_price ?? ''}
          onCommit={(v) => onUpdateProject({ listing_price: v ? Number(v) : null })}
          type="number"
        />
        <FieldDebounced
          label="SKU"
          value={project?.sku || ''}
          onCommit={(v) => onUpdateProject({ sku: v })}
        />
        <FieldDebounced
          label="ASIN"
          value={project?.asin || ''}
          onCommit={(v) => onUpdateProject({ asin: v })}
        />
      </Grid>
      <Field label="Estat del listing">
        <select
          value={project?.listing_status || ''}
          onChange={(e) => onUpdateProject({ listing_status: e.target.value || null })}
          style={inputStyle}
        >
          <option value="">— En preparació —</option>
          <option value="preparing">En preparació</option>
          <option value="pending_review">Pendent revisió Amazon</option>
          <option value="active">Actiu</option>
        </select>
      </Field>
      <PhaseSubhead>Validació</PhaseSubhead>
      <Check id="listing_published" checks={checks} setCheck={setCheck} label="El listing està publicat i actiu a Amazon." />
    </>
  )
}

/* ----------------------------------------------------------------------------
 * Phase 7 — Live (final, no advance)
 * ------------------------------------------------------------------------- */

function LiveForm({ project }) {
  const stats = useMemo(() => ([
    { label: 'Revenue (mes)', value: project?.live_revenue_month != null ? `€${Number(project.live_revenue_month).toLocaleString('es-ES')}` : '—' },
    { label: 'Unitats venudes', value: project?.live_units_month ?? '—' },
    { label: 'Marge net', value: project?.live_margin_pct != null ? `${project.live_margin_pct}%` : '—' },
    { label: 'PPC cost', value: project?.live_ppc_month != null ? `€${Number(project.live_ppc_month).toLocaleString('es-ES')}` : '—' }
  ]), [project])
  return (
    <>
      <PhaseSubhead>Producte en venda</PhaseSubhead>
      <Grid cols={4}>
        {stats.map((s) => (
          <div key={s.label} style={{
            padding: 14,
            border: '1px solid var(--border-1)',
            borderRadius: 10,
            background: 'var(--surface-bg-2)'
          }}>
            <div style={{ fontSize: 11, color: 'var(--text-2)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              {s.label}
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-1)', marginTop: 4 }}>
              {s.value}
            </div>
          </div>
        ))}
      </Grid>
      <PhaseSubhead>Accessos ràpids</PhaseSubhead>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <a href="/finances" style={quickLinkStyle}><ExternalLink size={14} /> Finances del producte</a>
        <a href="/inventory" style={quickLinkStyle}><ExternalLink size={14} /> Inventari</a>
      </div>
      <div style={{
        marginTop: 8,
        padding: 14,
        border: '1.5px solid var(--accent-primary, #3b82f6)',
        background: 'var(--accent-bg, #3b82f622)',
        borderRadius: 10,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        color: 'var(--accent-primary, #3b82f6)',
        fontSize: 13,
        fontWeight: 600
      }}>
        <Rocket size={16} />
        Producte en venda — fes seguiment de mètriques i alertes des del Dashboard.
      </div>
    </>
  )
}

const quickLinkStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '8px 12px',
  border: '1px solid var(--border-1)',
  borderRadius: 8,
  background: 'var(--surface-bg-2)',
  color: 'var(--text-1)',
  fontSize: 13,
  textDecoration: 'none'
}

/* ----------------------------------------------------------------------------
 * Registry
 * ------------------------------------------------------------------------- */

const PHASE_FORMS = {
  1: ResearchForm,
  2: ViabilityForm,
  3: SuppliersForm,
  4: SamplesForm,
  5: ProductionForm,
  6: ListingForm,
  7: LiveForm
}

const REQUIRED_CHECKS = {
  1: ['research_reviewed'],
  2: ['viability_confirmed'],
  3: ['supplier_selected'],
  4: ['samples_approved'],
  5: ['production_received'],
  6: ['listing_published'],
  7: []
}
