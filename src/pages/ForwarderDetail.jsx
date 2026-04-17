/**
 * ForwarderDetail.jsx — Vista de detall d'un transitari
 * Ruta: /app/forwarders/:id
 *
 * Mostra info bàsica del transitari + comandes/enviaments associats.
 */

import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft, Truck, MapPin, Phone, Mail, Globe, Star, FileText,
  CreditCard, Package, Warehouse, Loader, AlertCircle, Edit,
  ExternalLink, Clock
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { getSupplier, supabase } from '../lib/supabase'
import { useApp } from '../context/AppContext'
import { useBreakpoint } from '../hooks/useBreakpoint'
import Button from '../components/Button'

const PO_STATUS_LABELS = {
  draft: 'Esborrany', sent: 'Enviat', confirmed: 'Confirmat',
  partial_paid: 'Pagament parcial', paid: 'Pagat',
  in_production: 'En producció', shipped: 'Enviat',
  received: 'Rebut', cancelled: 'Cancel·lat'
}

const PO_STATUS_COLORS = {
  draft: 'var(--text-2)', sent: '#3b82f6', confirmed: '#8b5cf6',
  partial_paid: '#f59e0b', paid: '#22c55e', in_production: '#ec4899',
  shipped: 'var(--c-teal-300)', received: '#10b981',
  cancelled: 'var(--danger-1, #F26C6C)'
}

function StarRating({ rating }) {
  return (
    <div style={{ display: 'flex', gap: 3 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <Star
          key={i}
          size={14}
          fill={i <= rating ? '#f59e0b' : 'none'}
          color={i <= rating ? '#f59e0b' : 'var(--border-1)'}
        />
      ))}
    </div>
  )
}

function InfoRow({ icon: Icon, label, value }) {
  if (!value) return null
  return (
    <div className="sd-info-row">
      <Icon size={14} className="sd-info-row__icon" />
      <span className="sd-info-row__label">{label}</span>
      <span className="sd-info-row__value">{value}</span>
    </div>
  )
}

