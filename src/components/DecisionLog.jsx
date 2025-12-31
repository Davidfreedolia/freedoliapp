import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { CheckCircle2, XCircle, Clock, AlertTriangle, Save, X } from 'lucide-react'
import { getDecisionLog, createDecisionLog, updateDecisionLog } from '../lib/supabase'

const DECISION_OPTIONS = [
  { value: 'go', label: 'GO', icon: CheckCircle2, color: '#10b981' },
  { value: 'hold', label: 'HOLD', icon: Clock, color: '#f59e0b' },
  { value: 'discarded', label: 'DISCARDED', icon: XCircle, color: '#ef4444' },
  { value: 'selected', label: 'SELECTED', icon: CheckCircle2, color: '#3b82f6' },
  { value: 'rejected', label: 'REJECTED', icon: XCircle, color: '#ef4444' }
]

const REASON_OPTIONS = {
  project: [
    'Low margin',
    'High competition',
    'Supply chain issues',
    'Market saturation',
    'Regulatory concerns',
    'Other'
  ],
  quote: [
    'Price too high',
    'Quality concerns',
    'Lead time too long',
    'Payment terms',
    'MOQ too high',
    'Other'
  ],
  purchase_order: [
    'Supplier issue',
    'Quality problem',
    'Delay',
    'Cost overrun',
    'Other'
  ]
}

