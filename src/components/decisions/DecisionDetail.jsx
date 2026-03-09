import React from 'react'
import DecisionActions from './DecisionActions'

export default function DecisionDetail({ item, onAction, actionLoading, onFeedback, feedbackSubmitting = false, feedbackGiven = false }) {
  if (!item) {
    return (
      <div style={{ padding: 16, color: 'var(--text-secondary, #6b7280)', fontSize: 14 }}>
        Select a decision to view details.
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
        <span><strong>Status:</strong> {item.status}</span>
        <span><strong>Severity:</strong> {item.severity}</span>
        {item.confidence && <span><strong>Confidence:</strong> {item.confidence}</span>}
        {item.sourceEngine && <span><strong>Source:</strong> {item.sourceEngine}</span>}
      </div>

      {item.contextSummary && item.contextSummary.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <h3 style={{ fontSize: 14, marginBottom: 4 }}>Context</h3>
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
          <h3 style={{ fontSize: 14, marginBottom: 6 }}>Was this decision helpful?</h3>
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
              👍 Useful
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
              👎 Not useful
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
              ⚠ Wrong decision
            </button>
          </div>
          {feedbackGiven && (
            <div style={{ marginTop: 6, fontSize: 12, color: 'var(--text-secondary, #6b7280)' }}>
              Thank you for your feedback.
            </div>
          )}
        </div>
      )}

      <DecisionActions item={item} onAction={onAction} loading={actionLoading} />
    </div>
  )
}

