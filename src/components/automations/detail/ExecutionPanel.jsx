import React, { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Card from '../../ui/Card'
import Badge from '../../ui/Badge'
import Button from '../../ui/Button'
import { showToast } from '../../Toast'
import { getCurrentUserId } from '../../../lib/supabase'
import { requestAutomationExecution } from '../../../lib/automations/mutations/requestAutomationExecution'
import { retryAutomationExecution } from '../../../lib/automations/mutations/retryAutomationExecution'

function statusVariant(status) {
  const s = (status || '').toString()
  if (s === 'succeeded') return 'success'
  if (s === 'failed') return 'danger'
  if (s === 'running') return 'info'
  if (s === 'partially_succeeded') return 'warning'
  if (s === 'queued') return 'neutral'
  if (s === 'canceled' || s === 'rolled_back') return 'neutral'
  return 'neutral'
}

export default function ExecutionPanel({ orgId, proposal, executions, permissions, onChanged }) {
  const { t } = useTranslation()
  const canExecute = Boolean(permissions?.canExecute)
  const list = Array.isArray(executions) ? executions : []
  const latest = list.length ? list[0] : null

  const [busy, setBusy] = useState(false)

  const proposalId = proposal?.id
  const actionable = useMemo(() => {
    const ps = proposal?.proposalStatus ?? proposal?.proposal_status
    return ps === 'approved' || ps === 'queued_for_execution'
  }, [proposal])

  const unknown = () => t('automations.execution.unknownReason')

  const runExistingExecution = async (executionId) => {
    const actorUserId = await getCurrentUserId()
    if (!actorUserId) {
      showToast(t('automations.execution.missingActor'), 'error', 4500)
      return { ok: false, reason: 'missing_actor' }
    }
    const res = await retryAutomationExecution({ executionId, orgId, actorUserId })
    return res
  }

  const handleTrigger = async () => {
    if (!orgId || !proposalId) return
    if (!canExecute || !actionable) return
    setBusy(true)
    try {
      const queued = list.find((e) => e.execution_status === 'queued')
      if (queued?.id) {
        const res = await runExistingExecution(queued.id)
        if (res?.status === 'succeeded') showToast(t('automations.execution.succeeded'), 'success')
        else if (res?.status === 'failed') showToast(t('automations.execution.failed'), 'error', 4500)
        else showToast(t('automations.execution.blocked', { reason: res?.reason ?? unknown() }), 'warning', 4500)
        onChanged?.()
        return
      }

      const intent = await requestAutomationExecution({ proposalId, orgId })
      if (intent?.status === 'created' && intent.executionId) {
        const res = await runExistingExecution(intent.executionId)
        if (res?.status === 'succeeded') showToast(t('automations.execution.succeeded'), 'success')
        else if (res?.status === 'failed') showToast(t('automations.execution.failed'), 'error', 4500)
        else showToast(t('automations.execution.blocked', { reason: res?.reason ?? unknown() }), 'warning', 4500)
        onChanged?.()
        return
      }

      if (intent?.status === 'duplicate') {
        showToast(t('automations.execution.duplicateIntent'), 'info', 3500)
        onChanged?.()
        return
      }

      showToast(t('automations.execution.blocked', { reason: intent?.reason ?? unknown() }), 'warning', 4500)
    } catch (err) {
      showToast(t('automations.execution.triggerFailed'), 'error', 4500)
    } finally {
      setBusy(false)
    }
  }

  const handleRetry = async () => {
    if (!latest?.id) return
    setBusy(true)
    try {
      const res = await runExistingExecution(latest.id)
      if (res?.status === 'succeeded') showToast(t('automations.execution.succeeded'), 'success')
      else if (res?.status === 'failed') showToast(t('automations.execution.failed'), 'error', 4500)
      else showToast(t('automations.execution.blocked', { reason: res?.reason ?? unknown() }), 'warning', 4500)
      onChanged?.()
    } catch (err) {
      showToast(t('automations.execution.retryFailed'), 'error', 4500)
    } finally {
      setBusy(false)
    }
  }

  const dash = '—'
  const fmt = (iso) => (iso ? new Date(iso).toLocaleString() : dash)

  const executionStatusLabel = (raw) =>
    t(`automations.execution.status.${raw}`, { defaultValue: raw || dash })

  const executionModeLabel = (raw) =>
    t(`automations.execution.mode.${raw}`, { defaultValue: raw || dash })

  return (
    <Card className="ui-card--elevated" style={{ padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1, #111827)' }}>{t('automations.execution.title')}</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button size="sm" variant="primary" disabled={!canExecute || !actionable || busy} loading={busy} onClick={handleTrigger}>
            {t('automations.execution.triggerButton')}
          </Button>
          <Button size="sm" variant="secondary" disabled={!canExecute || !latest?.id || busy} loading={busy} onClick={handleRetry}>
            {t('automations.execution.retryButton')}
          </Button>
        </div>
      </div>

      {!latest ? (
        <div style={{ color: 'var(--text-2, #6b7280)', fontSize: 13 }}>{t('automations.execution.empty')}</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <Badge variant={statusVariant(latest.execution_status)}>
                {executionStatusLabel(latest.execution_status)}
              </Badge>
              <div style={{ fontSize: 13, color: 'var(--text-2, #6b7280)' }}>
                {t('automations.execution.modeLine', { mode: executionModeLabel(latest.execution_mode) })}
              </div>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-2, #6b7280)' }}>
              {latest.created_at ? new Date(latest.created_at).toLocaleString() : dash}
            </div>
          </div>

          <div style={{ fontSize: 13, color: 'var(--text-2, #6b7280)' }}>
            {t('automations.execution.startFinishLine', {
              start: fmt(latest.started_at),
              finish: fmt(latest.finished_at)
            })}
          </div>

          {latest.error_message ? (
            <div style={{ fontSize: 13, color: 'var(--text-1, #111827)' }}>
              <strong>{t('automations.execution.errorLabel')}</strong>: {latest.error_message}
            </div>
          ) : null}

          {latest.result_json ? (
            <div style={{ fontSize: 12, color: 'var(--text-2, #6b7280)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              <strong style={{ color: 'var(--text-1, #111827)' }}>{t('automations.execution.resultLabel')}</strong>:{' '}
              {JSON.stringify(latest.result_json, null, 2)}
            </div>
          ) : null}
        </div>
      )}
    </Card>
  )
}
