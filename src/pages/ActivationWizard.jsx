import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWorkspace } from '../contexts/WorkspaceContext'
import { supabase, getCurrentUserId } from '../lib/supabase'
import { showToast } from '../components/Toast'
import Button from '../components/ui/Button'
import useT from '../hooks/useT'

const STEP_CONFIRM_ORG = 1
const STEP_CHOOSE_PATH = 2
const STEP_SETUP_DONE = 3
const STEP_AMAZON_CONNECT = 4
const STEP_AMAZON_IMPORT = 5
const STEP_AMAZON_SNAPSHOT = 6
const STEP_MORE_TOOLS = 7

const SPAPI_STATE_KEY = 'spapi_oauth_state'
const SPAPI_REDIRECT_URI_KEY = 'spapi_oauth_redirect_uri'
const ACTIVATION_AMAZON_PATH_KEY = 'activation_amazon_path'

export default function ActivationWizard() {
  const { activeOrgId } = useWorkspace()
  const navigate = useNavigate()
  const [step, setStep] = useState(STEP_CONFIRM_ORG)
  const [org, setOrg] = useState(null)
  const [baseCurrency, setBaseCurrency] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitLoading, setSubmitLoading] = useState(false)
  const [submitError, setSubmitError] = useState(null)

  const [spapiConnections, setSpapiConnections] = useState([])
  const [connecting, setConnecting] = useState(false)
  const [importStatus, setImportStatus] = useState('idle') // idle | requesting | processing | writing | done
  const [importDone, setImportDone] = useState(false)
  const [snapshot, setSnapshot] = useState(null) // { revenue, fees, net, cashImpact, hasData }
  const [snapshotLoading, setSnapshotLoading] = useState(false)
  const [activationPath, setActivationPath] = useState('setup')

  const t = useT()

  const loadSpapiConnections = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc('get_spapi_connection_safe')
      if (error) throw error
      setSpapiConnections(data || [])
    } catch (err) {
      console.error('Load SP-API connections:', err)
    }
  }, [])

  useEffect(() => {
    if (!activeOrgId) {
      setLoading(false)
      return
    }
    let cancelled = false
    async function fetchOrg() {
      try {
        const { data: orgRow, error: orgErr } = await supabase
          .from('orgs')
          .select('id, name')
          .eq('id', activeOrgId)
          .single()
        if (orgErr || !orgRow) {
          if (!cancelled) setOrg(null)
          return
        }
        if (!cancelled) setOrg(orgRow)

        const { data: settings } = await supabase
          .from('org_settings')
          .select('base_currency')
          .eq('org_id', activeOrgId)
          .maybeSingle()
        if (!cancelled && settings?.base_currency) setBaseCurrency(settings.base_currency)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchOrg()
    return () => { cancelled = true }
  }, [activeOrgId])

  // Restore Amazon path after OAuth redirect
  useEffect(() => {
    if (sessionStorage.getItem(ACTIVATION_AMAZON_PATH_KEY)) setStep(STEP_AMAZON_CONNECT)
    loadSpapiConnections()
  }, [loadSpapiConnections])

  // OAuth return: Amazon log-in URI redirect (same as AmazonImports)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const amazonCallbackUri = params.get('amazon_callback_uri')
    const amazonState = params.get('amazon_state')
    if (amazonCallbackUri && amazonState) {
      const state = sessionStorage.getItem(SPAPI_STATE_KEY)
      const redirectUri = sessionStorage.getItem(SPAPI_REDIRECT_URI_KEY)
      if (state && redirectUri) {
        const redirectUrl = `${amazonCallbackUri}?${new URLSearchParams({
          redirect_uri: redirectUri,
          amazon_state: amazonState,
          state
        })}`
        sessionStorage.removeItem(SPAPI_STATE_KEY)
        sessionStorage.removeItem(SPAPI_REDIRECT_URI_KEY)
        window.location.href = redirectUrl
        return
      }
    }
    const spapi = params.get('spapi')
    const message = params.get('message')
    if (spapi === 'success') {
      sessionStorage.removeItem(ACTIVATION_AMAZON_PATH_KEY)
      showToast('Connexió Amazon SP-API connectada', 'success')
      loadSpapiConnections()
      window.history.replaceState({}, '', window.location.pathname)
    } else if (spapi === 'error' && message) {
      showToast(`SP-API: ${decodeURIComponent(message)}`, 'error')
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [loadSpapiConnections])

  const handleChooseSetup = () => {
    setActivationPath('setup')
    setStep(STEP_SETUP_DONE)
  }

  const handleChooseAmazon = () => {
    sessionStorage.setItem(ACTIVATION_AMAZON_PATH_KEY, '1')
    setActivationPath('amazon')
    setStep(STEP_AMAZON_CONNECT)
  }

  const handleConnectAmazon = async () => {
    if (!activeOrgId) return
    setConnecting(true)
    try {
      const userId = await getCurrentUserId()
      if (!userId) {
        showToast('Sessió no vàlida', 'error')
        return
      }
      const { data, error } = await supabase.functions.invoke('spapi-oauth-init', {
        body: { org_id: activeOrgId, user_id: userId, region: 'EU', marketplace_ids: [] }
      })
      if (error) throw error
      if (data?.error) throw new Error(data.error)
      const consentUrl = data?.consent_url
      const state = data?.state
      const redirectUri = data?.redirect_uri
      if (!consentUrl || !state) {
        showToast('No s\'ha pogut iniciar OAuth', 'error')
        return
      }
      sessionStorage.setItem(SPAPI_STATE_KEY, state)
      if (redirectUri) sessionStorage.setItem(SPAPI_REDIRECT_URI_KEY, redirectUri)
      window.location.href = consentUrl
    } catch (err) {
      console.error('SP-API init error:', err)
      showToast(err?.message || 'Error connectant amb Amazon SP-API', 'error')
    } finally {
      setConnecting(false)
    }
  }

  const activeConnection = spapiConnections.find(c => c.status === 'active')

  // Step 5: trigger ingest on enter, then poll
  useEffect(() => {
    if (step !== STEP_AMAZON_IMPORT || !activeOrgId || !activeConnection?.id) return

    let cancelled = false
    let pollTimer

    async function run() {
      setImportStatus('requesting')
      try {
        const { data, error } = await supabase.functions.invoke('spapi-settlement-worker', {
          method: 'POST',
          body: { connection_id: activeConnection.id }
        })
        if (cancelled) return
        if (error) throw error
        if (data?.error) throw new Error(data.error)
      } catch (err) {
        if (!cancelled) {
          setImportStatus('done')
          setImportDone(true)
          showToast(err?.message || 'Error requesting import', 'error')
        }
        return
      }

      setImportStatus('processing')
      const start = Date.now()
      const maxWait = 120000

      function poll() {
        if (cancelled) return
        supabase
          .from('amazon_import_jobs')
          .select('id, status')
          .eq('org_id', activeOrgId)
          .order('created_at', { ascending: false })
          .limit(5)
          .then(({ data: jobs }) => {
            if (cancelled) return
            const hasDone = jobs?.some(j => j.status === 'done')
            const hasPosting = jobs?.some(j => j.status === 'posting')
            const hasParsing = jobs?.some(j => j.status === 'parsing' || j.status === 'posting')
            if (hasPosting || hasParsing) setImportStatus('writing')
            if (hasDone || Date.now() - start > maxWait) {
              setImportStatus('done')
              setImportDone(true)
              return
            }
            pollTimer = setTimeout(poll, 4000)
          })
      }
      pollTimer = setTimeout(poll, 4000)
    }

    run()
    return () => {
      cancelled = true
      if (pollTimer) clearTimeout(pollTimer)
    }
  }, [step, activeOrgId, activeConnection?.id])

  // Step 6: load snapshot (last 30 days)
  useEffect(() => {
    if (step !== STEP_AMAZON_SNAPSHOT || !activeOrgId) return
    let cancelled = false
    setSnapshotLoading(true)
    const from = new Date()
    from.setDate(from.getDate() - 30)
    const fromStr = from.toISOString().slice(0, 10)

    supabase
      .from('financial_ledger')
      .select('type, amount_base_pnl, amount_base_cash')
      .eq('org_id', activeOrgId)
      .eq('scope', 'company')
      .in('status', ['posted', 'locked'])
      .gte('occurred_at', fromStr)
      .then(({ data: rows, error }) => {
        if (cancelled) return
        setSnapshotLoading(false)
        if (error) {
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
        const cashImpact = list.reduce((s, r) => s + (Number(r.amount_base_cash) || 0), 0)
        setSnapshot({
          revenue,
          fees,
          net,
          cashImpact,
          hasData: list.length > 0
        })
      })
    return () => { cancelled = true }
  }, [step, activeOrgId])

  const handleEnterDashboard = async (activationPath = 'setup') => {
    if (!activeOrgId) return
    setSubmitError(null)
    setSubmitLoading(true)
    try {
      const { error } = await supabase
        .from('org_activation')
        .insert({
          org_id: activeOrgId,
          activation_path: activationPath,
        })
      if (error) {
        if (error.code === '23505') {
          sessionStorage.removeItem(ACTIVATION_AMAZON_PATH_KEY)
          navigate('/app', { replace: true })
          return
        }
        setSubmitError(error.message || 'Error saving activation')
        showToast(error.message || 'Error saving activation', 'error')
        return
      }
      sessionStorage.removeItem(ACTIVATION_AMAZON_PATH_KEY)
      navigate('/app', { replace: true })
    } catch (err) {
      setSubmitError(err?.message || 'Error')
      showToast(err?.message || 'Error', 'error')
    } finally {
      setSubmitLoading(false)
    }
  }

  const cardStyle = {
    maxWidth: 520,
    margin: '0 auto',
    padding: '24px',
    borderRadius: 12,
    boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
    backgroundColor: 'var(--page-bg, #fff)',
  }

  const buttonStyle = {
    padding: '10px 20px',
    borderRadius: 8,
    border: 'none',
    cursor: 'pointer',
    fontSize: 15,
    fontWeight: 500,
  }

  if (!activeOrgId) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={cardStyle}>
          <p>No hi ha cap organització seleccionada. Torna a l&apos;inici i selecciona una org.</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ color: 'var(--text-secondary, #6b7280)' }}>Carregant...</div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, boxSizing: 'border-box' }}>
      <div style={cardStyle}>

        {step === STEP_CONFIRM_ORG && (
          <>
            <h2 style={{ margin: '0 0 8px', fontSize: 20 }}>Confirm your organization</h2>
            <p style={{ margin: '0 0 16px', color: 'var(--text-secondary, #6b7280)' }}>
              <strong>{org?.name ?? 'Organization'}</strong>
            </p>
            {baseCurrency ? (
              <p style={{ margin: '0 0 20px', fontSize: 14 }}>
                Base currency: <strong>{baseCurrency}</strong>
              </p>
            ) : (
              <p style={{ margin: '0 0 20px', fontSize: 14, color: 'var(--text-secondary, #6b7280)' }}>
                You can set currency and marketplace later in Settings.
              </p>
            )}
            <button
              type="button"
              style={{ ...buttonStyle, backgroundColor: 'var(--primary, #2563eb)', color: '#fff' }}
              onClick={() => setStep(STEP_CHOOSE_PATH)}
            >
              Continue
            </button>
          </>
        )}

        {step === STEP_CHOOSE_PATH && (
          <>
            <h2 style={{ margin: '0 0 16px', fontSize: 20 }}>Choose your path</h2>
            <p style={{ margin: '0 0 20px', color: 'var(--text-secondary, #6b7280)' }}>
              How do you want to get started?
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <button
                type="button"
                style={{ ...buttonStyle, backgroundColor: 'var(--primary, #2563eb)', color: '#fff', textAlign: 'left', padding: 14 }}
                onClick={handleChooseAmazon}
              >
                Connect Amazon & import real data
              </button>
              <button
                type="button"
                style={{ ...buttonStyle, backgroundColor: 'var(--surface, #f3f4f6)', color: 'var(--text, #111)' }}
                onClick={handleChooseSetup}
              >
                Start in Setup Mode (no Amazon yet)
              </button>
            </div>
          </>
        )}

        {step === STEP_AMAZON_CONNECT && (
          <>
            <h2 style={{ margin: '0 0 16px', fontSize: 20 }}>Connect Amazon</h2>
            {activeConnection ? (
              <>
                <p style={{ margin: '0 0 16px', color: '#22c55e', fontWeight: 600 }}>Connected ✓</p>
                <p style={{ margin: '0 0 20px', fontSize: 14, color: 'var(--text-secondary, #6b7280)' }}>
                  Region: {activeConnection.region} · Seller: {activeConnection.seller_id}
                </p>
                <button
                  type="button"
                  style={{ ...buttonStyle, backgroundColor: 'var(--primary, #2563eb)', color: '#fff' }}
                  onClick={() => setStep(STEP_AMAZON_IMPORT)}
                >
                  Continue
                </button>
              </>
            ) : (
              <>
                <p style={{ margin: '0 0 20px', color: 'var(--text-secondary, #6b7280)' }}>
                  Connect your Amazon Seller Central account to import settlement data (last 30 days).
                </p>
                <button
                  type="button"
                  style={{ ...buttonStyle, backgroundColor: 'var(--primary, #2563eb)', color: '#fff' }}
                  onClick={handleConnectAmazon}
                  disabled={connecting}
                >
                  {connecting ? 'Redirecting…' : 'Connect Amazon (SP-API)'}
                </button>
              </>
            )}
          </>
        )}

        {step === STEP_AMAZON_IMPORT && (
          <>
            <h2 style={{ margin: '0 0 16px', fontSize: 20 }}>Import last 30 days</h2>
            {importStatus === 'requesting' && (
              <p style={{ margin: '0 0 20px', color: 'var(--text-secondary, #6b7280)' }}>Requesting Amazon report</p>
            )}
            {importStatus === 'processing' && (
              <p style={{ margin: '0 0 20px', color: 'var(--text-secondary, #6b7280)' }}>Processing data</p>
            )}
            {(importStatus === 'writing' || (importStatus === 'done' && !importDone)) && (
              <p style={{ margin: '0 0 20px', color: 'var(--text-secondary, #6b7280)' }}>Writing ledger</p>
            )}
            {importStatus === 'done' && importDone && (
              <>
                <p style={{ margin: '0 0 20px', color: 'var(--text-secondary, #6b7280)' }}>Import complete.</p>
                <button
                  type="button"
                  style={{ ...buttonStyle, backgroundColor: 'var(--primary, #2563eb)', color: '#fff' }}
                  onClick={() => setStep(STEP_AMAZON_SNAPSHOT)}
                >
                  Continue to snapshot
                </button>
              </>
            )}
            {importStatus === 'idle' && (
              <p style={{ margin: '0 0 20px', color: 'var(--text-secondary, #6b7280)' }}>Starting import…</p>
            )}
          </>
        )}

        {step === STEP_AMAZON_SNAPSHOT && (
          <>
            <h2 style={{ margin: '0 0 16px', fontSize: 20 }}>Your snapshot</h2>
            {snapshotLoading && (
              <p style={{ margin: '0 0 20px', color: 'var(--text-secondary, #6b7280)' }}>Loading…</p>
            )}
            {!snapshotLoading && snapshot && (
              <>
                {snapshot.hasData ? (
                  <div style={{ marginBottom: 20, fontSize: 14 }}>
                    <p style={{ margin: '4px 0' }}><strong>Revenue:</strong> {snapshot.revenue.toFixed(2)}</p>
                    <p style={{ margin: '4px 0' }}><strong>Fees:</strong> {snapshot.fees.toFixed(2)}</p>
                    <p style={{ margin: '4px 0' }}><strong>Net:</strong> {snapshot.net.toFixed(2)}</p>
                    <p style={{ margin: '4px 0' }}><strong>Cash impact:</strong> {snapshot.cashImpact.toFixed(2)}</p>
                  </div>
                ) : (
                  <p style={{ margin: '0 0 20px', color: 'var(--text-secondary, #6b7280)' }}>
                    No activity detected yet in the last 30 days. You can still enter the dashboard and connect more data later.
                  </p>
                )}
                {submitError && (
                  <p style={{ margin: '0 0 12px', color: 'var(--error, #dc2626)', fontSize: 14 }}>{submitError}</p>
                )}
                <button
                  type="button"
                  style={{ ...buttonStyle, backgroundColor: 'var(--primary, #2563eb)', color: '#fff' }}
                  onClick={() => setStep(STEP_MORE_TOOLS)}
                  disabled={submitLoading}
                >
                  {submitLoading ? 'Saving...' : 'Enter Dashboard'}
                </button>
              </>
            )}
          </>
        )}

        {step === STEP_SETUP_DONE && (
          <>
            <h2 style={{ margin: '0 0 8px', fontSize: 20 }}>Setup mode activated</h2>
            <p style={{ margin: '0 0 20px', color: 'var(--text-secondary, #6b7280)' }}>
              You can create products and projects, plan costs and prepare your launch.
              You can connect Amazon later in Settings.
            </p>
            {submitError && (
              <p style={{ margin: '0 0 12px', color: 'var(--error, #dc2626)', fontSize: 14 }}>{submitError}</p>
            )}
            <button
              type="button"
              style={{ ...buttonStyle, backgroundColor: 'var(--primary, #2563eb)', color: '#fff' }}
              onClick={() => setStep(STEP_MORE_TOOLS)}
              disabled={submitLoading}
            >
              {submitLoading ? 'Saving...' : 'Enter Dashboard'}
            </button>
          </>
        )}

        {step === STEP_MORE_TOOLS && (
          <>
            <h2 style={{ margin: '0 0 8px', fontSize: 20 }}>{t('activation.moreTools.title')}</h2>
            <p style={{ margin: '0 0 20px', color: 'var(--text-secondary, #6b7280)', fontSize: 14 }}>
              {t('activation.moreTools.subtitle')}
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 20 }}>
              <div style={{ padding: 12, borderRadius: 8, border: '1px solid var(--border-1)', background: 'var(--surface-bg-2)' }}>
                <div style={{ fontWeight: 600, marginBottom: 6 }}>Google Drive</div>
                <span style={{ fontSize: 11, padding: '2px 6px', borderRadius: 999, background: 'var(--surface-bg)', border: '1px solid var(--border-1)', color: 'var(--text-secondary)' }}>
                  Coming soon
                </span>
              </div>
              <div style={{ padding: 12, borderRadius: 8, border: '1px solid var(--border-1)', background: 'var(--surface-bg-2)' }}>
                <div style={{ fontWeight: 600, marginBottom: 6 }}>Outlook / Office 365</div>
                <span style={{ fontSize: 11, padding: '2px 6px', borderRadius: 999, background: 'var(--surface-bg)', border: '1px solid var(--border-1)', color: 'var(--text-secondary)' }}>
                  Coming soon
                </span>
              </div>
              <div style={{ padding: 12, borderRadius: 8, border: '1px solid var(--border-1)', background: 'var(--surface-bg-2)' }}>
                <div style={{ fontWeight: 600, marginBottom: 6 }}>Slack</div>
                <span style={{ fontSize: 11, padding: '2px 6px', borderRadius: 999, background: 'var(--surface-bg)', border: '1px solid var(--border-1)', color: 'var(--text-secondary)' }}>
                  Coming soon
                </span>
              </div>
            </div>
            {submitError && (
              <p style={{ margin: '0 0 12px', color: 'var(--error, #dc2626)', fontSize: 14 }}>{submitError}</p>
            )}
            <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
              <Button
                variant="primary"
                size="md"
                disabled={submitLoading}
                onClick={() => handleEnterDashboard(activationPath)}
              >
                {submitLoading ? 'Saving...' : 'Enter Dashboard'}
              </Button>
              <Button
                variant="secondary"
                size="md"
                disabled={submitLoading}
                onClick={() => handleEnterDashboard(activationPath)}
              >
                {t('common.buttons.skipForNow')}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
