/**
 * Safe JSON parsing utilities
 * Prevents crashes from malformed JSON strings
 */

/**
 * Safely parse JSON string with fallback
 * @param {any} value - Value to parse (string, object, or already parsed)
 * @param {any} fallback - Fallback value if parsing fails (default: null)
 * @returns {any} Parsed value or fallback
 */
export function safeJsonParse(value, fallback = null) {
  if (value === null || value === undefined) {
    return fallback
  }
  
  // If already an object/array, return as-is
  if (typeof value !== 'string') {
    return value
  }
  
  try {
    const parsed = JSON.parse(value)
    return parsed
  } catch (err) {
    console.warn('safeJsonParse: Failed to parse JSON:', err.message)
    return fallback
  }
}

/**
 * Safely parse JSON string and ensure it's an array
 * Always returns an array, never null/undefined
 * @param {any} value - Value to parse
 * @returns {Array} Always an array (empty if parsing fails)
 */
export function safeJsonArray(value) {
  const parsed = safeJsonParse(value, [])
  return Array.isArray(parsed) ? parsed : []
}

/**
 * Safely parse JSON string and ensure it's an object
 * Always returns an object, never null/undefined
 * @param {any} value - Value to parse
 * @returns {Object} Always an object (empty if parsing fails)
 */
export function safeJsonObject(value) {
  const parsed = safeJsonParse(value, {})
  return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed) 
    ? parsed 
    : {}
}



