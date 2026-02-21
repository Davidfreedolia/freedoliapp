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

export default function SamplesSection({ projectId, darkMode }) {
  const navigate = useNavigate()
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState(null)
  const [poModalRow, setPoModalRow] = useState(null)
  const [poForm, setPoForm] = useState({ amount: '', currency: 'USD', notes: '' })
  const [poSubmitting, setPoSubmitting] = useState(false)

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

  const setStatus = async (id, status) => {
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

  const toggleChoice = async (row, nextStatus) => {
    const current = (row.choice_status || 'NONE').toUpperCase()
    const next = nextStatus === current ? 'NONE' : nextStatus
    setUpdatingId(row.id)
    try {
      if (next === 'WINNER' && projectId) {
        await supabase
          .from('supplier_sample_requests')
          .update({ choice_status: 'NONE' })
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

      {list.length === 0 ? (
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
              <th className="samples-table__actions-col">Accions</th>
            </tr>
          </thead>
          <tbody>
            {list.map((row) => {
              const quote = row.supplier_quotes
              const supplier = row.suppliers
              const unitPrice = smallestUnitPrice(quote)
              const currency = quote?.currency || ''
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
                        disabled={updatingId === row.id}
                        onClick={() => toggleChoice(row, 'SHORTLIST')}
                      >
                        TRIA
                      </button>
                      <button
                        type="button"
                        className={`sample-choice sample-choice--winner ${(row.choice_status || 'NONE').toUpperCase() === 'WINNER' ? 'sample-choice--on' : 'sample-choice--off'}`}
                        disabled={updatingId === row.id}
                        onClick={() => toggleChoice(row, 'WINNER')}
                      >
                        GUANYA
                      </button>
                    </div>
                  </td>
                  <td className="samples-table__actions-col">
                    <div className="samples-actions">
                      {!row.po_id ? (
                        <button
                          type="button"
                          className="btn btn--sm btn--turq"
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
                            onClick={() => navigate(`/orders?po=${row.po_id}`)}
                          >
                            Veure PO
                          </button>
                        </>
                      )}
                      <button
                        type="button"
                        className="btn btn--sm btn--turq"
                        disabled={updatingId === row.id}
                        onClick={() => setStatus(row.id, 'REQUESTED')}
                      >
                        SOL·LICITADA
                      </button>
                      <button
                        type="button"
                        className="btn btn--sm btn--soft"
                        disabled={updatingId === row.id}
                        onClick={() => setStatus(row.id, 'RECEIVED')}
                      >
                        REBuda
                      </button>
                      <button
                        type="button"
                        className="btn btn--sm btn--soft"
                        disabled={updatingId === row.id}
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
