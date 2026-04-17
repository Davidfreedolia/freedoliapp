import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Eye, Package, Truck, CheckCircle2, Clock, AlertCircle } from 'lucide-react'
import { getPurchaseOrders } from '../../../lib/supabase'
import { useApp } from '../../../context/AppContext'

const STATUS_META = {
  draft:        { label: 'Esborrany',     color: '#94a3b8', icon: Clock },
  confirmed:    { label: 'Confirmat',     color: '#3b82f6', icon: Package },
  in_production:{ label: 'En producció',  color: '#d97706', icon: Package },
  shipped:      { label: 'Enviat',        color: '#8b5cf6', icon: Truck },
  received:     { label: 'Rebut',         color: '#10b981', icon: CheckCircle2 },
  cancelled:    { label: 'Cancel·lat',    color: '#ef4444', icon: AlertCircle },
}

export default function ProjectPOSection({ projectId }) {
  const navigate = useNavigate()
  const { activeOrgId } = useApp()
  const [pos, setPos] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!projectId || !activeOrgId) { setLoading(false); return }
    getPurchaseOrders(projectId, activeOrgId)
      .then(setPos)
      .catch(() => setPos([]))
      .finally(() => setLoading(false))
  }, [projectId, activeOrgId])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Capçalera */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6, color: 'var(--text-2)' }}>
          Purchase Orders ({loading ? '…' : pos.length})
        </span>
        <button
          type="button"
          onClick={() => navigate(`/app/orders/new?project=${projectId}`)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '6px 12px',
            background: 'var(--c-cta-500)',
            color: 'var(--cta-1-fg, #fff)',
            border: 'none', borderRadius: 8,
            fontSize: 12, fontWeight: 600, cursor: 'pointer'
          }}
        >
          <Plus size={14} /> Nova PO
        </button>
      </div>

      {/* Llista de POs */}
      {loading && (
        <div style={{ fontSize: 13, color: 'var(--text-2)', padding: '8px 0' }}>Carregant…</div>
      )}

      {!loading && pos.length === 0 && (
        <div style={{
          padding: '20px 16px',
          border: '1px dashed var(--border-1)',
          borderRadius: 10,
          background: 'var(--surface-bg-2)',
          fontSize: 13, color: 'var(--text-2)',
          textAlign: 'center'
        }}>
          <Package size={24} style={{ margin: '0 auto 8px', opacity: 0.4 }} />
          <div>Cap PO vinculada a aquest projecte.</div>
          <div style={{ marginTop: 4, fontSize: 12 }}>Crea una nova PO des del botó superior o des de Comandes.</div>
        </div>
      )}

      {!loading && pos.map((po) => {
        const meta = STATUS_META[po.status] || STATUS_META.draft
        const StatusIcon = meta.icon
        const total = po.total_amount != null ? `€${Number(po.total_amount).toLocaleString('es-ES', { minimumFractionDigits: 2 })}` : '—'
        const eta = po.estimated_arrival ? new Date(po.estimated_arrival).toLocaleDateString('ca-ES') : null
        return (
          <div
            key={po.id}
            style={{
              padding: '12px 14px',
              border: '1px solid var(--border-1)',
              borderRadius: 10,
              background: 'var(--surface-bg-2)',
              display: 'flex', alignItems: 'center', gap: 12,
              cursor: 'pointer',
              transition: 'border-color 120ms, background 120ms'
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--c-cta-500)'; e.currentTarget.style.background = 'var(--surface-bg)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-1)'; e.currentTarget.style.background = 'var(--surface-bg-2)' }}
            onClick={() => navigate(`/app/orders/${po.id}`)}
          >
            {/* Estat */}
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: `${meta.color}18`,
              color: meta.color,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0
            }}>
              <StatusIcon size={16} />
            </div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {po.po_number || po.id?.slice(0, 8).toUpperCase()}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 2 }}>
                {po.supplier?.name || 'Proveïdor desconegut'}{eta ? ` · ETA ${eta}` : ''}
              </div>
            </div>

            {/* Total */}
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)', flexShrink: 0 }}>
              {total}
            </div>

            {/* Badge estat */}
            <div style={{
              padding: '3px 8px',
              borderRadius: 6,
              background: `${meta.color}18`,
              color: meta.color,
              fontSize: 11, fontWeight: 600,
              flexShrink: 0
            }}>
              {meta.label}
            </div>

            <Eye size={14} style={{ color: 'var(--text-2)', flexShrink: 0 }} />
          </div>
        )
      })}

      {/* Accés ràpid a totes les comandes */}
      {pos.length > 0 && (
        <button
          type="button"
          onClick={() => navigate(`/app/orders?project=${projectId}`)}
          style={{
            background: 'none', border: '1px solid var(--border-1)',
            borderRadius: 8, padding: '7px 12px',
            fontSize: 12, color: 'var(--text-2)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
          }}
        >
          Veure totes les comandes d'aquest projecte
        </button>
      )}
    </div>
  )
}
