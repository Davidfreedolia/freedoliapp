import React from 'react'
import { useTranslation } from 'react-i18next'

const STAGE_KEYS = ['supplier', 'production', 'transit', 'warehouse', 'amazon', 'completed']
const STAGE_MATCH = ['Supplier', 'Production', 'Transit', 'Warehouse', 'Amazon', 'Completed']
const COLORS = ['var(--coral-1)', '#F08A3E', '#F0B429', '#2FA4A9', '#B8D94A', '#3FBF9A']

/**
 * Operational timeline: real-world product state (not automation state).
 * @param {{ currentStage?: string }} props
 */
export default function OperationalTimeline({ currentStage }) {
  const { t } = useTranslation()
  const idx = currentStage ? STAGE_MATCH.findIndex((s) => s.toLowerCase() === String(currentStage).toLowerCase()) : -1

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%' }}>
      {STAGE_KEYS.map((key, i) => {
        const active = idx >= 0 ? i <= idx : false
        const color = COLORS[i] ?? 'var(--text-2)'
        const label = t(`operationalTimeline.${key}`)
        return (
          <React.Fragment key={key}>
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
            {i < STAGE_KEYS.length - 1 && (
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