export default function DecisionLog({ entityType, entityId, darkMode }) {
  const { t } = useTranslation()
  const [decision, setDecision] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    decision: '',
    reason: '',
    notes: ''
  })

  useEffect(() => {
    if (entityId) {
      loadDecision()
    }
  }, [entityType, entityId])

  const loadDecision = async () => {
    setLoading(true)
    try {
      const data = await getDecisionLog(entityType, entityId)
      setDecision(data)
      if (data) {
        setFormData({
          decision: data.decision || '',
          reason: data.reason || '',
          notes: data.notes || ''
        })
      }
    } catch (err) {
      console.error('Error loading decision:', err)
    }
    setLoading(false)
  }

  const handleSave = async () => {
    if (!formData.decision) {
      alert('Please select a decision')
      return
    }

    setSaving(true)
    try {
      if (decision) {
        // Update existing
        await updateDecisionLog(decision.id, {
          decision: formData.decision,
          reason: formData.reason || null,
          notes: formData.notes || null
        })
      } else {
        // Create new
        await createDecisionLog({
          entity_type: entityType,
          entity_id: entityId,
          decision: formData.decision,
          reason: formData.reason || null,
          notes: formData.notes || null
        })
      }
      await loadDecision()
      setShowForm(false)
    } catch (err) {
      console.error('Error saving decision:', err)
      alert('Error saving decision: ' + (err.message || 'Unknown error'))
    }
    setSaving(false)
  }

  const getDecisionInfo = (decisionValue) => {
    return DECISION_OPTIONS.find(d => d.value === decisionValue) || DECISION_OPTIONS[0]
  }

  if (loading) {
    return null
  }

  const decisionInfo = decision ? getDecisionInfo(decision.decision) : null
  const reasons = REASON_OPTIONS[entityType] || REASON_OPTIONS.project

  return (
    <div style={{
      ...styles.container,
      backgroundColor: darkMode ? '#15151f' : '#ffffff',
      borderColor: darkMode ? '#374151' : '#d1d5db'
    }}>
      <div style={styles.header}>
        <h4 style={{
          ...styles.title,
          color: darkMode ? '#ffffff' : '#111827'
        }}>
          Decision Log
        </h4>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            style={styles.addButton}
          >
            {decision ? 'Edit' : 'Add Decision'}
          </button>
        )}
      </div>

      {showForm ? (
        <div style={{
          ...styles.form,
          backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb',
          borderColor: darkMode ? '#374151' : '#d1d5db'
        }}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Decision *</label>
            <div style={styles.decisionButtons}>
              {DECISION_OPTIONS.map(opt => {
                const Icon = opt.icon
                return (
                  <button
                    key={opt.value}
                    onClick={() => setFormData({ ...formData, decision: opt.value })}
                    style={{
                      ...styles.decisionButton,
                      backgroundColor: formData.decision === opt.value 
                        ? opt.color 
                        : (darkMode ? '#0a0a0f' : '#ffffff'),
                      color: formData.decision === opt.value ? '#ffffff' : opt.color,
                      borderColor: opt.color,
                      borderWidth: formData.decision === opt.value ? '2px' : '1px'
                    }}
                  >
                    <Icon size={16} />
                    {opt.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Reason</label>
            <select
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              style={{
                ...styles.select,
                backgroundColor: darkMode ? '#0a0a0f' : '#ffffff',
                color: darkMode ? '#ffffff' : '#111827',
                borderColor: darkMode ? '#374151' : '#d1d5db'
              }}
            >
              <option value="">Select reason (optional)</option>
              {reasons.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              placeholder="Additional notes..."
              style={{
                ...styles.textarea,
                backgroundColor: darkMode ? '#0a0a0f' : '#ffffff',
                color: darkMode ? '#ffffff' : '#111827',
                borderColor: darkMode ? '#374151' : '#d1d5db'
              }}
            />
          </div>

          <div style={styles.formActions}>
            <button
              onClick={() => {
                setShowForm(false)
                if (decision) {
                  setFormData({
                    decision: decision.decision || '',
                    reason: decision.reason || '',
                    notes: decision.notes || ''
                  })
                } else {
                  setFormData({ decision: '', reason: '', notes: '' })
                }
              }}
              style={styles.cancelButton}
            >
              <X size={14} />
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !formData.decision}
              style={{
                ...styles.saveButton,
                opacity: (saving || !formData.decision) ? 0.6 : 1
              }}
            >
              <Save size={14} />
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      ) : decision ? (
        <div style={{
          ...styles.decisionDisplay,
          backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb',
          borderColor: decisionInfo.color
        }}>
          <div style={styles.decisionHeader}>
            <div style={{
              ...styles.decisionBadge,
              backgroundColor: decisionInfo.color + '20',
              color: decisionInfo.color,
              borderColor: decisionInfo.color
            }}>
              {React.createElement(decisionInfo.icon, { size: 16 })}
              {decisionInfo.label}
            </div>
            <span style={{
              ...styles.decisionDate,
              color: darkMode ? '#9ca3af' : '#6b7280'
            }}>
              {new Date(decision.created_at).toLocaleDateString()}
            </span>
          </div>
          {decision.reason && (
            <div style={{
              ...styles.decisionReason,
              color: darkMode ? '#e5e7eb' : '#374151'
            }}>
              <strong>Reason:</strong> {decision.reason}
            </div>
          )}
          {decision.notes && (
            <div style={{
              ...styles.decisionNotes,
              color: darkMode ? '#9ca3af' : '#6b7280'
            }}>
              {decision.notes}
            </div>
          )}
        </div>
      ) : (
        <div style={styles.empty}>
          <p style={{ color: darkMode ? '#9ca3af' : '#6b7280', fontSize: '13px' }}>
            No decision recorded yet
          </p>
        </div>
      )}
    </div>
  )
}

const styles = {
  container: {
    padding: '16px',
    borderRadius: '8px',
    border: '1px solid',
    marginBottom: '16px'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px'
  },
  title: {
    margin: 0,
    fontSize: '14px',
    fontWeight: '600'
  },
  addButton: {
    padding: '6px 12px',
    backgroundColor: '#4f46e5',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '500',
    cursor: 'pointer'
  },
  form: {
    padding: '16px',
    borderRadius: '8px',
    border: '1px solid'
  },
  formGroup: {
    marginBottom: '16px'
  },
  label: {
    display: 'block',
    fontSize: '12px',
    fontWeight: '500',
    color: '#6b7280',
    marginBottom: '8px'
  },
  decisionButtons: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px'
  },
  decisionButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 12px',
    borderRadius: '6px',
    border: '1px solid',
    fontSize: '12px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  select: {
    width: '100%',
    padding: '8px 12px',
    borderRadius: '6px',
    border: '1px solid',
    fontSize: '13px',
    outline: 'none',
    cursor: 'pointer'
  },
  textarea: {
    width: '100%',
    padding: '8px 12px',
    borderRadius: '6px',
    border: '1px solid',
    fontSize: '13px',
    outline: 'none',
    resize: 'vertical',
    fontFamily: 'inherit'
  },
  formActions: {
    display: 'flex',
    gap: '8px',
    justifyContent: 'flex-end'
  },
  cancelButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '8px 12px',
    backgroundColor: 'transparent',
    color: '#6b7280',
    border: '1px solid var(--border-color)',
    borderRadius: '6px',
    fontSize: '12px',
    cursor: 'pointer'
  },
  saveButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '8px 16px',
    backgroundColor: '#4f46e5',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '500',
    cursor: 'pointer'
  },
  decisionDisplay: {
    padding: '12px',
    borderRadius: '6px',
    border: '2px solid'
  },
  decisionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px'
  },
  decisionBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    borderRadius: '6px',
    border: '1px solid',
    fontSize: '12px',
    fontWeight: '600'
  },
  decisionDate: {
    fontSize: '11px'
  },
  decisionReason: {
    fontSize: '12px',
    marginBottom: '8px'
  },
  decisionNotes: {
    fontSize: '12px',
    fontStyle: 'italic',
    marginTop: '8px'
  },
  empty: {
    padding: '12px',
    textAlign: 'center'
  }
}

