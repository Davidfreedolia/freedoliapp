import { useState } from 'react'
import { supabase } from '../lib/supabase'

// Icona oficial Google G
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
      <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
    </svg>
  )
}
import { registerTrialLead } from '../lib/trials/registerTrialLead'
import { getAppBaseUrl } from '../lib/config/getAppBaseUrl'
import useT from '../hooks/useT'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'

export default function Trial() {
  const t = useT()
  const [email, setEmail] = useState('')
  const [marketingConsent, setMarketingConsent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)

    const trimmed = email.trim()
    if (!trimmed || !trimmed.includes('@')) {
      setError(t('trial.invalidEmail') || 'Please enter a valid email.')
      return
    }

    setLoading(true)
    try {
      const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '')
      await registerTrialLead(supabase, {
        email: trimmed,
        name: undefined,
        companyName: undefined,
        source: 'trial',
        utmSource: params.get('utm_source') || undefined,
        utmCampaign: params.get('utm_campaign') || undefined,
        marketingConsent,
      })

      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: trimmed,
        options: {
          emailRedirectTo: `${getAppBaseUrl()}/login`,
        },
      })
      if (otpError) {
        throw otpError
      }
      setSuccess(true)
    } catch (err) {
      setError(err.message || String(err))
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${getAppBaseUrl()}/app`,
        },
      })
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <div className="auth-shell">
      <Card className="auth-card">
        <div className="auth-card__header">
          <div className="auth-card__logo">
            <img
              src="/brand/freedoliapp/logo/logo_master.png"
              alt="FreedoliApp"
              style={{ height: 40, width: 'auto', marginBottom: 12 }}
              onError={e => { e.target.style.display = 'none' }}
            />
          </div>
          <p className="text-muted text-center mb-4" style={{ fontSize: 15, maxWidth: 340, margin: '0 auto' }}>
            {t('trial.subtitle_flow_hint')}
          </p>
        </div>

        {success ? (
          <div className="auth-card__success">
            <p className="auth-card__successText">{t('trial.successTitle')}</p>
            <p className="auth-card__successSubtext">{t('trial.successMessage')}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="auth-card__form">
            <Input
              type="email"
              label={t('trial.emailLabel')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('trial.emailPlaceholder') || 'you@company.com'}
              required
            />
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, marginTop: 8 }}>
              <input
                type="checkbox"
                checked={marketingConsent}
                onChange={(e) => setMarketingConsent(e.target.checked)}
                style={{ marginTop: 2 }}
              />
              <span>{t('trial.marketingConsent')}</span>
            </label>

            {error && (
              <div className="form-error" role="alert" style={{ marginTop: 8 }}>
                {error}
              </div>
            )}

            <Button
              variant="primary"
              size="md"
              type="submit"
              disabled={loading}
              loading={loading}
            >
              {t('trial.submit')}
            </Button>
            <div className="d-flex align-items-center gap-3 my-3">
              <hr className="flex-grow-1 m-0" style={{ borderColor: '#E5E7EB' }} />
              <span style={{ fontSize: 12, color: '#9CA3AF', fontWeight: 500 }}>{t('auth.or')}</span>
              <hr className="flex-grow-1 m-0" style={{ borderColor: '#E5E7EB' }} />
            </div>
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="auth-card__providerBtn"
            >
              <GoogleIcon />
              <span style={{ marginLeft: 8 }}>{t('login.continueWithGoogle')}</span>
            </Button>
          </form>
        )}

        {/* BUG 4 — Sign-in as inline text link, not a button */}
        <p className="text-center mt-3 mb-0" style={{ fontSize: 14, color: '#6B7280' }}>
          {t('auth.already_have_account')}{' '}
          <a
            href="/login"
            style={{ color: '#1F5F63', fontWeight: 600, textDecoration: 'none' }}
            onMouseEnter={e => { e.target.style.textDecoration = 'underline' }}
            onMouseLeave={e => { e.target.style.textDecoration = 'none' }}
          >
            {t('auth.sign_in')}
          </a>
        </p>
      </Card>
    </div>
  )
}





