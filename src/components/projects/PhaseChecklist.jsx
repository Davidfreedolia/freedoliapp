import { useEffect, useMemo, useState } from 'react'
import { CheckCircle, AlertTriangle } from 'lucide-react'
import { validatePhaseTransition } from '../../modules/projects/phaseGates'
import supabase from '../../lib/supabase'
import { getPhaseStyle } from '../../utils/phaseStyles'

const REQUIREMENTS_BY_PHASE = {
  1: [
    'ASIN competidor definit',
    'Decisió GO o RISKY',
    'Document d\'anàlisi o estimació de preu'
  ],
  2: [
    'Snapshot competidor complet',
    'Profitabilitat guardada',
    'Profit per unitat > 0'
  ],
  3: [
    'Almenys 1 pressupost de proveïdor',
    'Preus per volum amb preu unitari > 0'
  ],
  4: [
    'Almenys 1 document de mostra',
    'Tasques DONE de validació de mostra'
  ],
  5: [
    'Almenys 1 comanda de compra',
    'Comanda de compra no esborrany',
    'Almenys 1 document de PO'
  ],
  6: [
    'SKU definit',
    'GTIN vàlid (EAN/UPC o exempt)',
    'Document listing'
  ]
}

const normalizeMissing = (missing) => {
  const normalized = new Set(missing || [])

  if (normalized.has('Document d\'anàlisi') || normalized.has('Estimació de preu de proveïdor')) {
    normalized.add('Document d\'anàlisi o estimació de preu')
  }
  if (normalized.has('ASIN competidor')) {
    normalized.add('ASIN competidor definit')
  }
  if (normalized.has('Recerca validada (anàlisi/preu/snapshot)')) {
    normalized.add('Document d\'anàlisi o estimació de preu')
  }
  if (normalized.has('Snapshot competidor complet')) {
    normalized.add('Snapshot competidor complet')
  }
  if (normalized.has('Registre de profitabilitat')) {
    normalized.add('Profitabilitat guardada')
  }
  if (normalized.has('Preu de venda > 0') || normalized.has('COGS > 0')) {
    normalized.add('Profit per unitat > 0')
  }
  if (normalized.has('Pressupost de proveïdor')) {
    normalized.add('Almenys 1 pressupost de proveïdor')
  }
  if (normalized.has('Document de mostra')) {
    normalized.add('Almenys 1 document de mostra')
  }
  if (normalized.has('Tasques de validació de mostra')) {
    normalized.add('Tasques DONE de validació de mostra')
  }
  if (normalized.has('Document de PO')) {
    normalized.add('Almenys 1 document de PO')
  }
  if (normalized.has('Comanda de compra')) {
    normalized.add('Almenys 1 comanda de compra')
  }
  if (normalized.has('Identificadors de producte')) {
    normalized.add('SKU definit')
    normalized.add('GTIN vàlid (EAN/UPC o exempt)')
  }
  if (normalized.has('Document de listing') || normalized.has('Almenys 1 document de listing')) {
    normalized.add('Document listing')
  }

  return normalized
}

export default function PhaseChecklist({
  project,
  currentPhase,
  projectId,
  darkMode,
  onProgressUpdate,
  id
}) {
  const [missingItems, setMissingItems] = useState([])
  const [loading, setLoading] = useState(false)
  const phaseStyle = useMemo(() => getPhaseStyle(currentPhase), [currentPhase])

  const requirements = REQUIREMENTS_BY_PHASE[currentPhase] || []

  useEffect(() => {
    let isMounted = true

    const loadChecklist = async () => {
      if (!projectId || !project || currentPhase >= 7 || requirements.length === 0) {
        if (isMounted) setMissingItems([])
        return
      }

      setLoading(true)
      try {
        const { missing } = await validatePhaseTransition({
          projectId,
          fromPhase: currentPhase,
          toPhase: currentPhase + 1,
          project,
          supabaseClient: supabase
        })
        if (isMounted) {
          setMissingItems(missing || [])
        }
      } catch {
        if (isMounted) {
          setMissingItems(requirements)
        }
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    loadChecklist()

    return () => {
      isMounted = false
    }
  }, [projectId, project, currentPhase, requirements.length])

  const normalizedMissing = useMemo(() => normalizeMissing(missingItems), [missingItems])

  if (!projectId || !project || currentPhase >= 7 || requirements.length === 0) {
    return null
  }

  const items = requirements.map(label => ({
    label,
    ok: !normalizedMissing.has(label)
  }))

  const allOk = items.every(item => item.ok)
  const completedCount = items.filter(item => item.ok).length

  useEffect(() => {
    if (typeof onProgressUpdate === 'function') {
      onProgressUpdate({
        completed: completedCount,
        total: items.length,
        allOk
      })
    }
  }, [completedCount, items.length, allOk, onProgressUpdate])

  return (
    <div id={id} style={{
      marginTop: '16px',
      padding: '16px',
      borderRadius: '12px',
      border: `1px solid ${phaseStyle.accent}`,
      backgroundColor: phaseStyle.bg
    }}>
      <div style={{
        fontSize: '16px',
        fontWeight: '600',
        color: darkMode ? '#ffffff' : '#111827',
        marginBottom: '8px'
      }}>
        Checklist de fase
      </div>

      {loading && (
        <div style={{ fontSize: '13px', color: darkMode ? '#9ca3af' : '#6b7280' }}>
          Carregant requisits...
        </div>
      )}

      {!loading && allOk && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          color: '#16a34a',
          fontSize: '14px'
        }}>
          <CheckCircle size={16} />
          Tot llest per avançar
        </div>
      )}

      {!loading && !allOk && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {items.map(item => (
            <div key={item.label} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px',
              color: item.ok ? '#16a34a' : (darkMode ? '#fca5a5' : '#dc2626')
            }}>
              {item.ok ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
              {item.label}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
