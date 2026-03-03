import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWorkspace } from '../contexts/WorkspaceContext'
import { supabase } from '../lib/supabase'
import { showToast } from '../components/Toast'

const STEP_CONFIRM_ORG = 1
const STEP_CHOOSE_PATH = 2
const STEP_SETUP_DONE = 3

export default function ActivationWizard() {
  const { activeOrgId } = useWorkspace()
  const navigate = useNavigate()
  const [step, setStep] = useState(STEP_CONFIRM_ORG)
  const [org, setOrg] = useState(null)
  const [baseCurrency, setBaseCurrency] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitLoading, setSubmitLoading] = useState(false)
  const [submitError, setSubmitError] = useState(null)

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

  const handleChooseSetup = () => setStep(STEP_SETUP_DONE)

  const handleConnectAmazon = () => {
    showToast('Connect Amazon coming in next phase', 'info')
  }

  const handleEnterDashboard = async () => {
    if (!activeOrgId) return
    setSubmitError(null)
    setSubmitLoading(true)
    try {
      const { error } = await supabase
        .from('org_activation')
        .insert({
          org_id: activeOrgId,
          activation_path: 'setup',
        })
      if (error) {
        if (error.code === '23505') {
          navigate('/app', { replace: true })
          return
        }
        setSubmitError(error.message || 'Error saving activation')
        showToast(error.message || 'Error saving activation', 'error')
        return
      }
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
                onClick={handleConnectAmazon}
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
              onClick={handleEnterDashboard}
              disabled={submitLoading}
            >
              {submitLoading ? 'Saving...' : 'Enter Dashboard'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
