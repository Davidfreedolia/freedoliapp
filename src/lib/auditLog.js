// Audit Log Service per Freedoliapp
// Registra events crítics a Supabase per observabilitat

import { supabase } from './supabase'

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
export async function logAudit({ entityType, entityId = null, action, status, message = null, meta = {} }) {
  try {
    // Validar paràmetres requerits
    if (!entityType || !action || !status) {
      console.error('[AuditLog] Missing required parameters', { entityType, action, status })
      return
    }

    // Validar que status sigui 'success' o 'error'
    if (status !== 'success' && status !== 'error') {
      console.error('[AuditLog] Invalid status, must be "success" or "error"', { status })
      return
    }

    // Insert a audit_log (user_id s'assigna automàticament per RLS)
    const { error } = await supabase
      .from('audit_log')
      .insert([
        {
          entity_type: entityType,
          entity_id: entityId,
          action: action,
          status: status,
          message: message,
          meta: meta
        }
      ])

    if (error) {
      // NO llançar error, només loguejar-lo
      console.error('[AuditLog] Error inserting audit log:', {
        error: error.message,
        code: error.code,
        entityType,
        action,
        status,
        timestamp: new Date().toISOString()
      })
    }
  } catch (err) {
    // Catch absolutament tot - no hem de trencar l'app per errors d'audit log
    console.error('[AuditLog] Unexpected error in logAudit:', {
      error: err.message,
      stack: err.stack,
      entityType,
      action,
      status,
      timestamp: new Date().toISOString()
    })
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
  const errorMessage = error instanceof Error ? error.message : error
  
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
  await logAudit({
    entityType,
    entityId,
    action,
    status: 'success',
    message: message || `${action} completed successfully`,
    meta
  })
}

export default {
  logAudit,
  logError,
  logSuccess
}












