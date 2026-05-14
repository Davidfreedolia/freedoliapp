import React from 'react'
import { useTranslation } from 'react-i18next'

export default function DecisionFilters({ filters, onChange }) {
  const { t } = useTranslation()

  const STATUS_OPTIONS = [
    { value: 'open_ack',  label: t('decisionFilters.status.openAck') },
    { value: 'open_only', label: t('decisionFilters.status.openOnly') },
    { value: 'all',       label: t('decisionFilters.status.all') },
    { value: 'acted',     label: t('decisionFilters.status.acted') },
    { value: 'dismissed', label: t('decisionFilters.status.dismissed') },
    { value: 'expired',   label: t('decisionFilters.status.expired') },
  ]

  const TYPE_OPTIONS = [
    { value: 'all',     label: t('decisionFilters.type.all') },
    { value: 'reorder', label: t('decisionFilters.type.reorder') },
  ]

  const SEVERITY_OPTIONS = [
    { value: 'all',    label: t('decisionFilters.severity.all') },
    { value: 'high',   label: t('decisionFilters.severity.high') },
    { value: 'medium', label: t('decisionFilters.severity.medium') },
    { value: 'low',    label: t('decisionFilters.severity.low') },
  ]

  const CONFIDENCE_OPTIONS = [
    { value: 'all',    label: t('decisionFilters.confidence.all') },
    { value: 'high',   label: t('decisionFilters.confidence.high') },
    { value: 'medium', label: t('decisionFilters.confidence.medium') },
    { value: 'low',    label: t('decisionFilters.confidence.low') },
  ]

  const handleChange = (key) => (e) => {
    onChange({ ...filters, [key]: e.target.value })
  }

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
      <select value={filters.status} onChange={handleChange('status')}>
        {STATUS_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      <select value={filters.decisionType} onChange={handleChange('decisionType')}>
        {TYPE_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      <select value={filters.severity} onChange={handleChange('severity')}>
        {SEVERITY_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      <select value={filters.confidence} onChange={handleChange('confidence')}>
        {CONFIDENCE_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  )
}
