import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Send, LogIn, Apple } from 'lucide-react'
import { logSuccess, logError } from '../lib/auditLog'
import { isDemoMode } from '../demo/demoMode'
import { registerTrialLead } from '../lib/trials/registerTrialLead'
import useT from '../hooks/useT'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Card from '../components/ui/Card'

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
          redirectTo: `${window.location.origin}/`,
        },
      })
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  const handleAppleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: {
          redirectTo: `${window.location.origin}/`,
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
          emailRedirectTo: `${window.location.origin}/login`,
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
          <h1 className="auth-card__title">{t('login.title')}</h1>
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
                <LogIn size={18} style={{ marginRight: 8 }} aria-hidden />
                {t('login.continueWithGoogle')}
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={handleAppleLogin}
                disabled={loading}
                className="auth-card__providerBtn"
              >
                <Apple size={18} style={{ marginRight: 8 }} aria-hidden />
                {t('login.continueWithApple')}
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
