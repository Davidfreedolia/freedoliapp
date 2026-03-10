import React from 'react'
import { AUTOMATION_PROGRESS_STAGES } from '../../../lib/automations/constants/stages'

const DEFAULT_LABELS = {
  decision: 'Decision',
  proposal: 'Proposal',
  approval: 'Approval',
  execution: 'Execution',
  result: 'Result',
}

export default function AutomationProgressBar({ currentStage, steps }) {
  const stageList = Array.isArray(steps) && steps.length ? steps : AUTOMATION_PROGRESS_STAGES
  const idx = Math.max(0, stageList.findIndex((s) => s === currentStage))
  const activeIdx = idx === -1 ? 0 : idx

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%' }}>
      {stageList.map((stage, i) => {
        const done = i < activeIdx
        const active = i === activeIdx
        const dotBg = done ? 'var(--accent, #4f46e5)' : active ? 'var(--accent, #4f46e5)' : 'var(--border-color, #e5e7eb)'
        const dotBorder = done || active ? 'var(--accent, #4f46e5)' : 'var(--border-color, #e5e7eb)'
        const labelColor = active ? 'var(--text-1, #111827)' : 'var(--text-2, #6b7280)'

        return (
          <React.Fragment key={stage}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 56 }}>
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 999,
                  background: dotBg,
                  border: `1px solid ${dotBorder}`,
                }}
              />
              <div style={{ marginTop: 6, fontSize: 12, color: labelColor, fontWeight: active ? 600 : 500 }}>
                {DEFAULT_LABELS[stage] ?? stage}
              </div>
            </div>
            {i < stageList.length - 1 && (
              <div
                aria-hidden="true"
                style={{
                  flex: 1,
                  height: 2,
                  background: i < activeIdx ? 'var(--accent, #4f46e5)' : 'var(--border-color, #e5e7eb)',
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

