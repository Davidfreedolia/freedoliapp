/**
 * Centralized error logging utility
 * Differentiates between error types and provides appropriate handling
 */

export const ERROR_TYPES = {
  AUTH: 'auth',
  NETWORK: 'network',
  RENDER: 'render',
  DATABASE: 'database',
  VALIDATION: 'validation',
  UNKNOWN: 'unknown'
}

export const logError = (error, context = {}, errorType = ERROR_TYPES.UNKNOWN) => {
  const errorId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  
  const errorData = {
    id: errorId,
    type: errorType,
    message: error?.message || 'Unknown error',
    stack: error?.stack,
    context: {
      ...context,
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString()
    }
  }

  // Console logging (only in development)
  if (import.meta.env.DEV) {
    console.error(`[${errorType.toUpperCase()}]`, errorData)
  }

  // Store in localStorage for debugging (last 10 errors)
  try {
    const errors = JSON.parse(localStorage.getItem('app_errors') || '[]')
    errors.unshift(errorData)
    localStorage.setItem('app_errors', JSON.stringify(errors.slice(0, 10)))
  } catch (e) {
    // Ignore localStorage errors
  }

  // In production, you might want to send to error tracking service
  // if (import.meta.env.PROD) {
  //   sendToErrorTracking(errorData)
  // }

  return errorId
}

export const handleSupabaseError = (error, context = {}) => {
  if (!error) return null

  // Determine error type
  let errorType = ERROR_TYPES.DATABASE
  let userMessage = 'Error de base de dades'

  if (error.message?.includes('JWT') || error.message?.includes('auth')) {
    errorType = ERROR_TYPES.AUTH
    userMessage = 'Error d\'autenticació'
  } else if (error.message?.includes('network') || error.message?.includes('fetch')) {
    errorType = ERROR_TYPES.NETWORK
    userMessage = 'Error de connexió'
  }

  logError(error, context, errorType)

  return {
    errorId: logError(error, context, errorType),
    userMessage,
    errorType
  }
}

export const safeAsync = async (asyncFn, fallback = null, context = {}) => {
  try {
    return await asyncFn()
  } catch (error) {
    logError(error, context, ERROR_TYPES.UNKNOWN)
    return fallback
  }
}

export const safeGet = (obj, path, defaultValue = null) => {
  try {
    const keys = path.split('.')
    let result = obj
    for (const key of keys) {
      if (result == null) return defaultValue
      result = result[key]
    }
    return result ?? defaultValue
  } catch {
    return defaultValue
  }
}

export const safeArray = (arr) => {
  return Array.isArray(arr) ? arr : []
}

export const safeNumber = (value, defaultValue = 0) => {
  const num = parseFloat(value)
  return isNaN(num) ? defaultValue : num
}

export const safeDate = (dateString, defaultValue = null) => {
  if (!dateString) return defaultValue
  try {
    const date = new Date(dateString)
    return isNaN(date.getTime()) ? defaultValue : date
  } catch {
    return defaultValue
  }
}




