import React from 'react'
import DecisionRow from './DecisionRow'
import DecisionFilters from './DecisionFilters'
import { DataState } from '../dataStates'
import { useTranslation } from 'react-i18next'

export default function DecisionList({
  items,
  selectedId,
  onSelect,
  loading,
  error,
  onRetry,
  filters,
  onFiltersChange,
}) {
  const { t } = useTranslation()
  return (
    <div style={{ padding: 12, borderRight: '1px solid var(--border-subtle, #1f2933)', height: '100%', boxSizing: 'border-box' }}>
      <h2 style={{ fontSize: 16, marginBottom: 8 }}>Decisions</h2>
      <DecisionFilters filters={filters} onChange={onFiltersChange} />
      <DataState
        loading={loading}
        error={error}
        isEmpty={items.length === 0}
        emptyMessage={t('dataStates.emptyDecisions', { defaultValue: 'No open decisions' })}
        onRetry={onRetry}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
          {items.map((item) => (
            <DecisionRow
              key={item.id}
              item={item}
              selected={item.id === selectedId}
              onSelect={() => onSelect(item)}
            />
          ))}
        </div>
      </DataState>
    </div>
  )
}

