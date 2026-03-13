/**
 * Wrapper for the common loading / error / empty / content branching.
 * Use when a screen has a single clear async state boundary.
 * Kept minimal; no heavy configuration.
 */
import DataLoading from './DataLoading.jsx'
import DataEmpty from './DataEmpty.jsx'
import DataError from './DataError.jsx'

export default function DataState({
  loading,
  error,
  isEmpty,
  loadingMessage,
  emptyMessage,
  errorMessage,
  onRetry,
  emptyIcon,
  emptyAction,
  children,
}) {
  if (loading) {
    return <DataLoading message={loadingMessage} />
  }
  if (error) {
    return (
      <DataError
        message={errorMessage != null ? errorMessage : error}
        onRetry={onRetry}
      />
    )
  }
  if (isEmpty) {
    return (
      <DataEmpty
        message={emptyMessage}
        icon={emptyIcon}
        action={emptyAction}
      />
    )
  }
  return children ?? null
}
