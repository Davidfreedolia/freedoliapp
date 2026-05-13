import React from 'react'
import { useTranslation } from 'react-i18next'
import DecisionActions from './DecisionActions'

export default function DecisionDetail({ item, onAction, actionLoading, onFeedback, feedbackSubmitting = false, feedbackGiven = false }) {
  const { t } = useTranslation()
  if (!item) {
    return (
      <div style={{ padding: 16, color: 'var(--text-2)', fontSize: 14 }}>
        {t('decisionDetail.selectPrompt')}
      </div>
    )
  }

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ fontSize: 18, marginBottom: 8 }}>{item.title}</h2>
      <p style={{ marginBottom: 8 }}>{item.explanation}</p>
      {item.recommendedAction && (
        <p style={{ marginBottom: 12, fontWeight: 500 }}>{item.recommendedAction}</p>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, fontSize: 13, marginBottom: 12 }}>
        <span><strong>{t('decisionDetail.fields.status')}:</strong> {item.status}</span>
        <span><strong>{t('decisionDetail.fields.severity')}:</strong> {item.severity}</span>
        {item.confidence && <span><strong>{t('decisionDetail.fields.confidence')}:</strong> {item.confidence}</span>}
        {item.sourceEngine && <span><strong>{t('decisionDetail.fields.source')}:</strong> {item.sourceEngine}</span>}
      </div>

      {item.contextSummary && item.contextSummary.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <h3 style={{ fontSize: 14, marginBottom: 4 }}>{t('decisionDetail.context')}</h3>
          <ul style={{ paddingLeft: 16, margin: 0, fontSize: 13 }}>
            {item.contextSummary.map((c) => (
              <li key={`${c.label}-${String(c.value)}`}>
                <strong>{c.label}:</strong> {String(c.value)}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Feedback actions (Decision Feedback Loop, D47/D55) */}
      {onFeedback && (
        <div style={{ marginBottom: 16 }}>
          <h3 style={{ fontSize: 14, marginBottom: 6 }}>{t('decisionDetail.feedback.prompt')}</h3>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              type="button"
              disabled={feedbackSubmitting || feedbackGiven}
              onClick={() => onFeedback('useful')}
              style={{
                padding: '6px 10px',
                borderRadius: 999,
                border: '1px solid var(--border-1)',
                backgroundColor: 'var(--surface-bg-2)',
                cursor: feedbackSubmitting || feedbackGiven ? 'default' : 'pointer',
                fontSize: 13,
              }}
            >
              👍 {t('decisionDetail.feedback.useful')}
            </button>
            <button
              type="button"
              disabled={feedbackSubmitting || feedbackGiven}
              onClick={() => onFeedback('not_useful')}
              style={{
                padding: '6px 10px',
                borderRadius: 999,
                border: '1px solid var(--border-1)',
                backgroundColor: 'var(--surface-bg-2)',
                cursor: feedbackSubmitting || feedbackGiven ? 'default' : 'pointer',
                fontSize: 13,
              }}
            >
              👎 {t('decisionDetail.feedback.notUseful')}
            </button>
            <button
              type="button"
              disabled={feedbackSubmitting || feedbackGiven}
              onClick={() => onFeedback('wrong')}
              style={{
                padding: '6px 10px',
                borderRadius: 999,
                border: '1px solid var(--border-1)',
                backgroundColor: 'var(--surface-bg-2)',
                cursor: feedbackSubmitting || feedbackGiven ? 'default' : 'pointer',
                fontSize: 13,
              }}
            >
              ⚠ {t('decisionDetail.feedback.wrong')}
            </button>
          </div>
          {feedbackGiven && (
            <div style={{ marginTop: 6, fontSize: 12, color: 'var(--text-2)' }}>
              {t('decisionDetail.feedback.thanks')}
            </div>
          )}
        </div>
      )}

      <DecisionActions item={item} onAction={onAction} loading={actionLoading} />
    </div>
  )
}
