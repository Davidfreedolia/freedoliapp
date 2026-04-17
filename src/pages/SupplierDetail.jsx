/**
 * SupplierDetail.jsx — Vista de detall d'un proveïdor
 * Ruta: /app/suppliers/:id
 *
 * Mostra informació bàsica del proveïdor + comandes actives/passades associades.
 * Lectura: no permet editar (usa la modal d'edició de Suppliers.jsx per a canvis).
 */

import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft, Building2, Users, Package, Truck, MapPin, Phone,
  Mail, Globe, Star, FileText, CreditCard, Clock, Edit,
  Loader, AlertCircle, ExternalLink
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { getSupplier, supabase } from '../lib/supabase'
import { useApp } from '../context/AppContext'
import { useBreakpoint } from '../hooks/useBreakpoint'
import Button from '../components/Button'
import { DataLoading, DataError } from '../components/dataStates'

// Consistent with Suppliers.jsx type definitions
const SUPPLIER_TYPES = {
  manufacturer: { name: 'Fabricant', icon: Building2, color: '#1F5F63' },
  trading: { name: 'Trading Company', icon: Package, color: '#1F5F63' },
  agent: { name: 'Agent de Compres', icon: Users, color: '#1F5F63' },
  freight: { name: 'Transitari', icon: Truck, color: '#1F5F63' }
}

const PO_STATUS_LABELS = {
  draft: 'Esborrany',
  sent: 'Enviat',
  confirmed: 'Confirmat',
  partial_paid: 'Pagament parcial',
  paid: 'Pagat',
  in_production: 'En producció',
  shipped: 'Enviat',
  received: 'Rebut',
  cancelled: 'Cancel·lat'
}

const PO_STATUS_COLORS = {
  draft: 'var(--text-2)',
  sent: '#3b82f6',
  confirmed: '#8b5cf6',
  partial_paid: '#f59e0b',
  paid: '#22c55e',
  in_production: '#ec4899',
  shipped: 'var(--c-teal-300)',
  received: '#10b981',
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

export default function SupplierDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { darkMode } = useApp()
  const { isMobile } = useBreakpoint()

  const [supplier, setSupplier] = useState(null)
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [supplierData, { data: posData, error: posErr }] = await Promise.all([
          getSupplier(id),
          supabase
            .from('purchase_orders')
            .select('id, po_number, status, order_date, total_cost, currency, project_id, projects(name)')
            .eq('supplier_id', id)
            .order('order_date', { ascending: false })
        ])
        if (cancelled) return
        if (!supplierData) { setError('Proveïdor no trobat'); setLoading(false); return }
        if (posErr) throw posErr
        setSupplier(supplierData)
        setOrders(posData ?? [])
      } catch (err) {
        if (!cancelled) setError(err.message || 'Error carregant proveïdor')
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

  if (error || !supplier) {
    return (
      <div className="sd-root">
        <div className="sd-error">
          <AlertCircle size={32} />
          <p>{error || 'Proveïdor no trobat'}</p>
          <Button variant="ghost" size="sm" onClick={() => navigate('/app/suppliers')}>
            <ArrowLeft size={16} /> Tornar
          </Button>
        </div>
      </div>
    )
  }

  const typeInfo = SUPPLIER_TYPES[supplier.type] || SUPPLIER_TYPES.manufacturer
  const TypeIcon = typeInfo.icon
  const activeOrders = orders.filter(o => !['received', 'cancelled'].includes(o.status))
  const pastOrders = orders.filter(o => ['received', 'cancelled'].includes(o.status))

  return (
    <div className="sd-root" data-dark={darkMode ? '' : undefined}>
      {/* Top bar */}
      <div className="sd-topbar">
        <Button variant="ghost" size="sm" onClick={() => navigate('/app/suppliers')}>
          <ArrowLeft size={16} />
          {t('nav.suppliers', 'Proveïdors')}
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => navigate('/app/suppliers', { state: { editId: supplier.id } })}
        >
          <Edit size={14} />
          {t('common.buttons.save', 'Editar')}
        </Button>
      </div>

      <div className="sd-body" style={{ padding: isMobile ? '16px' : '32px' }}>
        {/* Profile header */}
        <div className="sd-profile">
          <div className="sd-profile__icon" style={{ background: `${typeInfo.color}18` }}>
            <TypeIcon size={32} color={typeInfo.color} />
          </div>
          <div className="sd-profile__info">
            <h1 className="sd-profile__name">{supplier.name}</h1>
            <div className="sd-profile__meta">
              <span className="sd-badge">{typeInfo.name}</span>
              {supplier.rating > 0 && <StarRating rating={supplier.rating} />}
              {supplier.city && supplier.country && (
                <span className="sd-location">
                  <MapPin size={13} />
                  {supplier.city}, {supplier.country}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="sd-grid">
          {/* Contact info */}
          <div className="sd-card">
            <h2 className="sd-card__title">
              <Phone size={16} /> {t('suppliersPage.contact', 'Contacte')}
            </h2>
            <div className="sd-info-list">
              <InfoRow icon={Users} label="Contacte" value={supplier.contact_name} />
              <InfoRow icon={Mail} label="Email" value={supplier.email} />
              <InfoRow icon={Phone} label="Telèfon" value={supplier.phone} />
              <InfoRow icon={Globe} label="Web" value={supplier.website} />
            </div>
          </div>

          {/* Commercial terms */}
          <div className="sd-card">
            <h2 className="sd-card__title">
              <CreditCard size={16} /> {t('suppliersPage.commercial', 'Condicions comercials')}
            </h2>
            <div className="sd-info-list">
              <InfoRow icon={CreditCard} label="Pagament" value={supplier.payment_terms} />
              <InfoRow icon={Package} label="Incoterm" value={supplier.incoterm} />
              <InfoRow icon={MapPin} label="Port" value={supplier.incoterm_location} />
              <InfoRow icon={Clock} label="Lead time" value={supplier.lead_time_days ? `${supplier.lead_time_days} dies` : null} />
            </div>
          </div>
        </div>

        {/* Notes */}
        {supplier.notes && (
          <div className="sd-card sd-card--full">
            <h2 className="sd-card__title">Notes</h2>
            <p className="sd-notes">{supplier.notes}</p>
          </div>
        )}

        {/* Orders — active */}
        <div className="sd-section">
          <h2 className="sd-section__title">
            <FileText size={16} />
            {t('orders.pageTitle', 'Comandes')} actives
            <span className="sd-count">{activeOrders.length}</span>
          </h2>
          {activeOrders.length === 0 ? (
            <p className="sd-empty">{t('orders.empty.title', 'Cap comanda activa.')}</p>
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
                  <span
                    className="sd-order-row__status"
                    style={{ color: PO_STATUS_COLORS[order.status] ?? 'var(--text-2)' }}
                  >
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

        {/* Orders — past */}
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
                  <span
                    className="sd-order-row__status"
                    style={{ color: PO_STATUS_COLORS[order.status] ?? 'var(--text-2)' }}
                  >
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
