import React from 'react'
import DecisionRow from './DecisionRow'
import DecisionFilters from './DecisionFilters'

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
  return (
    <div style={{ padding: 12, borderRight: '1px solid var(--border-subtle, #1f2933)', height: '100%', boxSizing: 'border-box' }}>
      <h2 style={{ fontSize: 16, marginBottom: 8 }}>Decisions</h2>
      <DecisionFilters filters={filters} onChange={onFiltersChange} />
      {loading && (
        <div style={{ padding: 8, fontSize: 13, color: 'var(--text-secondary, #6b7280)' }}>
          Loading decisions…
        </div>
      )}
      {error && !loading && (
        <div style={{ padding: 8, fontSize: 13, color: 'var(--status-critical, #b91c1c)' }}>
          Error loading decisions.
          {onRetry && (
            <div>
              <button type="button" onClick={onRetry}>Retry</button>
            </div>
          )}
        </div>
      )}
      {!loading && !error && items.length === 0 && (
        <div style={{ padding: 8, fontSize: 13, color: 'var(--text-secondary, #6b7280)' }}>
          No decisions to show.
        </div>
      )}
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
    </div>
  )
}

