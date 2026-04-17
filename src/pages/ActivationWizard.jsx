import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWorkspace } from '../contexts/WorkspaceContext'
import { supabase, getCurrentUserId } from '../lib/supabase'
import { getOrgEntitlements, hasOrgFeature } from '../lib/billing/entitlements'
import { showToast } from '../components/Toast'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Stepper from '../components/ui/Stepper'
import NextStepCard from '../components/assistant/NextStepCard'
import useT from '../hooks/useT'

const STEP_CONFIRM_ORG = 1
const STEP_TOOLS_USED = 8
const STEP_HOW_FOUND = 9
const STEP_CHOOSE_PATH = 2
const STEP_SETUP_DONE = 3
const STEP_AMAZON_CONNECT = 4
const STEP_AMAZON_IMPORT = 5
const STEP_AMAZON_SNAPSHOT = 6
const STEP_MORE_TOOLS = 7

const SPAPI_STATE_KEY = 'spapi_oauth_state'
const SPAPI_REDIRECT_URI_KEY = 'spapi_oauth_redirect_uri'
const ACTIVATION_AMAZON_PATH_KEY = 'activation_amazon_path'
const activationTs = () => new Date().toISOString()
const activationLog = (phase, payload = {}) => console.info('[ActivationWizard]', { ts: activationTs(), phase, ...payload })
const activationWarn = (phase, payload = {}) => console.warn('[ActivationWizard]', { ts: activationTs(), phase, ...payload })

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
  const [importError, setImportError] = useState(null)
  const [selectedTools, setSelectedTools] = useState([])
  const [howFound, setHowFound] = useState(null)

  const TOOLS_LIST = [
    { id: 'sellerboard', name: 'Sellerboard',  domain: 'sellerboard.com' },
    { id: 'helium10',   name: 'Helium 10',    domain: 'helium10.com' },
    { id: 'jungle',     name: 'Jungle Scout', domain: 'junglescout.com' },
    { id: 'keepa',      name: 'Keepa',        domain: 'keepa.com' },
    { id: 'holded',     name: 'Holded',       domain: 'holded.com' },
    { id: 'excel',      name: 'Excel / CSV',  domain: null },
    { id: 'none',       name: 'Cap',          domain: null },
  ]
  const HOW_FOUND_LIST = [
    { id: 'youtube',  label: '📺 YouTube' },
    { id: 'google',   label: '🔍 Google' },
    { id: 'reddit',   label: '🟠 Reddit' },
    { id: 'facebook', label: '📘 Facebook / Instagram' },
    { id: 'friend',   label: '🤝 Un amic / col·lega' },
    { id: 'ai',       label: '🤖 Eines IA (ChatGPT, etc.)' },
    { id: 'other',    label: '✨ Altre' },
  ]
  const toggleTool = id => setSelectedTools(prev =>
    prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
  )

  const t = useT()

  const loadSpapiConnections = useCallback(async () => {
    try {
      activationLog('loadSpapiConnections.start', { activeOrgId })
      const { data, error } = await supabase.rpc('get_spapi_connection_safe')
      if (error) throw error
      activationLog('loadSpapiConnections.resolved', {
        activeOrgId,
        count: Array.isArray(data) ? data.length : 0,
      })
      setSpapiConnections(data || [])
    } catch (err) {
      activationWarn('loadSpapiConnections.failed', {
        activeOrgId,
        message: err instanceof Error ? err.message : String(err),
      })
      console.error('Load SP-API connections:', err)
    }
  }, [])

  useEffect(() => {
    if (!activeOrgId) {
      activationWarn('fetchOrg.skipped.noActiveOrgId')
      setLoading(false)
      return
    }
    let cancelled = false
    async function fetchOrg() {
      const startedAt = Date.now()
      activationLog('fetchOrg.start', { activeOrgId })
      try {
        const { data: orgRow, error: orgErr } = await supabase
          .from('orgs')
          .select('id, name')
          .eq('id', activeOrgId)
          .single()
        if (orgErr || !orgRow) {
          activationWarn('fetchOrg.orgMissingOrError', {
            activeOrgId,
            message: orgErr?.message ?? null,
            elapsedMs: Date.now() - startedAt,
          })
          if (!cancelled) setOrg(null)
          return
        }
        activationLog('fetchOrg.orgResolved', {
          activeOrgId,
          orgName: orgRow.name,
          elapsedMs: Date.now() - startedAt,
        })
        if (!cancelled) setOrg(orgRow)

        const { data: settings } = await supabase
          .from('org_settings')
          .select('base_currency')
          .eq('org_id', activeOrgId)
          .maybeSingle()
        activationLog('fetchOrg.settingsResolved', {
          activeOrgId,
          hasBaseCurrency: Boolean(settings?.base_currency),
          elapsedMs: Date.now() - startedAt,
        })
        if (!cancelled && settings?.base_currency) setBaseCurrency(settings.base_currency)
      } finally {
        activationLog('fetchOrg.finally', { activeOrgId, elapsedMs: Date.now() - startedAt })
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

  useEffect(() => {
    activationLog('state.snapshot', {
      activeOrgId,
      step,
      loading,
      submitLoading,
      activationPath,
      importStatus,
      importDone,
      snapshotLoading,
      hasOrg: Boolean(org),
      hasBaseCurrency: Boolean(baseCurrency),
      spapiConnectionsCount: spapiConnections.length,
      hasSubmitError: Boolean(submitError),
      hasImportError: Boolean(importError),
    })
  }, [
    activeOrgId,
    step,
    loading,
    submitLoading,
    activationPath,
    importStatus,
    importDone,
    snapshotLoading,
    org,
    baseCurrency,
    spapiConnections.length,
    submitError,
    importError,
  ])

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
      showToast(t('activation.toasts.spapiConnected'), 'success')
      loadSpapiConnections()
      window.history.replaceState({}, '', window.location.pathname)
    } else if (spapi === 'error' && message) {
      showToast(`${t('activation.toasts.spapiErrorPrefix')} ${decodeURIComponent(message)}`, 'error')
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [loadSpapiConnections, t])

  const handleChooseSetup = () => {
    setActivationPath('setup')
    setStep(STEP_SETUP_DONE)
  }

  const handleChooseAmazon = () => {
    sessionStorage.setItem(ACTIVATION_AMAZON_PATH_KEY, '1')
    setActivationPath('amazon')
    setStep(STEP_AMAZON_CONNECT)
  }

  const [demoLoading, setDemoLoading] = useState(false)
  const handleChooseDemo = async () => {
    if (demoLoading) return
    setDemoLoading(true)
    try {
      const { generateDemoData } = await import('../lib/demoSeed')
      await generateDemoData()
      localStorage.setItem('demo_mode_toggle', 'true')
      setActivationPath('demo')
      showToast(t('activation.toasts.demoLoaded', 'Dades demo carregades'), 'success')
      setStep(STEP_SETUP_DONE)
    } catch (err) {
      console.error('Demo load failed:', err)
      showToast(err?.message || t('activation.toasts.demoFailed', 'Error carregant dades demo'), 'error')
    } finally {
      setDemoLoading(false)
    }
  }

  const handleConnectAmazon = async () => {
    if (!activeOrgId) return
    setConnecting(true)
    try {
      const userId = await getCurrentUserId()
      if (!userId) {
        showToast(t('activation.toasts.invalidSession'), 'error')
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
        showToast(t('activation.toasts.oauthStartFailed'), 'error')
        return
      }
      sessionStorage.setItem(SPAPI_STATE_KEY, state)
      if (redirectUri) sessionStorage.setItem(SPAPI_REDIRECT_URI_KEY, redirectUri)
      window.location.href = consentUrl
    } catch (err) {
      console.error('SP-API init error:', err)
      showToast(err?.message || t('activation.toasts.genericError'), 'error')
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
      setImportError(null)
      setImportStatus('requesting')
      try {
        const entitlements = await getOrgEntitlements(supabase, activeOrgId)
        if (!hasOrgFeature(entitlements, 'amazon_ingest')) {
          if (!cancelled) {
            setImportStatus('done')
            setImportDone(true)
            showToast(t('activation.toasts.amazonIngestUnavailable'), 'error')
            setImportError('amazon_ingest_not_available')
          }
          return
        }
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
          showToast(err?.message || t('activation.toasts.importRequestError'), 'error')
          setImportError('request_failed')
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
  }, [step, activeOrgId, activeConnection?.id, t])

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

  const saveOnboardingData = async ({ tools = selectedTools, found = howFound } = {}) => {
    if (!activeOrgId) return
    try {
      await supabase
        .from('org_onboarding_data')
        .upsert(
          {
            org_id: activeOrgId,
            tools_used: tools,
            how_found: found ?? null,
          },
          { onConflict: 'org_id' }
        )
    } catch (err) {
      // Non-blocking — wizard continues even if save fails
      activationWarn('saveOnboardingData.failed', { message: err?.message })
    }
  }

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
        setSubmitError(error.message || t('activation.toasts.saveActivationError'))
        showToast(error.message || t('activation.toasts.saveActivationError'), 'error')
        return
      }
      sessionStorage.removeItem(ACTIVATION_AMAZON_PATH_KEY)
      if (activationPath === 'amazon') {
        navigate('/app/snapshot', { replace: true })
      } else {
        navigate('/app', { replace: true })
      }
    } catch (err) {
      setSubmitError(err?.message || t('activation.toasts.genericError'))
      showToast(err?.message || t('activation.toasts.genericError'), 'error')
    } finally {
      setSubmitLoading(false)
    }
  }

  if (!activeOrgId) {
    return (
      <div className="wizard-shell">
        <Card elevated className="wizard-card">
          <h1 className="wizard-title">{t('activation.welcome.title')}</h1>
          <p className="wizard-subtitle">{t('activation.welcome.noOrg')}</p>
          <NextStepCard
            title={t('activation.guidance.noOrg.title')}
            description={t('activation.guidance.noOrg.description')}
          />
        </Card>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="wizard-shell">
        <Card elevated className="wizard-card">
          <p className="wizard-subtitle">{t('common.loading')}</p>
        </Card>
      </div>
    )
  }

  const stepsForStepper = [
    { id: 'welcome',   label: t('activation.steps.welcome') },
    { id: 'tools',     label: t('activation.steps.tools', 'Eines') },
    { id: 'howFound',  label: t('activation.steps.howFound', 'Com ens has conegut') },
    { id: 'path',      label: t('activation.steps.path', 'Configuració') },
    { id: 'connect',   label: t('activation.steps.connect') },
    { id: 'import',    label: t('activation.steps.import') },
    { id: 'done',      label: t('activation.steps.done', 'Llest!') },
  ]

  let currentStepIndex = 0
  if (step === STEP_TOOLS_USED)       currentStepIndex = 1
  else if (step === STEP_HOW_FOUND)   currentStepIndex = 2
  else if (step === STEP_CHOOSE_PATH || step === STEP_SETUP_DONE) currentStepIndex = 3
  else if (step === STEP_AMAZON_CONNECT) currentStepIndex = 4
  else if (step === STEP_AMAZON_IMPORT || step === STEP_AMAZON_SNAPSHOT) currentStepIndex = 5
  else if (step === STEP_MORE_TOOLS)  currentStepIndex = 6

  return (
    <div className="wizard-shell">
      <Card elevated className="wizard-card">
        <Stepper steps={stepsForStepper} currentIndex={currentStepIndex} />

        {step === STEP_CONFIRM_ORG && (
          <div className="wizard-body">
            <h1 className="wizard-title">{t('activation.welcome.title')}</h1>
            <p className="wizard-subtitle">
              {t('activation.welcome.subtitle')}
            </p>
            {org && (
              <p className="wizard-subtitle">
                <strong>{org.name}</strong>
              </p>
            )}
            {baseCurrency ? (
              <p className="wizard-subtitle">
                {t('activation.welcome.baseCurrency', { currency: baseCurrency })}
              </p>
            ) : (
              <p className="wizard-subtitle">
                {t('activation.welcome.baseCurrencyMissing')}
              </p>
            )}
            <p className="wizard-subtitle wizard-subtitle--hint">
              {t('activation.welcome.flowHint')}
            </p>
            <NextStepCard
              title={t('activation.guidance.confirmOrg.title')}
              description={t('activation.guidance.confirmOrg.description')}
            />
            <div className="wizard-footer">
              <div className="wizard-footer__left" />
              <div className="wizard-footer__right">
                <Button variant="primary" size="md" onClick={() => setStep(STEP_TOOLS_USED)}>
                  {t('common.buttons.continue')}
                </Button>
              </div>
            </div>
          </div>
        )}

        {step === STEP_TOOLS_USED && (
          <div className="wizard-body">
            <h1 className="wizard-title">Quines eines uses?</h1>
            <p className="wizard-subtitle">Selecciona les que fas servir al teu negoci Amazon. Podrem personalitzar la teva experiència.</p>
            <div className="wz-pills-grid">
              {TOOLS_LIST.map(tool => (
                <button
                  key={tool.id}
                  className={`wz-pill${selectedTools.includes(tool.id) ? ' wz-pill--selected' : ''}`}
                  onClick={() => toggleTool(tool.id)}
                  type="button"
                >
                  {tool.domain ? (
                    <img
                      src={`https://logo.clearbit.com/${tool.domain}`}
                      alt={tool.name}
                      className="wz-pill__logo"
                      onError={e => { e.target.style.display = 'none' }}
                    />
                  ) : (
                    <span className="wz-pill__emoji">{tool.id === 'excel' ? '📊' : '⭕'}</span>
                  )}
                  {tool.name}
                </button>
              ))}
            </div>
            <div className="wizard-footer">
              <div className="wizard-footer__left">
                <Button variant="secondary" size="md" onClick={() => setStep(STEP_CONFIRM_ORG)}>
                  {t('common.buttons.back')}
                </Button>
              </div>
              <div className="wizard-footer__right">
                <Button variant="primary" size="md" onClick={() => setStep(STEP_HOW_FOUND)}>
                  {t('common.buttons.continue')}
                </Button>
              </div>
            </div>
          </div>
        )}

        {step === STEP_HOW_FOUND && (
          <div className="wizard-body">
            <h1 className="wizard-title">Com ens has conegut?</h1>
            <p className="wizard-subtitle">Ens ajuda a saber on trobar gent com tu.</p>
            <div className="wz-pills-grid wz-pills-grid--single">
              {HOW_FOUND_LIST.map(item => (
                <button
                  key={item.id}
                  className={`wz-pill${howFound === item.id ? ' wz-pill--selected' : ''}`}
                  onClick={() => setHowFound(item.id)}
                  type="button"
                >
                  {item.label}
                </button>
              ))}
            </div>
            <div className="wizard-footer">
              <div className="wizard-footer__left">
                <Button variant="secondary" size="md" onClick={() => setStep(STEP_TOOLS_USED)}>
                  {t('common.buttons.back')}
                </Button>
              </div>
              <div className="wizard-footer__right">
                <Button variant="ghost" size="md" onClick={async () => { await saveOnboardingData({ found: null }); setStep(STEP_CHOOSE_PATH) }} style={{ marginRight: 8 }}>
                  Omitir
                </Button>
                <Button variant="primary" size="md" onClick={async () => { await saveOnboardingData(); setStep(STEP_CHOOSE_PATH) }}>
                  {t('common.buttons.continue')}
                </Button>
              </div>
            </div>
          </div>
        )}

        {step === STEP_CHOOSE_PATH && (
          <div className="wizard-body">
            <h1 className="wizard-title">{t('activation.choosePath.title')}</h1>
            <p className="wizard-subtitle">
              {t('activation.choosePath.subtitle')}
            </p>
            <NextStepCard
              title={t('activation.guidance.choosePath.title')}
              description={t('activation.guidance.choosePath.description')}
            />
            <div className="wizard-tool-grid" style={{ marginBottom: 0 }}>
              <div className="wizard-tool-card" onClick={handleChooseAmazon}>
                <div className="wizard-tool-card__title">
                  {t('activation.choosePath.amazonLabel')}
                </div>
                <p className="wizard-tool-card__subtitle">
                  {t('activation.choosePath.amazonDescription')}
                </p>
              </div>
              <div className="wizard-tool-card" onClick={handleChooseSetup}>
                <div className="wizard-tool-card__title">
                  {t('activation.choosePath.setupLabel')}
                </div>
                <p className="wizard-tool-card__subtitle">
                  {t('activation.choosePath.setupDescription')}
                </p>
              </div>
              <div
                className="wizard-tool-card"
                onClick={handleChooseDemo}
                style={{ opacity: demoLoading ? 0.6 : 1, cursor: demoLoading ? 'wait' : 'pointer' }}
              >
                <div className="wizard-tool-card__title">
                  {demoLoading
                    ? t('activation.choosePath.demoLoading', 'Carregant dades demo…')
                    : t('activation.choosePath.demoLabel', 'Carregar dades demo')}
                </div>
                <p className="wizard-tool-card__subtitle">
                  {t('activation.choosePath.demoDescription', 'Explora l\'app amb 10 projectes, 8 proveïdors, finances i un informe IA d\'exemple.')}
                </p>
              </div>
            </div>
          </div>
        )}

        {step === STEP_AMAZON_CONNECT && (
          <div className="wizard-body">
            <h1 className="wizard-title">{t('activation.connect.title')}</h1>
            <NextStepCard
              title={t('activation.guidance.amazonConnect.title')}
              description={t('activation.guidance.amazonConnect.description')}
            />
            {activeConnection ? (
              <>
                <p className="wizard-subtitle">
                  {t('activation.connect.connected')}
                </p>
                <p className="wizard-subtitle">
                  {t('activation.connect.connectedMeta', {
                    region: activeConnection.region,
                    seller: activeConnection.seller_id,
                  })}
                </p>
                <div className="wizard-footer">
                  <div className="wizard-footer__left" />
                  <div className="wizard-footer__right">
                    <Button variant="primary" size="md" onClick={() => setStep(STEP_AMAZON_IMPORT)}>
                      {t('common.buttons.continue')}
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <p className="wizard-subtitle">
                  {t('activation.connect.description')}
                </p>
                <div className="wizard-footer">
                  <div className="wizard-footer__left" />
                  <div className="wizard-footer__right">
                    <Button
                      variant="primary"
                      size="md"
                      disabled={connecting}
                      loading={connecting}
                      onClick={handleConnectAmazon}
                    >
                      {connecting
                        ? t('activation.connect.redirecting')
                        : t('activation.connect.cta')}
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {step === STEP_AMAZON_IMPORT && (
          <div className="wizard-body">
            <h1 className="wizard-title">{t('activation.import.title')}</h1>
            <p className="wizard-subtitle">
              {t('activation.import.intro')}
            </p>
            <NextStepCard
              title={t('activation.guidance.amazonImport.title')}
              description={
                importError
                  ? t('activation.guidance.amazonImport.descriptionError')
                  : t('activation.guidance.amazonImport.description')
              }
            />
            <ul className="wizard-subtitle">
              <li>
                {importStatus === 'requesting'
                  ? `• ${t('activation.import.requesting')}`
                  : t('activation.import.requesting')}
              </li>
              <li>
                {importStatus === 'processing'
                  ? `• ${t('activation.import.processing')}`
                  : t('activation.import.processing')}
              </li>
              <li>
                {importStatus === 'writing'
                  ? `• ${t('activation.import.writing')}`
                  : t('activation.import.writing')}
              </li>
              <li>
                {importStatus === 'done'
                  ? `• ${t('activation.import.done')}`
                  : t('activation.import.idle')}
              </li>
            </ul>
            {importError && (
              <div style={{ marginTop: 16 }}>
                <p className="wizard-subtitle" style={{ color: 'var(--color-danger)', fontSize: 14 }}>
                  {t('activation.import.errorGeneric')}
                </p>
                <div className="wizard-footer">
                  <div className="wizard-footer__left">
                    <Button
                      variant="secondary"
                      size="md"
                      onClick={() => {
                        // restart import step to trigger effect again
                        setImportDone(false)
                        setStep(STEP_AMAZON_IMPORT)
                      }}
                    >
                      {t('activation.import.retry')}
                    </Button>
                  </div>
                  <div className="wizard-footer__right">
                    <Button
                      variant="primary"
                      size="md"
                      onClick={() => setStep(STEP_AMAZON_SNAPSHOT)}
                    >
                      {t('activation.import.skipToSnapshot')}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {step === STEP_AMAZON_SNAPSHOT && (
          <div className="wizard-body">
            <h1 className="wizard-title">{t('activation.snapshot.title')}</h1>
            <NextStepCard
              title={t('activation.guidance.amazonSnapshot.title')}
              description={t('activation.guidance.amazonSnapshot.description')}
            />
            {snapshotLoading && (
              <p className="wizard-subtitle">{t('common.loading')}</p>
            )}
            {!snapshotLoading && snapshot && (
              <>
                {snapshot.hasData ? (
                  <div className="wizard-kpis">
                    <div className="wizard-kpi">
                      <div className="wizard-kpi__label">{t('activation.snapshot.revenue')}</div>
                      <div className="wizard-kpi__value">{snapshot.revenue.toFixed(2)}</div>
                    </div>
                    <div className="wizard-kpi">
                      <div className="wizard-kpi__label">{t('activation.snapshot.fees')}</div>
                      <div className="wizard-kpi__value">{snapshot.fees.toFixed(2)}</div>
                    </div>
                    <div className="wizard-kpi">
                      <div className="wizard-kpi__label">{t('activation.snapshot.net')}</div>
                      <div className="wizard-kpi__value">{snapshot.net.toFixed(2)}</div>
                    </div>
                    <div className="wizard-kpi">
                      <div className="wizard-kpi__label">{t('activation.snapshot.cashImpact')}</div>
                      <div className="wizard-kpi__value">{snapshot.cashImpact.toFixed(2)}</div>
                    </div>
                  </div>
                ) : (
                  <p className="wizard-subtitle">
                    {t('activation.snapshot.noActivity')}
                  </p>
                )}
                {submitError && (
                  <p className="wizard-subtitle" style={{ color: 'var(--color-danger)', fontSize: 14 }}>
                    {submitError}
                  </p>
                )}
                <div className="wizard-footer">
                  <div className="wizard-footer__left">
                    <Button
                      variant="secondary"
                      size="md"
                      disabled={submitLoading}
                      onClick={() => setStep(STEP_CHOOSE_PATH)}
                    >
                      {t('common.buttons.back')}
                    </Button>
                  </div>
                  <div className="wizard-footer__right">
                    <Button
                      variant="primary"
                      size="md"
                      disabled={submitLoading}
                      onClick={() => setStep(STEP_MORE_TOOLS)}
                    >
                      {t('common.buttons.continue')}
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {step === STEP_SETUP_DONE && (
          <div className="wizard-body">
            <h1 className="wizard-title">{t('activation.setupDone.title')}</h1>
            <p className="wizard-subtitle">
              {t('activation.setupDone.subtitle')}
            </p>
            <NextStepCard
              title={t('activation.guidance.setupDone.title')}
              description={t('activation.guidance.setupDone.description')}
            />
            {submitError && (
              <p className="wizard-subtitle" style={{ color: 'var(--color-danger)', fontSize: 14 }}>
                {submitError}
              </p>
            )}
            <div className="wizard-footer">
              <div className="wizard-footer__left">
                <Button
                  variant="secondary"
                  size="md"
                  disabled={submitLoading}
                  onClick={() => setStep(STEP_CHOOSE_PATH)}
                >
                  {t('common.buttons.back')}
                </Button>
              </div>
              <div className="wizard-footer__right">
                <Button
                  variant="primary"
                  size="md"
                  disabled={submitLoading}
                  onClick={() => setStep(STEP_MORE_TOOLS)}
                >
                  {t('common.buttons.continue')}
                </Button>
              </div>
            </div>
          </div>
        )}

        {step === STEP_MORE_TOOLS && (
          <div className="wizard-body">
            <h1 className="wizard-title">{t('activation.complete.title')}</h1>
            <p className="wizard-subtitle">
              {t('activation.complete.subtitle')}
            </p>
            <NextStepCard
              title={t('activation.guidance.complete.title')}
              description={t('activation.guidance.complete.description')}
            />
            {submitError && (
              <p className="wizard-subtitle" style={{ color: 'var(--color-danger)', fontSize: 14 }}>
                {submitError}
              </p>
            )}
            <div className="wizard-footer">
              <div className="wizard-footer__left" />
              <div className="wizard-footer__right">
                <Button
                  variant="primary"
                  size="md"
                  disabled={submitLoading}
                  loading={submitLoading}
                  onClick={() => handleEnterDashboard(activationPath)}
                >
                  {t('activation.complete.cta')}
                </Button>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
