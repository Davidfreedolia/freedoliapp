import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { registerTrialLead } from '../lib/trials/registerTrialLead'
import useT from '../hooks/useT'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'

export default function Trial() {
  const t = useT()
  const navigate = useNavigate()
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
          emailRedirectTo: `${window.location.origin}/`,
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

  return (
    <div className="auth-shell">
      <Card className="auth-card">
        <div className="auth-card__header">
          <h1 className="auth-card__title">{t('trial.title')}</h1>
          <p className="auth-card__subtitle">
            {t('trial.subtitle')}
          </p>
          <p className="auth-card__subtitle auth-card__subtitle--secondary">
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
          </form>
        )}

        <p className="auth-card__footer">
          <button
            type="button"
            className="auth-card__link"
            onClick={() => navigate('/login')}
          >
            {t('trial.signInLink')}
          </button>
        </p>
      </Card>
    </div>
  )
}

