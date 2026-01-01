import { useState, useEffect } from 'react'
import { CheckCircle2, XCircle } from 'lucide-react'
import HelpIcon from './HelpIcon'

export default function AmazonReadySection({ readiness, readyStatus, onUpdate, darkMode }) {
  const [formData, setFormData] = useState({
    needs_fnsku: true,
    units_per_carton: null,
    cartons_count: null,
    carton_length_cm: null,
    carton_width_cm: null,
    carton_height_cm: null,
    carton_weight_kg: null,
    prep_type: 'none',
    notes: ''
  })
  const [saving, setSaving] = useState(false)

  // Sync formData when readiness changes
  useEffect(() => {
    if (readiness) {
      // Use functional update to avoid cascading renders
      setFormData(prev => {
        const hasChanges = 
          (readiness.needs_fnsku ?? prev.needs_fnsku) !== prev.needs_fnsku ||
          (readiness.units_per_carton || prev.units_per_carton) !== prev.units_per_carton ||
          (readiness.cartons_count || prev.cartons_count) !== prev.cartons_count ||
          (readiness.carton_length_cm || prev.carton_length_cm) !== prev.carton_length_cm ||
          (readiness.carton_width_cm || prev.carton_width_cm) !== prev.carton_width_cm ||
          (readiness.carton_height_cm || prev.carton_height_cm) !== prev.carton_height_cm ||
          (readiness.carton_weight_kg || prev.carton_weight_kg) !== prev.carton_weight_kg ||
          (readiness.prep_type || prev.prep_type) !== prev.prep_type ||
          (readiness.notes || prev.notes) !== prev.notes
        
        if (!hasChanges) return prev
        
        return {
          ...prev,
          needs_fnsku: readiness.needs_fnsku ?? prev.needs_fnsku,
          units_per_carton: readiness.units_per_carton || prev.units_per_carton,
          cartons_count: readiness.cartons_count || prev.cartons_count,
          carton_length_cm: readiness.carton_length_cm || prev.carton_length_cm,
          carton_width_cm: readiness.carton_width_cm || prev.carton_width_cm,
          carton_height_cm: readiness.carton_height_cm || prev.carton_height_cm,
          carton_weight_kg: readiness.carton_weight_kg || prev.carton_weight_kg,
          prep_type: readiness.prep_type || prev.prep_type,
          notes: readiness.notes || prev.notes
        }
      })
    }
  }, [readiness])

  const handleSave = async () => {
    setSaving(true)
    try {
      await onUpdate(formData)
      alert('Amazon readiness actualitzat correctament')
    } catch (err) {
      console.error('Error guardant:', err)
      alert('Error guardant: ' + (err.message || 'Error desconegut'))
    }
    setSaving(false)
  }

  const styles = {
    container: {
      padding: '16px',
      borderRadius: '8px',
      border: `1px solid ${darkMode ? '#374151' : '#d1d5db'}`,
      backgroundColor: darkMode ? '#15151f' : '#f9fafb'
    },
    statusBadge: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      padding: '6px 12px',
      borderRadius: '6px',
      fontSize: '13px',
      fontWeight: '500',
      marginBottom: '16px'
    },
    missingList: {
      marginTop: '12px',
      padding: '12px',
      borderRadius: '6px',
      backgroundColor: darkMode ? '#1f1f2e' : '#fef2f2',
      border: `1px solid ${darkMode ? '#374151' : '#fecaca'}`
    },
    missingItem: {
      fontSize: '13px',
      color: darkMode ? '#fca5a5' : '#dc2626',
      marginBottom: '4px'
    },
    formGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(2, 1fr)',
      gap: '12px',
      marginTop: '16px'
    },
    formGroup: {
      display: 'flex',
      flexDirection: 'column',
      gap: '6px'
    },
    label: {
      fontSize: '12px',
      fontWeight: '500',
      color: darkMode ? '#9ca3af' : '#6b7280'
    },
    input: {
      padding: '8px 12px',
      borderRadius: '6px',
      border: `1px solid ${darkMode ? '#374151' : '#d1d5db'}`,
      backgroundColor: darkMode ? '#1f1f2e' : '#ffffff',
      color: darkMode ? '#ffffff' : '#111827',
      fontSize: '14px'
    },
    checkbox: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      marginTop: '12px',
      cursor: 'pointer'
    },
    saveButton: {
      padding: '10px 20px',
      backgroundColor: '#4f46e5',
      color: '#ffffff',
      border: '1px solid #3730a3',
      borderRadius: '8px',
      fontSize: '14px',
      fontWeight: '500',
      cursor: 'pointer',
      marginTop: '16px'
    }
  }

  return (
    <div style={styles.container}>
      {/* Status Badge */}
      <div style={{
        ...styles.statusBadge,
        backgroundColor: readyStatus.ready ? '#dcfce7' : '#fef2f2',
        color: readyStatus.ready ? '#166534' : '#991b1b'
      }}>
        {readyStatus.ready ? (
          <>
            <CheckCircle2 size={16} />
            Ready per enviar a Amazon
          </>
        ) : (
          <>
            <XCircle size={16} />
            Missing {readyStatus.missing.length} item(s)
          </>
        )}
      </div>

      {/* Missing Items */}
      {readyStatus.missing.length > 0 && (
        <div style={styles.missingList}>
          <strong style={{ fontSize: '13px', color: darkMode ? '#fca5a5' : '#dc2626', marginBottom: '8px', display: 'block' }}>
            Missing items:
          </strong>
          {readyStatus.missing.map((item, idx) => (
            <div key={idx} style={styles.missingItem}>• {item}</div>
          ))}
        </div>
      )}

      {/* Form */}
      <div style={{ marginTop: '20px' }}>
        <div style={styles.checkbox}>
          <input
            type="checkbox"
            checked={formData.needs_fnsku}
            onChange={e => setFormData({ ...formData, needs_fnsku: e.target.checked })}
          />
          <span style={{ fontSize: '13px', color: darkMode ? '#e5e7eb' : '#374151' }}>
            This PO needs FNSKU labels
          </span>
        </div>

        <div style={styles.formGrid}>
          <div style={styles.formGroup}>
            <label style={{ ...styles.label, display: 'flex', alignItems: 'center', gap: '4px' }}>
              Units per carton
              <HelpIcon helpKey="amazon_ready.units_per_carton" size="small" darkMode={darkMode} />
            </label>
            <input
              type="number"
              value={formData.units_per_carton || ''}
              onChange={e => setFormData({ ...formData, units_per_carton: parseInt(e.target.value) || null })}
              style={styles.input}
              min="1"
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Cartons count</label>
            <input
              type="number"
              value={formData.cartons_count || ''}
              onChange={e => setFormData({ ...formData, cartons_count: parseInt(e.target.value) || null })}
              style={styles.input}
              min="1"
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Length (cm)</label>
            <input
              type="number"
              step="0.1"
              value={formData.carton_length_cm || ''}
              onChange={e => setFormData({ ...formData, carton_length_cm: parseFloat(e.target.value) || null })}
              style={styles.input}
              min="0.1"
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Width (cm)</label>
            <input
              type="number"
              step="0.1"
              value={formData.carton_width_cm || ''}
              onChange={e => setFormData({ ...formData, carton_width_cm: parseFloat(e.target.value) || null })}
              style={styles.input}
              min="0.1"
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Height (cm)</label>
            <input
              type="number"
              step="0.1"
              value={formData.carton_height_cm || ''}
              onChange={e => setFormData({ ...formData, carton_height_cm: parseFloat(e.target.value) || null })}
              style={styles.input}
              min="0.1"
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Weight (kg)</label>
            <input
              type="number"
              step="0.1"
              value={formData.carton_weight_kg || ''}
              onChange={e => setFormData({ ...formData, carton_weight_kg: parseFloat(e.target.value) || null })}
              style={styles.input}
              min="0.1"
            />
          </div>
        </div>

        <div style={{ ...styles.formGroup, marginTop: '12px' }}>
          <label style={styles.label}>Prep type</label>
          <select
            value={formData.prep_type}
            onChange={e => setFormData({ ...formData, prep_type: e.target.value })}
            style={styles.input}
          >
            <option value="none">None</option>
            <option value="polybag">Polybag</option>
            <option value="bubblewrap">Bubble wrap</option>
            <option value="labeling">Labeling</option>
          </select>
        </div>

        <div style={{ ...styles.formGroup, marginTop: '12px' }}>
          <label style={styles.label}>Notes</label>
          <textarea
            value={formData.notes}
            onChange={e => setFormData({ ...formData, notes: e.target.value })}
            style={{ ...styles.input, minHeight: '60px', resize: 'vertical' }}
            placeholder="Additional notes..."
          />
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          style={styles.saveButton}
        >
          {saving ? 'Guardant...' : 'Guardar'}
        </button>
      </div>

      {/* Labels Info */}
      {readiness?.labels_generated_at && (
        <div style={{ marginTop: '16px', padding: '12px', borderRadius: '6px', backgroundColor: darkMode ? '#1f1f2e' : '#f0f9ff', border: `1px solid ${darkMode ? '#374151' : '#bae6fd'}` }}>
          <div style={{ fontSize: '12px', fontWeight: '500', color: darkMode ? '#93c5fd' : '#0369a1', marginBottom: '4px' }}>
            Labels generades:
          </div>
          <div style={{ fontSize: '13px', color: darkMode ? '#e5e7eb' : '#374151' }}>
            {new Date(readiness.labels_generated_at).toLocaleString('ca-ES')} • {readiness.labels_qty} etiquetes • {readiness.labels_template || 'N/A'}
          </div>
        </div>
      )}
    </div>
  )
}
