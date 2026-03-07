/**
 * D16 Slice 4 — Franja global d’alerta de risc de stockout.
 * Visible a /app/*; tot prové de getStockoutAlerts(); no es recalculen vendes al frontend.
 */
import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle } from 'lucide-react'
import { useWorkspace } from '../../contexts/WorkspaceContext'
import { supabase } from '../../lib/supabase'
import { getStockoutAlerts } from '../../lib/inventory/getStockoutAlerts'
import Button from '../Button'

const AMBER = 'var(--stockout-alert-amber, #f59e0b)'

export default function StockoutAlertStrip() {
  const { activeOrgId } = useWorkspace()
  const navigate = useNavigate()
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    if (!activeOrgId) {
      setAlerts([])
      return
    }
    setLoading(true)
    try {
      const data = await getStockoutAlerts(supabase, activeOrgId, { lookbackDays: 30 })
      setAlerts(Array.isArray(data) ? data : [])
    } catch {
      setAlerts([])
    } finally {
      setLoading(false)
    }
  }, [activeOrgId])

  useEffect(() => {
    load()
  }, [load])

  if (loading || alerts.length === 0) return null

  const count = alerts.length
  const message = count === 1
    ? '⚠ Product may stock out soon'
    : `⚠ ${count} products may stock out soon`

  return (
    <div
      role="alert"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        padding: '8px 16px',
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        borderBottom: `1px solid ${AMBER}`,
        fontSize: '14px',
        flexWrap: 'wrap',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: AMBER, fontWeight: 500 }}>
        <AlertTriangle size={18} style={{ flexShrink: 0 }} />
        <span>{message}</span>
      </div>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => navigate('/app/profit')}
        style={{ flexShrink: 0 }}
      >
        View details
      </Button>
    </div>
  )
}
