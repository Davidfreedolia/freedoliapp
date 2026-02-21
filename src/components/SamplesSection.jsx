import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Package } from 'lucide-react'
import {
  getSupplierSampleRequests,
  updateSupplierSampleRequest,
  createSamplePurchaseOrder,
  supabase
} from '../lib/supabase'

function formatShortDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('ca', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

function smallestUnitPrice(quote) {
  const breaks = quote?.supplier_quote_price_breaks
  if (!breaks || breaks.length === 0) return null
  const sorted = [...breaks].sort((a, b) => (a.min_qty ?? 0) - (b.min_qty ?? 0))
  const first = sorted[0]
  return first?.unit_price != null ? first.unit_price : null
}

function getDemoSamplesForLayout() {
  return [
    {
      id: 'demo-a',
      choice_status: 'WINNER',
      status: 'REQUESTED',
      po_id: null,
      created_at: new Date().toISOString(),
      suppliers: { name: 'Demo Supplier A', country: 'CN' },
      supplier_quotes: {
        incoterm: 'FOB',
        moq: 500,
        currency: 'USD',
        lead_time_days: 21,
        supplier_quote_price_breaks: [{ min_qty: 100, unit_price: 2.5 }]
      },
      supplier_id: 'demo-sup-a'
    },
    {
      id: 'demo-b',
      choice_status: 'SHORTLIST',
      status: 'RECEIVED',
      po_id: 'demo-po-1',
      created_at: new Date().toISOString(),
      suppliers: { name: 'Demo Supplier B', country: 'VN' },
      supplier_quotes: {
        incoterm: 'CIF',
        moq: 1000,
        currency: 'EUR',
        lead_time_days: 14,
        supplier_quote_price_breaks: [{ min_qty: 500, unit_price: 1.8 }]
      },
      supplier_id: 'demo-sup-b'
    },
    {
      id: 'demo-c',
      choice_status: 'NONE',
      status: 'REJECTED',
      po_id: null,
      created_at: new Date().toISOString(),
      suppliers: { name: 'Demo Supplier C', country: 'ES' },
      supplier_quotes: {
        incoterm: 'EXW',
        moq: 200,
        currency: 'USD',
        lead_time_days: 30,
        supplier_quote_price_breaks: []
      },
      supplier_id: 'demo-sup-c'
    }
  ]
}

export default function SamplesSection({ projectId, darkMode }) {
  const navigate = useNavigate()
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState(null)
  const [poModalRow, setPoModalRow] = useState(null)
  const [poForm, setPoForm] = useState({ amount: '', currency: 'USD', notes: '' })
  const [poSubmitting, setPoSubmitting] = useState(false)
  const [trackRow, setTrackRow] = useState(null)
  const [trackDraft, setTrackDraft] = useState({
    tracking_number: '',
    tracking_carrier: '',
    tracking_url: ''
  })
  const [trackSaving, setTrackSaving] = useState(false)

  const loadData = useCallback(async () => {
    if (!projectId) return
    setLoading(true)
    try {
      const data = await getSupplierSampleRequests(projectId)
      setList(data || [])
    } catch (err) {
      console.error('Error loading sample requests:', err)
    }
    setLoading(false)
  }, [projectId])

  useEffect(() => {
    loadData()
  }, [loadData])

  const isDemoRow = (row) => row?.id && String(row.id).startsWith('demo-')

  const rowsForTable = (list?.length > 0) ? list : (import.meta.env.DEV ? getDemoSamplesForLayout() : [])

  const setStatus = async (id, status) => {
    if (String(id).startsWith('demo-')) return
    setUpdatingId(id)
    try {
      const updated = await updateSupplierSampleRequest(id, { status })
      if (updated) {
        setList(prev => prev.map(r => (r.id === id ? { ...r, ...updated } : r)))
      }
    } catch (err) {
      console.error('Error updating sample request:', err)
      alert(err?.message || 'Error en actualitzar l\'estat.')
    }
    setUpdatingId(null)
  }

  const openPoModal = (row) => {
    if (isDemoRow(row)) return
    const quote = row.supplier_quotes
    setPoModalRow(row)
    setPoForm({
      amount: '',
      currency: quote?.currency || 'USD',
      notes: ''
    })
  }

  const closePoModal = () => {
    setPoModalRow(null)
  }

  const handleCreateSamplePo = async () => {
    if (!poModalRow || !projectId) return
    const amount = parseFloat(poForm.amount)
    if (Number.isNaN(amount) || amount < 0) {
      alert('Indica un import vàlid.')
      return
    }
    setPoSubmitting(true)
    try {
      const quote = poModalRow.supplier_quotes
      await createSamplePurchaseOrder({
        project_id: projectId,
        supplier_id: poModalRow.supplier_id,
        sample_request_id: poModalRow.id,
        currency: (poForm.currency || 'USD').trim() || 'USD',
        amount_total: amount,
        notes: (poForm.notes || '').trim() || null,
        incoterm: quote?.incoterm || null
      })
      closePoModal()
      loadData()
    } catch (err) {
      console.error('Error creating sample PO:', err)
      alert(err?.message || 'Error en crear la PO de mostra.')
    }
    setPoSubmitting(false)
  }

  const openTrackModal = (row) => {
    if (isDemoRow(row)) return
    setTrackRow(row)
    setTrackDraft({
      tracking_number: row.tracking_number ?? '',
      tracking_carrier: row.tracking_carrier ?? row.carrier ?? '',
      tracking_url: row.tracking_url ?? ''
    })
  }

  const closeTrackModal = () => {
    setTrackRow(null)
  }

  const handleSaveTracking = async () => {
    if (!trackRow || String(trackRow.id).startsWith('demo-')) return
    setTrackSaving(true)
    try {
      const patch = {
        tracking_number: (trackDraft.tracking_number || '').trim() || null,
        tracking_carrier: (trackDraft.tracking_carrier || '').trim() || null,
        tracking_url: (trackDraft.tracking_url || '').trim() || null
      }
      await updateSupplierSampleRequest(trackRow.id, patch)
      closeTrackModal()
      await loadData()
    } catch (err) {
      console.error('Error saving tracking:', err)
      alert(err?.message || 'Error en desar el tracking.')
    }
    setTrackSaving(false)
  }

  const toggleChoice = async (row, nextStatus) => {
    if (isDemoRow(row)) return
    const current = (row.choice_status || 'NONE').toUpperCase()
    const next = nextStatus === current ? 'NONE' : nextStatus
    setUpdatingId(row.id)
    try {
      if (next === 'WINNER' && projectId) {
        await supabase
          .from('supplier_sample_requests')
          .update({ choice_status: 'SHORTLIST' })
          .eq('project_id', projectId)
          .eq('choice_status', 'WINNER')
      }
      const updated = await updateSupplierSampleRequest(row.id, { choice_status: next })
      if (updated) {
        setList(prev => prev.map(r => (r.id === row.id ? { ...r, ...updated } : r)))
      }
      if (next === 'WINNER') loadData()
    } catch (err) {
      console.error('Error updating choice:', err)
      alert(err?.message || 'Error en actualitzar la tria.')
    }
    setUpdatingId(null)
  }

  if (loading) {
    return (
      <div className="samples-section">
        <div className="samples-header">
          <h2 className="samples-title">
            <Package className="samples-title__icon" />
            Mostres
          </h2>
        </div>
        <p className="samples-loading">Carregant...</p>
      </div>
    )
  }

  return (
    <div className="samples-section">
      <div className="samples-header">
        <h2 className="samples-title">
          <Package className="samples-title__icon" />
          Mostres
        </h2>
      </div>

      {rowsForTable.length === 0 ? (
        <p className="samples-empty">
          Encara no hi ha mostres. Marca cotitzacions com MOSTRES des de Proveïdors.
        </p>
      ) : (
        <table className="samples-table">
          <thead>
            <tr>
              <th>Proveïdor</th>
              <th>Incoterm</th>
              <th>MOQ</th>
              <th>Preu unitat</th>
              <th>Lead time</th>
              <th>Estat</th>
              <th>Data</th>
              <th>Tria</th>
              <th>Enviament</th>
              <th className="samples-table__actions-col">Accions</th>
            </tr>
          </thead>
          <tbody>
            {rowsForTable.map((row) => {
              const quote = row.supplier_quotes
              const supplier = row.suppliers
              const unitPrice = smallestUnitPrice(quote)
              const currency = quote?.currency || ''
              const demo = isDemoRow(row)
              return (
                <tr key={row.id}>
                  <td>{supplier?.name ?? '—'}</td>
                  <td>{quote?.incoterm ?? '—'}</td>
                  <td>{quote?.moq != null ? quote.moq : '—'}</td>
                  <td>
                    {unitPrice != null ? `${Number(unitPrice)} ${currency}`.trim() : '—'}
                  </td>
                  <td>{quote?.lead_time_days != null ? quote.lead_time_days : '—'}</td>
                  <td>
                    <span className={`sample-status sample-status--${(row.status || '').toLowerCase()}`}>
                      {row.status || 'PENDING'}
                    </span>
                  </td>
                  <td>{formatShortDate(row.created_at)}</td>
                  <td>
                    <div className="sample-choice-row">
                      <button
                        type="button"
                        className={`sample-choice sample-choice--shortlist ${(row.choice_status || 'NONE').toUpperCase() === 'SHORTLIST' ? 'sample-choice--on' : 'sample-choice--off'}`}
                        disabled={updatingId === row.id || demo}
                        onClick={() => toggleChoice(row, 'SHORTLIST')}
                      >
                        TRIA
                      </button>
                      <button
                        type="button"
                        className={`sample-choice sample-choice--winner ${(row.choice_status || 'NONE').toUpperCase() === 'WINNER' ? 'sample-choice--on' : 'sample-choice--off'}`}
                        disabled={updatingId === row.id || demo}
                        onClick={() => toggleChoice(row, 'WINNER')}
                      >
                        GUANYA
                      </button>
                    </div>
                  </td>
                  <td>
                    {!row.tracking_number ? (
                      <span className="sample-shipping__empty">—</span>
                    ) : (
                      <div className="sample-shipping">
                        <span className="sample-shipping__num">{row.tracking_number}</span>
                        {(row.tracking_carrier || row.carrier) && (
                          <span className="sample-shipping__meta">
                            {row.tracking_carrier || row.carrier}
                          </span>
                        )}
                        {row.tracking_url && (
                          <a
                            href={row.tracking_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="sample-shipping__link"
                          >
                            Obrir
                          </a>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="samples-table__actions-col">
                    <div className="samples-actions">
                      <button
                        type="button"
                        className="btn btn--soft btn--sm sample-track-btn"
                        disabled={demo}
                        onClick={() => openTrackModal(row)}
                      >
                        Tracking
                      </button>
                      {!row.po_id ? (
                        <button
                          type="button"
                          className="btn btn--sm btn--turq"
                          disabled={demo}
                          onClick={() => openPoModal(row)}
                        >
                          Crear PO mostra
                        </button>
                      ) : (
                        <>
                          <span className="sample-po-pill">PO creada</span>
                          <button
                            type="button"
                            className="btn btn--sm btn--soft"
                            disabled={demo}
                            onClick={() => !demo && navigate(`/orders?po=${row.po_id}`)}
                          >
                            Veure PO
                          </button>
                        </>
                      )}
                      <button
                        type="button"
                        className="btn btn--sm btn--turq"
                        disabled={updatingId === row.id || demo}
                        onClick={() => setStatus(row.id, 'REQUESTED')}
                      >
                        SOL·LICITADA
                      </button>
                      <button
                        type="button"
                        className="btn btn--sm btn--soft"
                        disabled={updatingId === row.id || demo}
                        onClick={() => setStatus(row.id, 'RECEIVED')}
                      >
                        REBuda
                      </button>
                      <button
                        type="button"
                        className="btn btn--sm btn--soft"
                        disabled={updatingId === row.id || demo}
                        onClick={() => setStatus(row.id, 'REJECTED')}
                      >
                        REBUTJADA
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}

      {trackRow && (
        <div className="samples-po-modal-overlay" onClick={closeTrackModal}>
          <div className="samples-po-modal" onClick={e => e.stopPropagation()}>
            <h3 className="samples-po-modal__title">Tracking de mostra</h3>
            <div className="samples-po-modal__field">
              <label className="samples-po-modal__label">Tracking number</label>
              <input
                type="text"
                className="samples-po-modal__input"
                value={trackDraft.tracking_number}
                onChange={e => setTrackDraft(d => ({ ...d, tracking_number: e.target.value }))}
              />
            </div>
            <div className="samples-po-modal__field">
              <label className="samples-po-modal__label">Transportista</label>
              <input
                type="text"
                className="samples-po-modal__input"
                value={trackDraft.tracking_carrier}
                onChange={e => setTrackDraft(d => ({ ...d, tracking_carrier: e.target.value }))}
              />
            </div>
            <div className="samples-po-modal__field">
              <label className="samples-po-modal__label">URL tracking</label>
              <input
                type="text"
                className="samples-po-modal__input"
                value={trackDraft.tracking_url}
                onChange={e => setTrackDraft(d => ({ ...d, tracking_url: e.target.value }))}
              />
            </div>
            <div className="samples-po-modal__actions">
              <button
                type="button"
                className="btn btn--turq"
                disabled={trackSaving}
                onClick={handleSaveTracking}
              >
                Desar
              </button>
              <button
                type="button"
                className="btn btn--soft"
                disabled={trackSaving}
                onClick={closeTrackModal}
              >
                Cancel·lar
              </button>
            </div>
          </div>
        </div>
      )}

      {poModalRow && (
        <div className="samples-po-modal-overlay" onClick={closePoModal}>
          <div className="samples-po-modal" onClick={e => e.stopPropagation()}>
            <h3 className="samples-po-modal__title">Crear PO de mostra</h3>
            <div className="samples-po-modal__field">
              <label className="samples-po-modal__label">Import</label>
              <input
                type="number"
                min="0"
                step="any"
                className="samples-po-modal__input"
                value={poForm.amount}
                onChange={e => setPoForm(f => ({ ...f, amount: e.target.value }))}
              />
            </div>
            <div className="samples-po-modal__field">
              <label className="samples-po-modal__label">Moneda</label>
              <input
                type="text"
                className="samples-po-modal__input"
                value={poForm.currency}
                onChange={e => setPoForm(f => ({ ...f, currency: e.target.value }))}
              />
            </div>
            <div className="samples-po-modal__field">
              <label className="samples-po-modal__label">Notes</label>
              <textarea
                className="samples-po-modal__textarea"
                rows={3}
                value={poForm.notes}
                onChange={e => setPoForm(f => ({ ...f, notes: e.target.value }))}
              />
            </div>
            <div className="samples-po-modal__actions">
              <button
                type="button"
                className="btn btn--turq"
                disabled={poSubmitting}
                onClick={handleCreateSamplePo}
              >
                Crear PO
              </button>
              <button
                type="button"
                className="btn btn--soft"
                disabled={poSubmitting}
                onClick={closePoModal}
              >
                Cancel·lar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
