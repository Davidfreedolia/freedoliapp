import React, { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import Card from '../ui/Card'
import Button from '../Button'
import useT from '../../hooks/useT'

export default function ConnectedAccounts() {
  const t = useT()
  const [loading, setLoading] = useState(true)
  const [linking, setLinking] = useState({ google: false, apple: false })
  const [providers, setProviders] = useState([])
  const [error, setError] = useState(null)

  const loadProviders = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error: userError } = await supabase.auth.getUser()
      if (userError) throw userError
      const user = data?.user
      if (!user) {
        setProviders([])
        return
      }
      const identities = Array.isArray(user.identities) ? user.identities : []
      const connected = identities.map((i) => i.provider).filter(Boolean)
      setProviders(connected)
    } catch (err) {
      setError(err.message || String(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!cancelled) {
        await loadProviders()
      }
    })()
    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        loadProviders().catch(() => {})
      }
    }
    window.addEventListener('focus', handleVisibilityOrFocus)
    document.addEventListener('visibilitychange', handleVisibilityOrFocus)
    return () => {
      cancelled = true
      window.removeEventListener('focus', handleVisibilityOrFocus)
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus)
    }
  }, [loadProviders])

  const isConnected = (provider) => providers.includes(provider)

  const handleLink = async (provider) => {
    if (isConnected(provider)) return
    setLinking((prev) => ({ ...prev, [provider]: true }))
    setError(null)
    try {
      await supabase.auth.linkIdentity({ provider })
      // Supabase gestionarà el flux OAuth i actualitzarà la sessió; no actualitzem l'estat local aquí.
    } catch (err) {
      setError(err.message || String(err))
      setLinking((prev) => ({ ...prev, [provider]: false }))
    }
  }

  return (
    <Card
      elevated
      className="settings-connected-accounts"
      style={{ marginBottom: 24, padding: '20px', borderRadius: 12 }}
    >
      <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>
        {t('connectedAccounts.title')}
      </h3>
      <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>
        {t('connectedAccounts.description')}
      </p>
      {error && (
        <div style={{ fontSize: 12, color: '#b91c1c', marginBottom: 12 }}>
          {error}
        </div>
      )}
      <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
        <tbody>
          <tr>
            <td style={{ padding: '6px 0', width: '40%' }}>
              {t('connectedAccounts.email')}
            </td>
            <td style={{ padding: '6px 0' }}>
              <span style={{ fontSize: 12, color: '#059669', fontWeight: 600 }}>
                {t('connectedAccounts.connected')}
              </span>
            </td>
          </tr>
          <tr>
            <td style={{ padding: '6px 0' }}>
              {t('connectedAccounts.google')}
            </td>
            <td style={{ padding: '6px 0' }}>
              {isConnected('google') ? (
                <span style={{ fontSize: 12, color: '#059669', fontWeight: 600 }}>
                  {t('connectedAccounts.connected')}
                </span>
              ) : (
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={loading || linking.google}
                  onClick={() => handleLink('google')}
                >
                  {linking.google
                    ? t('connectedAccounts.connecting')
                    : t('connectedAccounts.connect')}
                </Button>
              )}
            </td>
          </tr>
          <tr>
            <td style={{ padding: '6px 0' }}>
              {t('connectedAccounts.apple')}
            </td>
            <td style={{ padding: '6px 0' }}>
              {isConnected('apple') ? (
                <span style={{ fontSize: 12, color: '#059669', fontWeight: 600 }}>
                  {t('connectedAccounts.connected')}
                </span>
              ) : (
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={loading || linking.apple}
                  onClick={() => handleLink('apple')}
                >
                  {linking.apple
                    ? t('connectedAccounts.connecting')
                    : t('connectedAccounts.connect')}
                </Button>
              )}
            </td>
          </tr>
        </tbody>
      </table>
    </Card>
  )
}

