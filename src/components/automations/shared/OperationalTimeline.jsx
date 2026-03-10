import React from 'react'

const STAGES = ['Supplier', 'Production', 'Transit', 'Warehouse', 'Amazon', 'Completed']
const COLORS = ['#ef4444', '#f97316', '#f59e0b', '#3b82f6', '#86efac', '#22c55e']

/**
 * Operational timeline: real-world product state (not automation state).
 * @param {{ currentStage?: string }} props
 */
export default function OperationalTimeline({ currentStage }) {
  const idx = currentStage ? STAGES.findIndex((s) => s.toLowerCase() === String(currentStage).toLowerCase()) : -1

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%' }}>
      {STAGES.map((label, i) => {
        const active = idx >= 0 ? i <= idx : false
        const color = COLORS[i] ?? '#6b7280'
        return (
          <React.Fragment key={label}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 72 }}>
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 999,
                  background: active ? color : 'var(--border-color, #e5e7eb)',
                  border: `1px solid ${active ? color : 'var(--border-color, #e5e7eb)'}`,
                }}
              />
              <div style={{ marginTop: 6, fontSize: 12, color: active ? 'var(--text-1, #111827)' : 'var(--text-2, #6b7280)', fontWeight: active ? 600 : 500 }}>
                {label}
              </div>
            </div>
            {i < STAGES.length - 1 && (
              <div
                aria-hidden="true"
                style={{
                  flex: 1,
                  height: 2,
                  background: idx >= 0 && i < idx ? COLORS[i + 1] : 'var(--border-color, #e5e7eb)',
                  borderRadius: 999,
                }}
              />
            )}
          </React.Fragment>
        )
      })}
    </div>
  )
}

