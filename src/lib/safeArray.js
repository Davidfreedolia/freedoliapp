/**
 * Safe array operations utilities
 * Prevents crashes from null/undefined values in array operations
 */

/**
 * Ensure value is an array, return empty array if not
 * @param {any} value - Value to check
 * @returns {Array} Always an array
 */
export function safeArray(value) {
  return Array.isArray(value) ? value : []
}

/**
 * Safely map over an array
 * @param {any} value - Value to map over
 * @param {Function} fn - Map function
 * @returns {Array} Mapped array (empty if value is not an array)
 */
export function safeMap(value, fn) {
  const arr = safeArray(value)
  return arr.map(fn)
}

/**
 * Safely filter an array
 * @param {any} value - Value to filter
 * @param {Function} fn - Filter function
 * @returns {Array} Filtered array (empty if value is not an array)
 */
export function safeFilter(value, fn) {
  const arr = safeArray(value)
  return arr.filter(fn)
}

/**
 * Safely reduce an array
 * @param {any} value - Value to reduce
 * @param {Function} fn - Reduce function
 * @param {any} initial - Initial value
 * @returns {any} Reduced value (initial if value is not an array)
 */
export function safeReduce(value, fn, initial) {
  const arr = safeArray(value)
  return arr.reduce(fn, initial)
}




