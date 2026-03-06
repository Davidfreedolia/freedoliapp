import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWorkspace } from '../contexts/WorkspaceContext'
import { supabase } from '../lib/supabase'
import { getOrgEntitlements, hasOrgFeature } from '../lib/billing/entitlements'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import useT from '../hooks/useT'

export default function AmazonSnapshot() {
  const { activeOrgId } = useWorkspace()
  const navigate = useNavigate()
  const t = useT()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [snapshot, setSnapshot] = useState(null)

  const [connections, setConnections] = useState([])
  const [retryStatus, setRetryStatus] = useState('idle') // idle | requesting | processing | writing | done | error

  const activeConnection = useMemo(
    () => connections.find((c) => c.status === 'active'),
    [connections]
  )

  const hasData = !!(snapshot && snapshot.hasData)

  const loadSnapshot = useCallback(async () => {
    if (!activeOrgId) return
    setLoading(true)
    setError(null)
    try {
      const from = new Date()
      from.setDate(from.getDate() - 30)
      const fromStr = from.toISOString().slice(0, 10)

      const { data: rows, error: err } = await supabase
        .from('financial_ledger')
        .select('type, amount_base_pnl, amount_base_cash')
        .eq('org_id', activeOrgId)
        .eq('scope', 'company')
        .in('status', ['posted', 'locked'])
        .gte('occurred_at', fromStr)

      if (err) {
        setError(err.message || 'Error')
        setSnapshot({ hasData: false })
        return
      }

      let revenue = 0
      let fees = 0
      const list = rows || []
      for (const r of list) {
        if (r.type === 'income') revenue += Number(r.amount_base_pnl) || 0
        if (r.type === 'expense') fees += Math.abs(Number(r.amount_base_pnl)) || 0
      }
      const net = revenue - fees
      const cashImpact = list.reduce(
        (sum, r) => sum + (Number(r.amount_base_cash) || 0),
        0
      )
      setSnapshot({
        revenue,
        fees,
        net,
        cashImpact,
        hasData: list.length > 0,
      })
    } finally {
      setLoading(false)
    }
  }, [activeOrgId])

  useEffect(() => {
    if (!activeOrgId) return
    loadSnapshot()
  }, [activeOrgId, loadSnapshot])

  useEffect(() => {
    if (!activeOrgId) return
    let cancelled = false
    async function loadConnections() {
      try {
        const { data, error } = await supabase.rpc('get_spapi_connection_safe')
        if (cancelled) return
        if (error) {
          // Si falla, simplement no mostrem Retry import.
          return
        }
        setConnections(data || [])
      } catch {
        // ignore
      }
    }
    loadConnections()
    return () => {
      cancelled = true
    }
  }, [activeOrgId])

  const handleRetryImport = async () => {
    if (!activeOrgId || !activeConnection?.id) {
      navigate('/activation')
      return
    }
    setRetryStatus('requesting')
    try {
      const entitlements = await getOrgEntitlements(supabase, activeOrgId)
      if (!hasOrgFeature(entitlements, 'amazon_ingest')) {
        showToast('Importació Amazon no disponible al teu pla', 'error')
        setRetryStatus('error')
        return
      }
      const { data, error } = await supabase.functions.invoke('spapi-settlement-worker', {
        method: 'POST',
        body: { connection_id: activeConnection.id },
      })
      if (error) throw error
      if (data?.error) throw new Error(data.error)
    } catch (err) {
      console.error('Retry import error:', err)
      setRetryStatus('error')
      return
    }

    setRetryStatus('processing')
    const start = Date.now()
    const maxWait = 120000

    function poll() {
      supabase
        .from('amazon_import_jobs')
        .select('id, status')
        .eq('org_id', activeOrgId)
        .order('created_at', { ascending: false })
        .limit(5)
        .then(({ data: jobs }) => {
          const hasDone = jobs?.some((j) => j.status === 'done')
          const hasPosting = jobs?.some((j) => j.status === 'posting')
          const hasParsing = jobs?.some(
            (j) => j.status === 'parsing' || j.status === 'posting'
          )
          if (hasPosting || hasParsing) setRetryStatus('writing')
          if (hasDone || Date.now() - start > maxWait) {
            setRetryStatus('done')
            loadSnapshot()
            return
          }
          setTimeout(poll, 4000)
        })
    }

    poll()
  }

  if (!activeOrgId) {
    return (
      <div className="snapshot-shell">
        <p>{t('common.loading')}</p>
      </div>
    )
  }

  return (
    <div className="snapshot-shell">
      <header className="snapshot-header">
        <h1 className="snapshot-header__title">{t('snapshot.title')}</h1>
        <p className="snapshot-header__subtitle">{t('snapshot.subtitle')}</p>
      </header>

      {loading ? (
        <p className="snapshot-loading">{t('common.loading')}</p>
      ) : hasData ? (
        <>
          <div className="snapshot-kpi-grid">
            <Card className="snapshot-kpi-card">
              <div className="snapshot-kpi-label">
                {t('snapshot.kpi.revenue')}
              </div>
              <div className="snapshot-kpi-value">
                {snapshot.revenue.toFixed(2)}
              </div>
              <div className="snapshot-kpi-hint">{t('snapshot.kpi.hint')}</div>
            </Card>
            <Card className="snapshot-kpi-card">
              <div className="snapshot-kpi-label">{t('snapshot.kpi.fees')}</div>
              <div className="snapshot-kpi-value">
                {snapshot.fees.toFixed(2)}
              </div>
              <div className="snapshot-kpi-hint">{t('snapshot.kpi.hint')}</div>
            </Card>
            <Card className="snapshot-kpi-card">
              <div className="snapshot-kpi-label">{t('snapshot.kpi.net')}</div>
              <div className="snapshot-kpi-value">
                {snapshot.net.toFixed(2)}
              </div>
              <div className="snapshot-kpi-hint">{t('snapshot.kpi.hint')}</div>
            </Card>
            <Card className="snapshot-kpi-card">
              <div className="snapshot-kpi-label">
                {t('snapshot.kpi.cash')}
              </div>
              <div className="snapshot-kpi-value">
                {snapshot.cashImpact.toFixed(2)}
              </div>
              <div className="snapshot-kpi-hint">{t('snapshot.kpi.hint')}</div>
            </Card>
          </div>

          <section className="snapshot-next">
            <h2 className="snapshot-next__title">
              {t('snapshot.next.title')}
            </h2>
            <div className="snapshot-next-grid">
              <Card className="snapshot-next-card">
                <h3 className="snapshot-next-card__title">
                  {t('snapshot.next.createProduct.title')}
                </h3>
                <p className="snapshot-next-card__desc">
                  {t('snapshot.next.createProduct.desc')}
                </p>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => navigate('/app/projects')}
                >
                  {t('snapshot.actions.viewProducts')}
                </Button>
              </Card>
              <Card className="snapshot-next-card">
                <h3 className="snapshot-next-card__title">
                  {t('snapshot.next.viability.title')}
                </h3>
                <p className="snapshot-next-card__desc">
                  {t('snapshot.next.viability.desc')}
                </p>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => navigate('/app/projects')}
                >
                  {t('common.buttons.open')}
                </Button>
              </Card>
              <Card className="snapshot-next-card">
                <h3 className="snapshot-next-card__title">
                  {t('snapshot.next.quotes.title')}
                </h3>
                <p className="snapshot-next-card__desc">
                  {t('snapshot.next.quotes.desc')}
                </p>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => navigate('/app/projects')}
                >
                  {t('common.buttons.open')}
                </Button>
              </Card>
            </div>
          </section>
        </>
      ) : (
        <Card className="snapshot-empty">
          <h2 className="snapshot-empty__title">
            {t('snapshot.empty.title')}
          </h2>
          <p className="snapshot-empty__subtitle">
            {t('snapshot.empty.subtitle')}
          </p>
          {error && <p className="snapshot-empty__error">{error}</p>}
          <div className="snapshot-empty__actions">
            {activeConnection ? (
              <Button
                variant="primary"
                size="md"
                disabled={retryStatus === 'requesting' || retryStatus === 'processing' || retryStatus === 'writing'}
                loading={
                  retryStatus === 'requesting' ||
                  retryStatus === 'processing' ||
                  retryStatus === 'writing'
                }
                onClick={handleRetryImport}
              >
                {t('snapshot.actions.retryImport')}
              </Button>
            ) : (
              <Button
                variant="primary"
                size="md"
                onClick={() => navigate('/activation')}
              >
                {t('activation.connect.cta')}
              </Button>
            )}
            <Button
              variant="secondary"
              size="md"
              onClick={() => navigate('/app')}
            >
              {t('snapshot.actions.openDashboard')}
            </Button>
          </div>
          {retryStatus !== 'idle' && retryStatus !== 'error' && (
            <p className="snapshot-empty__hint">
              {retryStatus === 'requesting' && t('activation.import.requesting')}
              {retryStatus === 'processing' && t('activation.import.processing')}
              {retryStatus === 'writing' && t('activation.import.writing')}
              {retryStatus === 'done' && t('activation.import.done')}
            </p>
          )}
        </Card>
      )}

      <div className="snapshot-cta-row">
        <Button
          variant="primary"
          size="md"
          onClick={() => navigate('/app')}
        >
          {t('snapshot.actions.openDashboard')}
        </Button>
        <Button
          variant="secondary"
          size="md"
          onClick={() => navigate('/app/projects')}
        >
          {t('snapshot.actions.viewProducts')}
        </Button>
      </div>
    </div>
  )
}

