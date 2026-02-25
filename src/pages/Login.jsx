import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Mail, Lock, Send } from 'lucide-react'
import { logSuccess, logError } from '../lib/auditLog'
import { isDemoMode } from '../demo/demoMode'
import Button from '../components/Button'

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [magicLinkSent, setMagicLinkSent] = useState(false)
  const [useMagicLink, setUseMagicLink] = useState(false)

  // Verificar si ja està autenticat
  useEffect(() => {
    // Demo mode: auto-redirect to dashboard
    if (isDemoMode()) {
      navigate('/app', { replace: true })
      return
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate('/app', { replace: true })
      }
    })

    // Escoltar canvis d'autenticació (per magic link)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        navigate('/app', { replace: true })
      }
    })

    return () => subscription.unsubscribe()
  }, [navigate])

  const handleEmailLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      // Redirigir després d'un login exitós
      if (data.session) {
        // Audit log: login exitós
        await logSuccess('user', 'login', data.session.user.id, 'User logged in successfully', {
          email: email,
          method: 'password'
        })
        navigate('/app', { replace: true })
      }
    } catch (err) {
      // Audit log: error login
      await logError('user', 'login', err, { email: email, method: 'password' })
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleMagicLink = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
        },
      })

      if (error) throw error
      
      // Audit log: magic link enviat
      await logSuccess('user', 'login', null, 'Magic link sent', {
        email: email,
        method: 'magic_link'
      })
      
      setMagicLinkSent(true)
    } catch (err) {
      // Audit log: error enviant magic link
      await logError('user', 'login', err, { email: email, method: 'magic_link' })
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.loginBox}>
        <div style={styles.header}>
          <img src="/logo.png" alt="Freedolia" style={styles.logo} />
          <h1 style={styles.title}>Freedoliapp</h1>
          <p style={styles.subtitle}>Inicia sessió per continuar</p>
        </div>

        {magicLinkSent ? (
          <div style={styles.successMessage}>
            <p style={styles.successText}>
              ✅ Enllaç d'inici de sessió enviat!
            </p>
            <p style={styles.successSubtext}>
              Revisa el teu correu i clica l'enllaç per iniciar sessió.
            </p>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setMagicLinkSent(false)
                setEmail('')
              }}
              style={styles.backButton}
            >
              Tornar
            </Button>
          </div>
        ) : (
          <>
            <div style={styles.toggleContainer}>
              <Button
                variant={!useMagicLink ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setUseMagicLink(false)}
                style={{
                  ...styles.toggleButton,
                  color: !useMagicLink ? '#ffffff' : '#6b7280',
                }}
              >
                Contrasenya
              </Button>
              <Button
                variant={useMagicLink ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setUseMagicLink(true)}
                style={{
                  ...styles.toggleButton,
                  color: useMagicLink ? '#ffffff' : '#6b7280',
                }}
              >
                Enllaç màgic
              </Button>
            </div>

            <form
              onSubmit={useMagicLink ? handleMagicLink : handleEmailLogin}
              style={styles.form}
            >
              <div style={styles.inputGroup}>
                <label style={styles.label}>
                  <Mail size={16} style={styles.icon} />
                  Correu electrònic
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@example.com"
                  required
                  style={styles.input}
                />
              </div>

              {!useMagicLink && (
                <div style={styles.inputGroup}>
                  <label style={styles.label}>
                    <Lock size={16} style={styles.icon} />
                    Contrasenya
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    style={styles.input}
                  />
                </div>
              )}

              {error && (
                <div style={styles.errorMessage}>
                  {error}
                </div>
              )}

              <Button
                variant="primary"
                size="sm"
                type="submit"
                disabled={loading}
                style={styles.submitButton}
              >
                {loading ? (
                  'Carregant...'
                ) : useMagicLink ? (
                  <>
                    <Send size={18} />
                    Enviar enllaç
                  </>
                ) : (
                  'Iniciar sessió'
                )}
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8f9fc',
    padding: '20px',
  },
  loginBox: {
    width: '100%',
    maxWidth: '400px',
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    padding: '40px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
  },
  header: {
    textAlign: 'center',
    marginBottom: '32px',
  },
  logo: {
    maxWidth: '150px',
    height: 'auto',
    marginBottom: '16px',
  },
  title: {
    fontSize: '24px',
    fontWeight: '600',
    color: '#111827',
    margin: '0 0 8px',
  },
  subtitle: {
    fontSize: '14px',
    color: '#6b7280',
    margin: 0,
  },
  toggleContainer: {
    display: 'flex',
    gap: '8px',
    marginBottom: '24px',
    backgroundColor: '#f3f4f6',
    padding: '4px',
    borderRadius: '8px',
  },
  toggleButton: {
    flex: 1,
    padding: '8px 16px',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  label: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#374151',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  icon: {
    color: '#6b7280',
  },
  input: {
    padding: '12px 16px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.2s ease',
  },
  errorMessage: {
    padding: '12px',
    backgroundColor: '#fee2e2',
    color: '#dc2626',
    borderRadius: '8px',
    fontSize: '14px',
  },
  submitButton: {
    padding: '12px 24px',
    backgroundColor: '#4f46e5',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    transition: 'background-color 0.2s ease',
  },
  successMessage: {
    textAlign: 'center',
    padding: '24px',
  },
  successText: {
    fontSize: '16px',
    fontWeight: '500',
    color: '#059669',
    margin: '0 0 8px',
  },
  successSubtext: {
    fontSize: '14px',
    color: '#6b7280',
    margin: '0 0 24px',
  },
  backButton: {
    padding: '10px 20px',
    backgroundColor: '#f3f4f6',
    color: '#374151',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    cursor: 'pointer',
  },
}

