// Audit Log Service per Freedoliapp
// Registra events crítics a Supabase per observabilitat
//
// IMPORTANT: This module must NOT import supabase.js at module scope to avoid circular dependencies.
// All supabase imports are done dynamically inside functions.

/**
 * Registra un event a l'audit log
 * AQUESTA FUNCIÓ NO HA DE TRENCAR MAI L'APP - sempre fa catch silenciós
 * 
 * @param {object} params - Paràmetres de l'event
 * @param {string} params.entityType - Tipus d'entitat ('project', 'purchase_order', 'document', 'drive', etc.)
 * @param {string|null} params.entityId - ID de l'entitat (opcional)
 * @param {string} params.action - Acció realitzada ('create', 'update', 'delete', 'upload', 'ensure_folders', 'login', 'logout')
 * @param {'success'|'error'} params.status - Estat de l'acció
 * @param {string|null} params.message - Missatge descriptiu (opcional)
 * @param {object} params.meta - Informació addicional en JSON (opcional)
 * 
 * @example
 * logAudit({
 *   entityType: 'project',
 *   entityId: '123e4567-e89b-12d3-a456-426614174000',
 *   action: 'create',
 *   status: 'success',
 *   message: 'Project created successfully',
 *   meta: { project_code: 'PR-FRDL250001' }
 * })
 */
/**
 * Best-effort audit log insert. Never throws. Returns { ok: true } or { ok: false }.
 * No session/user/org_id -> returns immediately without making any request.
 */
export async function logAudit({ entityType, entityId = null, action, status, message = null, meta = {} }) {
  try {
    if (!entityType || !action || !status) {
      return { ok: false }
    }
    if (status !== 'success' && status !== 'error') {
      return { ok: false }
    }

    const { getCurrentUserId, supabase } = await import('./supabase')
    const userId = await getCurrentUserId()
    if (!userId) {
      return { ok: false }
    }

    let demoMode = false
    try {
      const { getDemoMode } = await import('./demoModeFilter')
      demoMode = await getDemoMode()
    } catch (_) {}

    const { error } = await supabase
      .from('audit_log')
      .insert([
        {
          entity_type: entityType,
          entity_id: entityId,
          action: action,
          status: status,
          message: message,
          meta: meta,
          user_id: userId,
          is_demo: demoMode,
          org_id: null
        }
      ])

    if (error) {
      console.warn('[AuditLog] Insert failed (best-effort):', error?.message || error?.code, { entityType, action, status })
      return { ok: false }
    }
    return { ok: true }
  } catch (err) {
    console.warn('[AuditLog] Unexpected error (best-effort):', err?.message, { entityType, action, status })
    return { ok: false }
  }
}

/**
 * Helper per loguejar errors de forma consistent
 * 
 * @param {string} entityType - Tipus d'entitat
 * @param {string} action - Acció que ha fallat
 * @param {Error|string} error - Error object o missatge
 * @param {object} meta - Informació addicional
 */
export async function logError(entityType, action, error, meta = {}) {
  try {
    const errorMessage = error instanceof Error ? error.message : String(error)
    await logAudit({
      entityType,
      action,
      status: 'error',
      message: errorMessage,
      meta: {
        ...meta,
        error_type: error instanceof Error ? error.constructor.name : 'string',
        ...(error instanceof Error && error.stack ? { stack: error.stack.substring(0, 500) } : {})
      }
    })
  } catch (_) {
    console.warn('[AuditLog] logError failed (silent):', entityType, action)
  }
}

/**
 * Helper per loguejar successos de forma consistent
 * 
 * @param {string} entityType - Tipus d'entitat
 * @param {string} action - Acció completada
 * @param {string|null} entityId - ID de l'entitat
 * @param {string} message - Missatge de success
 * @param {object} meta - Informació addicional
 */
export async function logSuccess(entityType, action, entityId = null, message = null, meta = {}) {
  try {
    await logAudit({
      entityType,
      entityId,
      action,
      status: 'success',
      message: message || `${action} completed successfully`,
      meta
    })
  } catch (_) {
    console.warn('[AuditLog] logSuccess failed (silent):', entityType, action)
  }
}

export default {
  logAudit,
  logError,
  logSuccess
}














