/**
 * D14 Slice 4 — Franja global d’alerta de compressió de marge.
 * Visible a /app/*; tot prové de getMarginCompressionAlerts(); no es recalculen marges al frontend.
 */
import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle } from 'lucide-react'
import { useWorkspace } from '../../contexts/WorkspaceContext'
import { supabase } from '../../lib/supabase'
import { getMarginCompressionAlerts } from '../../lib/profit/getMarginCompressionAlerts'
import Button from '../Button'

const CORAL = 'var(--margin-alert-coral, #e07a5f)'

export default function MarginCompressionAlertStrip() {
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
      const data = await getMarginCompressionAlerts(supabase, activeOrgId, {
        lookbackDays: 30,
        recentDays: 7,
      })
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
  const label = count === 1 ? '1 product' : `${count} products`

  return (
    <div
      role="alert"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        padding: '8px 16px',
        backgroundColor: 'rgba(224, 122, 95, 0.1)',
        borderBottom: `1px solid ${CORAL}`,
        fontSize: '14px',
        flexWrap: 'wrap',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: CORAL, fontWeight: 500 }}>
        <AlertTriangle size={18} style={{ flexShrink: 0 }} />
        <span>Margin dropped on {label}</span>
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
