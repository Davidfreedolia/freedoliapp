// Error Handling Service per Freedoliapp
// Unifica gestió d'errors per evitar errors silenciosos

/**
 * Formata un error per mostrar un missatge usable a l'usuari
 * 
 * @param {Error|string|object} err - Error object, string o objecte amb error
 * @returns {string} Missatge formatat amigable per l'usuari
 * 
 * @example
 * formatError(new Error('Network error')) // "Error de xarxa"
 * formatError('File too large') // "Fitxer massa gran"
 */
export function formatError(err) {
  if (!err) return 'Error desconegut'

  // Si és string, retornar directament
  if (typeof err === 'string') {
    return err
  }

  // Si és Error object
  if (err instanceof Error) {
    const message = err.message || err.toString()
    
    // Traduccions/mapeig de missatges comuns
    if (message.includes('NetworkError') || message.includes('Failed to fetch')) {
      return 'Error de connexió. Comprova la teva connexió a Internet.'
    }
    if (message.includes('401') || message.includes('Unauthorized')) {
      return 'No autoritzat. Torna a iniciar sessió.'
    }
    if (message.includes('403') || message.includes('Forbidden')) {
      return 'No tens permisos per realitzar aquesta acció.'
    }
    if (message.includes('404') || message.includes('Not found')) {
      return 'Recurs no trobat.'
    }
    if (message.includes('AUTH_REQUIRED')) {
      return 'Reconnecta Google Drive. La sessió ha expirat.'
    }
    if (message.includes('duplicate key') || message.includes('already exists')) {
      return 'Aquest element ja existeix.'
    }
    if (message.includes('too large') || message.includes('413')) {
      return 'El fitxer és massa gran.'
    }
    
    // Retornar el missatge original
    return message
  }

  // Si és objecte amb propietat message o error
  if (typeof err === 'object') {
    return err.message || err.error || err.toString() || 'Error desconegut'
  }

  return 'Error desconegut'
}

/**
 * Mostra un error a l'usuari de forma consistent
 * Per ara utilitza alert(), però es pot migrar a un sistema de toast/notificacions
 * 
 * @param {Error|string} error - Error object o missatge
 * @param {object} options - Opcions
 * @param {boolean} options.critical - Si és crític, mostra alert. Si no, només console.warn
 * @param {string} options.title - Títol del missatge (opcional)
 */
export function notifyError(error, options = {}) {
  const { critical = true, title = null } = options
  const message = formatError(error)

  if (critical) {
    // Per ara utilitzem alert, però es pot canviar a un sistema de toast
    if (title) {
      alert(`${title}: ${message}`)
    } else {
      alert(message)
    }
  } else {
    // Només loguejar errors no crítics
    console.warn('[Error]', message)
  }
}

/**
 * Helper per gestionar errors de forma completa:
 * 1. Loguejar a audit log (si aplica)
 * 2. Notificar a l'usuari
 * 3. Retornar missatge formatat
 * 
 * @param {string} entityType - Tipus d'entitat per audit log
 * @param {string} action - Acció que ha fallat per audit log
 * @param {Error|string} error - Error object o missatge
 * @param {object} options - Opcions
 * @param {boolean} options.notify - Si mostrar alert a l'usuari (default: true)
 * @param {boolean} options.critical - Si és crític (default: true)
 * @param {object} options.meta - Metadata per audit log
 * @returns {string} Missatge formatat
 */
export async function handleError(entityType, action, error, options = {}) {
  const { notify = true, critical = true, meta = {} } = options
  const message = formatError(error)

  // Loguejar a audit log (si hi ha entityType i action)
  if (entityType && action) {
    try {
      const { logError } = await import('./auditLog')
      await logError(entityType, action, error, meta)
    } catch (err) {
      // Si falla l'import o el log, no fa res (no volem trencar l'app)
      console.warn('[ErrorHandling] Failed to log error to audit log:', err)
    }
  }

  // Notificar a l'usuari
  if (notify) {
    notifyError(error, { critical })
  }

  return message
}

export default {
  formatError,
  notifyError,
  handleError
}








