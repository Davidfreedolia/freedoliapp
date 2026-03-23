/**
 * R0.4 — In-app assistant panel: context, quick intents, query input, answers + links.
 * No LLM; rule-based matching via assistantIntents. Reuses i18n and guidance where relevant.
 */
import React, { useState, useCallback, useEffect } from 'react'
import { X, Send, MessageCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import {
  matchIntent,
  getScreenFromPath,
  getDefaultIntentForScreen,
  INTENTS,
  INTENT_LINKS,
} from '../../lib/assistant/assistantIntents'
import Button from '../Button'

const QUICK_KEYS = [
  { intent: INTENTS.WHAT_CAN_I_DO, key: 'whatCanIDo' },
  { intent: INTENTS.NEXT_STEP, key: 'nextStep' },
  { intent: INTENTS.WHERE_ORDERS, key: 'whereOrders' },
  { intent: INTENTS.FLOW_PROJECT_PO, key: 'flow' },
]

export default function AssistantPanel({ isOpen, onClose, pathname }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [currentIntent, setCurrentIntent] = useState(null)

  const { screen, projectId } = getScreenFromPath(pathname || '')
  const contextLabel = t(`assistant.context.${screen}`, { defaultValue: t('assistant.context.app') })

  const showAnswer = useCallback(
    (intent) => {
      setCurrentIntent(intent)
    },
    []
  )

  const handleSubmit = useCallback(
    (e) => {
      e?.preventDefault()
      const q = (query || '').trim()
      if (q) {
        const intent = matchIntent(q)
        showAnswer(intent || 'noMatch')
      } else {
        const defaultIntent = getDefaultIntentForScreen(screen)
        showAnswer(defaultIntent)
      }
    },
    [query, screen, showAnswer]
  )

  const handleQuick = useCallback(
    (intent) => {
      showAnswer(intent)
    },
    [showAnswer]
  )

  const goTo = useCallback(
    (path) => {
      if (path) {
        navigate(path)
        onClose?.()
      }
    },
    [navigate, onClose]
  )

  useEffect(() => {
    if (!isOpen) return
    const onKey = (e) => { if (e.key === 'Escape') onClose?.() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const linkPath = currentIntent && currentIntent !== 'noMatch' ? INTENT_LINKS[currentIntent] : null
  const linkLabelKey =
    linkPath === '/app/orders' ? 'assistant.linkLabel.orders' : linkPath === '/app/projects' ? 'assistant.linkLabel.projects' : null

  return (
    <>
      <div
        role="presentation"
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.35)',
          zIndex: 1099,
        }}
        onClick={onClose}
        onKeyDown={(e) => e.key === 'Escape' && onClose?.()}
      />
      <div
        role="dialog"
        aria-label={t('assistant.title')}
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: '100%',
          maxWidth: 380,
          backgroundColor: 'var(--page-bg)',
          boxShadow: 'var(--shadow-soft, -4px 0 20px rgba(0,0,0,0.15))',
          zIndex: 1100,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            borderBottom: '1px solid var(--border-1)',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <MessageCircle size={20} style={{ color: 'var(--primary-1)' }} aria-hidden />
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: 'var(--text-1)' }}>
              {t('assistant.title')}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.close', 'Tancar')}
            style={{
              padding: 6,
              border: 'none',
              background: 'transparent',
              color: 'var(--muted-1)',
              cursor: 'pointer',
              borderRadius: 6,
            }}
          >
            <X size={18} aria-hidden />
          </button>
        </div>

        {/* Context */}
        <div
          style={{
            padding: '10px 16px',
            fontSize: 12,
            color: 'var(--muted-1)',
            borderBottom: '1px solid var(--border-1)',
          }}
        >
          {contextLabel}
          {projectId && (
            <span style={{ marginLeft: 6, color: 'var(--muted-2)' }}> · {projectId.slice(0, 8)}…</span>
          )}
        </div>

        {/* Quick actions */}
        <div style={{ padding: 12, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {QUICK_KEYS.map(({ intent, key }) => (
            <button
              key={intent}
              type="button"
              onClick={() => handleQuick(intent)}
              style={{
                padding: '6px 10px',
                fontSize: 12,
                borderRadius: 8,
                border: '1px solid var(--border-1)',
                background: 'var(--surface-bg-1)',
                color: 'var(--text-1)',
                cursor: 'pointer',
              }}
            >
              {t(`assistant.quick.${key}`)}
            </button>
          ))}
        </div>

        {/* Query input */}
        <form onSubmit={handleSubmit} style={{ padding: '0 16px 12px' }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('assistant.placeholder')}
              aria-label={t('assistant.placeholder')}
              style={{
                flex: 1,
                padding: '8px 12px',
                fontSize: 14,
                border: '1px solid var(--border-1)',
                borderRadius: 8,
                background: 'var(--surface-bg-1)',
                color: 'var(--text-1)',
              }}
            />
            <Button type="submit" variant="primary" size="sm" aria-label={t('assistant.placeholder')}>
              <Send size={16} aria-hidden />
            </Button>
          </div>
        </form>

        {/* Answer area */}
        <div
          style={{
            flex: 1,
            overflow: 'auto',
            padding: 16,
            borderTop: '1px solid var(--border-1)',
          }}
        >
          {currentIntent ? (
            <>
              <p
                style={{
                  margin: '0 0 12px',
                  fontSize: 14,
                  lineHeight: 1.5,
                  color: 'var(--text-1)',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {currentIntent === 'noMatch'
                  ? t('assistant.noMatch')
                  : t(`assistant.answers.${currentIntent}`)}
              </p>
              {currentIntent !== 'noMatch' && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {linkPath && linkLabelKey && (
                    <Button variant="primary" size="sm" onClick={() => goTo(linkPath)}>
                      {t(linkLabelKey)}
                    </Button>
                  )}
                  {currentIntent === INTENTS.NEXT_STEP && (
                    <>
                      <Button variant="secondary" size="sm" onClick={() => goTo('/app/orders')}>
                        {t('assistant.linkLabel.orders')}
                      </Button>
                      <Button variant="secondary" size="sm" onClick={() => goTo('/app/projects')}>
                        {t('assistant.linkLabel.projects')}
                      </Button>
                    </>
                  )}
                </div>
              )}
            </>
          ) : (
            <p style={{ margin: 0, fontSize: 13, color: 'var(--muted-1)' }}>
              {t('assistant.quick.nextStep')} o escriu una pregunta.
            </p>
          )}
        </div>
      </div>
    </>
  )
}
