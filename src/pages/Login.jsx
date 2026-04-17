import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Send, LogIn } from 'lucide-react'
import { logSuccess, logError } from '../lib/auditLog'
import { isDemoMode } from '../demo/demoMode'
import { registerTrialLead } from '../lib/trials/registerTrialLead'
import { getAppBaseUrl } from '../lib/config/getAppBaseUrl'
import useT from '../hooks/useT'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Card from '../components/ui/Card'

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

export default function Login() {
  const navigate = useNavigate()
  const t = useT()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [magicLinkSent, setMagicLinkSent] = useState(false)
  const [useMagicLink, setUseMagicLink] = useState(false)

  useEffect(() => {
    if (isDemoMode()) {
      navigate('/app', { replace: true })
      return
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate('/app', { replace: true })
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        navigate('/app', { replace: true })
      }
    })

    return () => subscription.unsubscribe()
  }, [navigate])

  const captureTrialLead = (userEmail) => {
    if (!userEmail?.trim()) return
    const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '')
    registerTrialLead(supabase, {
      email: userEmail.trim(),
      name: undefined,
      companyName: undefined,
      source: 'login',
      utmSource: params.get('utm_source') || undefined,
      utmCampaign: params.get('utm_campaign') || undefined,
    }).catch(() => {})
  }

  const handleGoogleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      // No cal await sobre el redirect; Supabase gestionarà el flux OAuth.
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

  const handleEmailLogin = async (e) => {
    e.preventDefault()
    captureTrialLead(email)
    setLoading(true)
    setError(null)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      if (data.session) {
        await logSuccess('user', 'login', data.session.user.id, 'User logged in successfully', {
          email: email,
          method: 'password'
        })
        navigate('/app', { replace: true })
      }
    } catch (err) {
      await logError('user', 'login', err, { email: email, method: 'password' })
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleMagicLink = async (e) => {
    e.preventDefault()
    captureTrialLead(email)
    setLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          // P0.ACCESS — ensure magic link lands on a valid, explicit auth route
          emailRedirectTo: `${getAppBaseUrl()}/login`,
        },
      })

      if (error) throw error

      await logSuccess('user', 'login', null, 'Magic link sent', {
        email: email,
        method: 'magic_link'
      })

      setMagicLinkSent(true)
    } catch (err) {
      await logError('user', 'login', err, { email: email, method: 'magic_link' })
      setError(err.message)
    } finally {
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
          <p className="auth-card__subtitle">
            {t('login.subtitle')}
          </p>
          <p className="auth-card__subtitle auth-card__subtitle--secondary">
            {t('login.subtitle_existing')}
          </p>
        </div>

        {magicLinkSent ? (
          <div className="auth-card__success">
            <p className="auth-card__successText">{t('login.magicLinkSent')}</p>
            <p className="auth-card__successSubtext">{t('login.magicLinkSubtext')}</p>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setMagicLinkSent(false)
                setEmail('')
              }}
            >
              {t('login.back')}
            </Button>
          </div>
        ) : (
          <>
            <div className="auth-card__toggle">
              <Button
                type="button"
                variant={!useMagicLink ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => {
                  setUseMagicLink(false)
                  setError(null)
                }}
                className="auth-card__toggleBtn"
              >
                {t('login.passwordLabel')}
              </Button>
              <Button
                type="button"
                variant={useMagicLink ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => {
                  setUseMagicLink(true)
                  setError(null)
                }}
                className="auth-card__toggleBtn"
              >
                {t('login.magicLink')}
              </Button>
            </div>

            <form
              onSubmit={useMagicLink ? handleMagicLink : handleEmailLogin}
              className="auth-card__form"
            >
              <Input
                type="email"
                label={t('login.emailLabel')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
                required
              />

              {!useMagicLink && (
                <>
                  <Input
                    type="password"
                    label={t('login.passwordLabel')}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                  />
                  <p className="auth-card__forgot">
                    <button
                      type="button"
                      className="auth-card__link"
                      onClick={() => {
                        setUseMagicLink(true)
                        setError(null)
                      }}
                    >
                      {t('login.forgotPassword')}
                    </button>
                  </p>
                </>
              )}

              {error && (
                <div className="form-error" role="alert">
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
                {loading ? null : useMagicLink ? (
                  <>
                    <Send size={18} aria-hidden />
                    {t('login.magicLink')}
                  </>
                ) : (
                  <>
                    <LogIn size={18} aria-hidden style={{ marginRight: 8 }} />
                    {t('login.button')}
                  </>
                )}
              </Button>
              <div className="auth-card__divider">
                <span className="auth-card__dividerLine" />
                <span className="auth-card__dividerLabel">{t('login.or')}</span>
                <span className="auth-card__dividerLine" />
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
              <p className="auth-card__consentNote">
                By continuing, you agree to the{' '}
                <Link to="/terms" className="auth-card__link">Terms of Service</Link>
                {' '}and acknowledge the{' '}
                <Link to="/privacy" className="auth-card__link">Privacy Policy</Link>.
              </p>
            </form>
          </>
        )}

        <p className="auth-card__footer">
          <Link to="/trial" className="auth-card__link">{t('login.signupLink')}</Link>
        </p>
      </Card>
    </div>
  )
}