export default function ForwarderDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { darkMode } = useApp()
  const { isMobile } = useBreakpoint()

  const [forwarder, setForwarder] = useState(null)
  const [warehouses, setWarehouses] = useState([])
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [fwd, { data: whData }, { data: posData, error: posErr }] = await Promise.all([
          getSupplier(id),
          supabase
            .from('warehouses')
            .select('id, name, country, city, address, type')
            .eq('supplier_id', id),
          supabase
            .from('purchase_orders')
            .select('id, po_number, status, order_date, total_cost, currency, project_id, projects(name)')
            .eq('forwarder_id', id)
            .order('order_date', { ascending: false })
        ])
        if (cancelled) return
        if (!fwd) { setError('Transitari no trobat'); setLoading(false); return }
        if (posErr) throw posErr
        setForwarder(fwd)
        setWarehouses(whData ?? [])
        setOrders(posData ?? [])
      } catch (err) {
        if (!cancelled) setError(err.message || 'Error carregant transitari')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [id])

  if (loading) {
    return (
      <div className="sd-root">
        <div className="sd-loading"><Loader size={28} className="sd-spinner" /></div>
      </div>
    )
  }

  if (error || !forwarder) {
    return (
      <div className="sd-root">
        <div className="sd-error">
          <AlertCircle size={32} />
          <p>{error || 'Transitari no trobat'}</p>
          <Button variant="ghost" size="sm" onClick={() => navigate('/app/forwarders')}>
            <ArrowLeft size={16} /> Tornar
          </Button>
        </div>
      </div>
    )
  }

  const activeOrders = orders.filter(o => !['received', 'cancelled'].includes(o.status))
  const pastOrders = orders.filter(o => ['received', 'cancelled'].includes(o.status))

  return (
    <div className="sd-root" data-dark={darkMode ? '' : undefined}>
      {/* Top bar */}
      <div className="sd-topbar">
        <Button variant="ghost" size="sm" onClick={() => navigate('/app/forwarders')}>
          <ArrowLeft size={16} />
          {t('nav.forwarders', 'Transitaris')}
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => navigate('/app/forwarders', { state: { editId: forwarder.id } })}
        >
          <Edit size={14} />
          Editar
        </Button>
      </div>

      <div className="sd-body" style={{ padding: isMobile ? '16px' : '32px' }}>
        {/* Profile header */}
        <div className="sd-profile">
          <div className="sd-profile__icon" style={{ background: 'rgba(31, 95, 99, 0.1)' }}>
            <Truck size={32} color="var(--c-teal-900)" />
          </div>
          <div className="sd-profile__info">
            <h1 className="sd-profile__name">{forwarder.name}</h1>
            <div className="sd-profile__meta">
              <span className="sd-badge">Transitari</span>
              {forwarder.rating > 0 && <StarRating rating={forwarder.rating} />}
              {forwarder.city && forwarder.country && (
                <span className="sd-location">
                  <MapPin size={13} />
                  {forwarder.city}, {forwarder.country}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="sd-grid">
          {/* Contact */}
          <div className="sd-card">
            <h2 className="sd-card__title"><Phone size={16} /> Contacte</h2>
            <div className="sd-info-list">
              <InfoRow icon={Mail} label="Email" value={forwarder.email} />
              <InfoRow icon={Phone} label="Telèfon" value={forwarder.phone} />
              <InfoRow icon={Phone} label="WhatsApp" value={forwarder.whatsapp} />
              <InfoRow icon={Globe} label="Web" value={forwarder.website} />
            </div>
          </div>

          {/* Terms */}
          <div className="sd-card">
            <h2 className="sd-card__title"><CreditCard size={16} /> Condicions</h2>
            <div className="sd-info-list">
              <InfoRow icon={CreditCard} label="Pagament" value={forwarder.payment_terms} />
              <InfoRow icon={Package} label="Incoterm" value={forwarder.incoterm} />
              <InfoRow icon={MapPin} label="Port" value={forwarder.incoterm_location} />
            </div>
          </div>
        </div>

        {/* Warehouses */}
        {warehouses.length > 0 && (
          <div className="sd-section">
            <h2 className="sd-section__title">
              <Warehouse size={16} />
              Magatzems
              <span className="sd-count">{warehouses.length}</span>
            </h2>
            <div className="sd-wh-list">
              {warehouses.map(wh => (
                <div key={wh.id} className="sd-wh-row">
                  <Warehouse size={14} className="sd-wh-row__icon" />
                  <span className="sd-wh-row__name">{wh.name}</span>
                  {wh.city && wh.country && (
                    <span className="sd-wh-row__loc">
                      <MapPin size={12} /> {wh.city}, {wh.country}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        {forwarder.notes && (
          <div className="sd-card sd-card--full">
            <h2 className="sd-card__title">Notes</h2>
            <p className="sd-notes">{forwarder.notes}</p>
          </div>
        )}

        {/* Active orders */}
        <div className="sd-section">
          <h2 className="sd-section__title">
            <FileText size={16} />
            Comandes actives
            <span className="sd-count">{activeOrders.length}</span>
          </h2>
          {activeOrders.length === 0 ? (
            <p className="sd-empty">Cap comanda activa assignada a aquest transitari.</p>
          ) : (
            <div className="sd-orders-list">
              {activeOrders.map(order => (
                <Link
                  key={order.id}
                  to="/app/orders"
                  state={{ highlightOrderId: order.id }}
                  className="sd-order-row"
                >
                  <span className="sd-order-row__po">{order.po_number}</span>
                  <span className="sd-order-row__project">{order.projects?.name ?? '—'}</span>
                  <span className="sd-order-row__status" style={{ color: PO_STATUS_COLORS[order.status] ?? 'var(--text-2)' }}>
                    {PO_STATUS_LABELS[order.status] ?? order.status}
                  </span>
                  <span className="sd-order-row__amount">
                    {order.total_cost ? `${Number(order.total_cost).toLocaleString('ca-ES', { minimumFractionDigits: 0 })} ${order.currency ?? '€'}` : '—'}
                  </span>
                  <ExternalLink size={13} className="sd-order-row__ext" />
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Past orders */}
        {pastOrders.length > 0 && (
          <div className="sd-section">
            <h2 className="sd-section__title">
              <Clock size={16} />
              Historial
              <span className="sd-count">{pastOrders.length}</span>
            </h2>
            <div className="sd-orders-list">
              {pastOrders.map(order => (
                <Link
                  key={order.id}
                  to="/app/orders"
                  state={{ highlightOrderId: order.id }}
                  className="sd-order-row sd-order-row--past"
                >
                  <span className="sd-order-row__po">{order.po_number}</span>
                  <span className="sd-order-row__project">{order.projects?.name ?? '—'}</span>
                  <span className="sd-order-row__status" style={{ color: PO_STATUS_COLORS[order.status] ?? 'var(--text-2)' }}>
                    {PO_STATUS_LABELS[order.status] ?? order.status}
                  </span>
                  <span className="sd-order-row__amount">
                    {order.total_cost ? `${Number(order.total_cost).toLocaleString('ca-ES', { minimumFractionDigits: 0 })} ${order.currency ?? '€'}` : '—'}
                  </span>
                  <ExternalLink size={13} className="sd-order-row__ext" />
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
