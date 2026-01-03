import { createClient } from '@supabase/supabase-js'
import { isDemoMode } from '../demo/demoMode'
import {
  mockGetProjects,
  mockGetProject,
  mockGetPurchaseOrders,
  mockGetPurchaseOrder,
  mockGetPosWaitingManufacturer,
  mockGetPosNotReady,
  mockGetShipmentsInTransit,
  mockGetResearchNoDecision,
  mockGetStaleTracking,
  mockGetTasks,
  mockGetStickyNotes,
  mockGetExpenses,
  mockGetIncomes,
  mockGetSuppliers,
  mockGetDashboardStats,
  mockGetProjectsMissingGtin,
  mockGetUnassignedGtinCodes
} from '../demo/demoMode'

// Llegeix variables de Vite
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Error claríssim (en lloc de “supabaseUrl is required”)
function missingEnvError() {
  const msg =
    'FALTA CONFIGURACIÓ: No s’han carregat les variables de Supabase.\n\n' +
    'Solució ràpida:\n' +
    '1) Comprova que el fitxer .env està a la mateixa carpeta que package.json\n' +
    '2) Assegura que tens:\n' +
    '   VITE_SUPABASE_URL=...\n' +
    '   VITE_SUPABASE_ANON_KEY=...\n' +
    '3) Renomena o elimina .env.local si existeix (pot sobreescriure .env)\n' +
    '4) Para i torna a arrencar: Ctrl+C i npm run dev\n'

  // Log per consola (per diagnòstic)
  console.error(msg)
  console.error('DEBUG env:', {
    VITE_SUPABASE_URL: supabaseUrl,
    VITE_SUPABASE_ANON_KEY_present: Boolean(supabaseAnonKey),
  })

  // També ho pintem a la pantalla (perquè no “quedi en blanc”)
  if (typeof document !== 'undefined') {
    document.body.innerHTML = `
      <div style="font-family:system-ui;padding:24px;max-width:900px;margin:0 auto;">
        <h2 style="margin:0 0 12px;">Freedoliapp no pot arrencar</h2>
        <pre style="white-space:pre-wrap;background:#111;color:#eee;padding:16px;border-radius:12px;">${msg}</pre>
        <p style="opacity:.8;">Mira també la Console (F12) per més detalls.</p>
      </div>
    `
  }

  throw new Error(msg)
}

// Demo mode: create dummy client if env vars missing, otherwise use real client
let supabaseClient
if (isDemoMode() && (!supabaseUrl || !supabaseAnonKey)) {
  // Create a dummy client that won't be used in demo mode
  supabaseClient = createClient('https://demo.supabase.co', 'demo-key', {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })
} else {
  if (!supabaseUrl || !supabaseAnonKey) {
    missingEnvError()
  }

  // Client Supabase robust (sessions, refresh, etc.)
  supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'freedoliapp-auth',
    },
  })
}

export const supabase = supabaseClient

// ============================================
// HELPERS
// ============================================

// Obtenir user_id de la sessió actual
export const getCurrentUserId = async () => {
  // Demo mode: return demo user ID
  if (isDemoMode()) {
    return 'demo-user-id'
  }
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No hi ha usuari autenticat')
  return user.id
}

// ============================================
// FUNCIONS API
// ============================================

// PROJECTES
export const getProjects = async (includeDiscarded = false) => {
  // Get demo mode setting
  const { getDemoMode } = await import('./demoModeFilter')
  const demoMode = await getDemoMode()
  
  // Legacy demo mode check (for backward compatibility)
  if (isDemoMode() && !demoMode) {
    return await mockGetProjects(includeDiscarded)
  }
  
  const userId = await getCurrentUserId()
  let query = supabase
    .from('projects')
    .select('*')
    .eq('user_id', userId)
    .eq('is_demo', demoMode) // Filter by demo mode
    .order('created_at', { ascending: false })
  
  const { data, error } = await query
  
  if (error) throw error
  
  // Per defecte, excloure DISCARDED (filter client-side to avoid query issues)
  if (!includeDiscarded) {
    return (data || []).filter(p => !p.decision || p.decision !== 'DISCARDED')
  }
  
  return data || []
}

export const getProject = async (id) => {
  // Get demo mode setting
  const { getDemoMode } = await import('./demoModeFilter')
  const demoMode = await getDemoMode()
  
  // Legacy demo mode check (for backward compatibility)
  if (isDemoMode() && !demoMode) {
    return await mockGetProject(id)
  }
  
  const userId = await getCurrentUserId()
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .eq('is_demo', demoMode) // Filter by demo mode
    .single()
  if (error) throw error
  return data
}

export const createProject = async (project) => {
  // Get demo mode setting
  const { getDemoMode } = await import('./demoModeFilter')
  const demoMode = await getDemoMode()
  
  const userId = await getCurrentUserId()
  
  // Eliminar user_id si ve del client (seguretat: sempre s'assigna automàticament)
  const { user_id, ...projectData } = project
  
  // Retry up to 5 times on duplicate SKU error
  let attempts = 0
  const maxAttempts = 5
  
  while (attempts < maxAttempts) {
    try {
      const { data, error } = await supabase
        .from('projects')
        .insert([{ 
          ...projectData, 
          user_id: userId, // Always set user_id explicitly
          is_demo: demoMode // Mark with current demo mode
        }])
        .select()
        .single()
      
      if (error) {
        // Check if it's a duplicate SKU error (23505 = unique_violation)
        if (error.code === '23505' && (error.message.includes('sku') || error.message.includes('idx_projects_sku'))) {
          attempts++
          if (attempts >= maxAttempts) {
            throw new Error('SKU duplicat: el codi SKU ja existeix. Torna a intentar crear el projecte.')
          }
          // Regenerate codes and retry
          const newCodes = await generateProjectCode()
          projectData.project_code = newCodes.projectCode
          projectData.sku = newCodes.sku
          continue
        }
        throw error
      }
      
      // Audit log: project created with is_demo value
      try {
        const { logAudit } = await import('./auditLog')
        await logAudit({
          entityType: 'project',
          entityId: data.id,
          action: 'create',
          status: 'success',
          message: `Project created with is_demo=${demoMode}`,
          meta: {
            project_code: data.project_code,
            sku: data.sku,
            is_demo: demoMode
          }
        })
      } catch (auditErr) {
        // Don't fail project creation if audit log fails
        console.warn('Failed to log project creation:', auditErr)
      }
      
      return data
    } catch (err) {
      if (attempts >= maxAttempts - 1) {
        throw err
      }
      attempts++
    }
  }
  
  throw new Error('Error creant projecte després de múltiples intents')
}

export const updateProject = async (id, updates) => {
  // Demo mode: show message, don't actually update
  if (isDemoMode()) {
    throw new Error('DEMO_MODE: No es pot actualitzar projectes en mode demo. Desactiva VITE_DEMO_MODE per usar funcionalitats reals.')
  }
  
  // Eliminar user_id si ve del client (no es pot canviar)
  const { user_id, ...updateData } = updates
  const { data, error } = await supabase
    .from('projects')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export const deleteProject = async (id) => {
  // Demo mode: show message, don't actually delete
  if (isDemoMode()) {
    throw new Error('DEMO_MODE: No es pot eliminar projectes en mode demo. Desactiva VITE_DEMO_MODE per usar funcionalitats reals.')
  }
  
  const { error } = await supabase.from('projects').delete().eq('id', id)
  if (error) throw error
  return true
}

// PROVEÏDORS
export const getSuppliers = async () => {
  // Get demo mode setting
  const { getDemoMode } = await import('./demoModeFilter')
  const demoMode = await getDemoMode()
  
  // Legacy demo mode check (for backward compatibility)
  if (isDemoMode() && !demoMode) {
    return await mockGetSuppliers()
  }
  
  const userId = await getCurrentUserId()
  const { data, error } = await supabase
    .from('suppliers')
    .select('*')
    .eq('user_id', userId)
    .eq('is_demo', demoMode) // Filter by demo mode
    .order('name', { ascending: true })
  if (error) throw error
  return data
}

export const getSupplier = async (id) => {
  const { data, error } = await supabase
    .from('suppliers')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export const createSupplier = async (supplier) => {
  // Eliminar user_id si ve del client (seguretat: sempre s'assigna automàticament)
  const { user_id, ...supplierData } = supplier
  const { data, error } = await supabase
    .from('suppliers')
    .insert([supplierData])
    .select()
    .single()
  if (error) throw error
  return data
}

export const updateSupplier = async (id, updates) => {
  // Eliminar user_id si ve del client (no es pot canviar)
  const { user_id, ...updateData } = updates
  const { data, error } = await supabase
    .from('suppliers')
    .update({ ...updateData, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export const deleteSupplier = async (id) => {
  const { error } = await supabase.from('suppliers').delete().eq('id', id)
  if (error) throw error
  return true
}

// Obtenir proveïdors per tipus
export const getSuppliersByType = async (type) => {
  // Get demo mode setting
  const { getDemoMode } = await import('./demoModeFilter')
  const demoMode = await getDemoMode()
  
  const userId = await getCurrentUserId()
  const { data, error } = await supabase
    .from('suppliers')
    .eq('user_id', userId)
    .eq('is_demo', demoMode) // Filter by demo mode
    .select('*')
    .eq('type', type)
    .order('name', { ascending: true })
  if (error) throw error
  return data
}

// TRANSITARIS (ara és un tipus de supplier)
export const getForwarders = async () => getSuppliersByType('freight')
export const createForwarder = async (forwarder) =>
  createSupplier({ ...forwarder, type: 'freight' })

// PURCHASE ORDERS
export const getPurchaseOrders = async (projectId = null) => {
  // Get demo mode setting
  const { getDemoMode } = await import('./demoModeFilter')
  const demoMode = await getDemoMode()
  
  // Legacy demo mode check (for backward compatibility)
  if (isDemoMode() && !demoMode) {
    const data = await mockGetPurchaseOrders()
    if (projectId) {
      return data.filter(po => po.project_id === projectId)
    }
    return data
  }
  
  const userId = await getCurrentUserId()
  let query = supabase
    .from('purchase_orders')
    .select(
      `
      *,
      supplier:suppliers(name, contact_name, email),
      project:projects(name, project_code, sku)
    `
    )
    .eq('user_id', userId)
    .eq('is_demo', demoMode) // Filter by demo mode
    .order('created_at', { ascending: false })

  if (projectId) query = query.eq('project_id', projectId)

  const { data, error } = await query
  if (error) throw error
  return data
}

export const getPurchaseOrder = async (id) => {
  // Demo mode: return mock data
  if (isDemoMode()) {
    return await mockGetPurchaseOrder(id)
  }
  
  const { data, error } = await supabase
    .from('purchase_orders')
    .select(
      `
      *,
      supplier:suppliers(*),
      project:projects(*)
    `
    )
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export const createPurchaseOrder = async (po) => {
  // Get demo mode setting
  const { getDemoMode } = await import('./demoModeFilter')
  const demoMode = await getDemoMode()
  
  // Eliminar user_id si ve del client (seguretat: sempre s'assigna automàticament)
  const { user_id, ...poData } = po
  const { data, error } = await supabase
    .from('purchase_orders')
    .insert([{ ...poData, is_demo: demoMode }]) // Mark with current demo mode
    .select()
    .single()
  if (error) throw error
  return data
}

export const updatePurchaseOrder = async (id, updates) => {
  // Eliminar user_id si ve del client (no es pot canviar)
  const { user_id, ...updateData } = updates
  
  // El trigger de la BD actualitzarà logistics_updated_at automàticament
  // quan canvien logistics_status o tracking_number, però per seguretat
  // també el gestionem al client si cal
  const { data, error } = await supabase
    .from('purchase_orders')
    .update({ ...updateData, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export const deletePurchaseOrder = async (id) => {
  const { error } = await supabase
    .from('purchase_orders')
    .delete()
    .eq('id', id)
  if (error) throw error
  return true
}

// DOCUMENTS
export const getDocuments = async (projectId) => {
  // Get demo mode setting
  const { getDemoMode } = await import('./demoModeFilter')
  const demoMode = await getDemoMode()
  
  const userId = await getCurrentUserId()
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('user_id', userId)
    .eq('is_demo', demoMode) // Filter by demo mode
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export const createDocument = async (doc) => {
  // Eliminar user_id si ve del client (seguretat: sempre s'assigna automàticament)
  const { user_id, ...docData } = doc
  
  // Evitar duplicats: comprovar si ja existeix document amb mateix drive_file_id
  if (docData.drive_file_id) {
    const { data: existing } = await supabase
      .from('documents')
      .select('id')
      .eq('drive_file_id', docData.drive_file_id)
      .eq('project_id', docData.project_id)
      .maybeSingle()
    
    if (existing) {
      // Ja existeix, retornar l'existent (o llançar error segons preferència)
      return existing
    }
  }
  
  // Comprovar també per nom + projecte (fallback si no tenim drive_file_id)
  if (docData.name && docData.project_id) {
    const { data: existingByName } = await supabase
      .from('documents')
      .select('id')
      .eq('name', docData.name)
      .eq('project_id', docData.project_id)
      .maybeSingle()
    
    if (existingByName) {
      // Si ja existeix però no té drive_file_id, actualitzar-lo
      if (docData.drive_file_id) {
        const { data: updated, error: updateError } = await supabase
          .from('documents')
          .update({ drive_file_id: docData.drive_file_id, file_url: docData.file_url })
          .eq('id', existingByName.id)
          .select()
          .single()
        if (updateError) throw updateError
        return updated
      }
      return existingByName
    }
  }
  
  // Crear nou document
  const { data, error } = await supabase
    .from('documents')
    .insert([docData])
    .select()
    .single()
  if (error) throw error
  return data
}

export const deleteDocument = async (id) => {
  const { error } = await supabase.from('documents').delete().eq('id', id)
  if (error) throw error
  return true
}

// PAGAMENTS
export const getPayments = async (projectId = null) => {
  // Get demo mode setting
  const { getDemoMode } = await import('./demoModeFilter')
  const demoMode = await getDemoMode()
  
  const userId = await getCurrentUserId()
  let query = supabase
    .from('payments')
    .select('*')
    .eq('user_id', userId)
    .eq('is_demo', demoMode) // Filter by demo mode
    .order('payment_date', { ascending: false })

  if (projectId) query = query.eq('project_id', projectId)

  const { data, error } = await query
  if (error) throw error
  return data
}

export const createPayment = async (payment) => {
  // Get demo mode setting
  const { getDemoMode } = await import('./demoModeFilter')
  const demoMode = await getDemoMode()
  
  // Eliminar user_id si ve del client (seguretat: sempre s'assigna automàticament)
  const { user_id, ...paymentData } = payment
  const { data, error } = await supabase
    .from('payments')
    .insert([{ ...paymentData, is_demo: demoMode }]) // Mark with current demo mode
    .select()
    .single()
  if (error) throw error
  return data
}

export const updatePayment = async (id, updates) => {
  // Eliminar user_id si ve del client (no es pot canviar)
  const { user_id, ...updateData } = updates
  const { data, error } = await supabase
    .from('payments')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export const deletePayment = async (id) => {
  const { error } = await supabase.from('payments').delete().eq('id', id)
  if (error) throw error
  return true
}

// ESTADÍSTIQUES DASHBOARD
export const getDashboardStats = async () => {
  // Get demo mode setting
  const { getDemoMode } = await import('./demoModeFilter')
  const demoMode = await getDemoMode()
  
  // Legacy demo mode check (for backward compatibility)
  if (isDemoMode() && !demoMode) {
    return await mockGetDashboardStats()
  }
  
  const userId = await getCurrentUserId()
  // RLS maneja el filtrado por user_id automáticamente, pero afegim is_demo filter
  const { data: projects, error } = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', userId)
    .eq('is_demo', demoMode) // Filter by demo mode
    .order('created_at', { ascending: false })
  
  if (error) {
    console.error('Error fetching projects for dashboard stats:', error);
    // Fallback to empty data or re-throw if critical
    return {
      totalProjects: 0,
      activeProjects: 0,
      completedProjects: 0,
      discardedProjects: 0,
      totalInvested: 0,
    };
  }

  // Excloure DISCARDED dels stats (if decision column exists)
  const activeProjects = projects?.filter((p) => 
    p.status === 'active' && (!p.decision || p.decision !== 'DISCARDED')
  ).length || 0
  const completedProjects = projects?.filter((p) => 
    p.status === 'completed' && (!p.decision || p.decision !== 'DISCARDED')
  ).length || 0
  const totalProjects = projects?.filter((p) => 
    (!p.decision || p.decision !== 'DISCARDED')
  ).length || 0
  const discardedProjects = projects?.filter((p) => 
    p.decision === 'DISCARDED'
  ).length || 0

  // RLS maneja el filtrado por user_id automáticamente, pero afegim is_demo filter
  const { data: payments, error: paymentsError } = await supabase
    .from('payments')
    .select('amount, currency, type')
    .eq('user_id', userId)
    .eq('is_demo', demoMode) // Filter by demo mode
    .eq('status', 'completed')
  
  // Si hay error en payments, continuar con 0 (no crítico para stats)
  if (paymentsError) {
    console.error('Error fetching payments for dashboard stats:', paymentsError)
  }

  const totalInvested =
    (payments || [])?.reduce((sum, p) => {
      if (p.currency === 'EUR') return sum + (p.amount || 0)
      if (p.currency === 'USD') return sum + (p.amount || 0) * 0.92
      return sum
    }, 0) || 0

  return {
    totalProjects,
    activeProjects,
    completedProjects,
    discardedProjects,
    totalInvested,
  }
}

// ============================================
// GENERADORS DE CODIS
// ============================================

/**
 * Apply demo mode filter to a Supabase query
 * @param {object} query - Supabase query builder
 * @param {boolean} demoMode - Current demo mode state
 * @returns {object} Query with is_demo filter applied
 */
export const applyDemoFilter = async (query, demoMode = null) => {
  if (demoMode === null || demoMode === undefined) {
    // Get demo mode if not provided
    const { getDemoMode } = await import('./demoModeFilter')
    demoMode = await getDemoMode()
  }
  return query.eq('is_demo', demoMode)
}

export const generateProjectCode = async () => {
  // Get demo mode setting
  const { getDemoMode } = await import('./demoModeFilter')
  const demoMode = await getDemoMode()
  
  const userId = await getCurrentUserId()
  const year = new Date().getFullYear().toString().slice(-2)
  const prefix = `PR-FRDL${year}`

  // Retry up to 5 times if duplicate SKU error occurs
  let attempts = 0
  const maxAttempts = 5
  
  while (attempts < maxAttempts) {
    const { data, error } = await supabase
      .from('projects')
      .select('project_code, sku')
      .eq('user_id', userId)
      .eq('is_demo', demoMode) // Filter by demo mode
      .like('project_code', `${prefix}%`)
      .order('project_code', { ascending: false })
      .limit(1)

    if (error) throw error

    let nextNum = 1
    if (data && data.length > 0 && data[0].project_code) {
      const lastCode = data[0].project_code
      const numPart = lastCode.replace(`PR-FRDL${year}`, '')
      const lastNum = parseInt(numPart) || 0
      nextNum = lastNum + 1
    }

    const projectCode = `PR-FRDL${year}${nextNum.toString().padStart(4, '0')}`
    const sku = `FRDL${year}${nextNum.toString().padStart(4, '0')}`

    // Check if SKU already exists (scoped by user_id and is_demo)
    const { data: existingSku } = await supabase
      .from('projects')
      .select('id')
      .eq('user_id', userId)
      .eq('is_demo', demoMode)
      .eq('sku', sku)
      .maybeSingle()

    if (!existingSku) {
      // SKU is available, return it
      return { projectCode, sku }
    }

    // SKU exists, try next number
    attempts++
    if (attempts >= maxAttempts) {
      throw new Error('No s\'ha pogut generar un SKU únic després de múltiples intents')
    }
  }

  // Fallback (should not reach here)
  const projectCode = `PR-FRDL${year}${Date.now().toString().slice(-4)}`
  const sku = `FRDL${year}${Date.now().toString().slice(-4)}`
  return { projectCode, sku }
}

export const generatePONumber = async (projectSku) => {
  if (!projectSku) throw new Error('Falta el SKU del projecte per generar la PO')

  const prefix = `PO-${projectSku}`

  const { data } = await supabase
    .from('purchase_orders')
    .select('po_number')
    .like('po_number', `${prefix}%`)
    .order('po_number', { ascending: false })
    .limit(1)

  let nextNum = 1
  if (data && data.length > 0 && data[0].po_number) {
    const lastPO = data[0].po_number
    const parts = lastPO.split('-')
    const lastNum = parseInt(parts[parts.length - 1]) || 0
    nextNum = lastNum + 1
  }

  return `PO-${projectSku}-${nextNum.toString().padStart(2, '0')}`
}

export const getProjectSku = async (projectId) => {
  const { data, error } = await supabase
    .from('projects')
    .select('sku, project_code')
    .eq('id', projectId)
    .single()
  if (error) throw error
  return data?.sku || null
}

// ============================================
// SUPPLIER PRICE ESTIMATES
// ============================================

export const getSupplierPriceEstimates = async (projectId) => {
  // Demo mode: return mock data
  if (isDemoMode()) {
    const { mockGetSupplierPriceEstimates } = await import('../demo/demoMode')
    return await mockGetSupplierPriceEstimates(projectId)
  }
  
  const { data, error } = await supabase
    .from('supplier_price_estimates')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export const createSupplierPriceEstimate = async (projectId, estimate) => {
  // Eliminar user_id si ve del client (seguretat: sempre s'assigna automàticament)
  const { user_id, ...estimateData } = estimate
  const { data, error } = await supabase
    .from('supplier_price_estimates')
    .insert([{
      project_id: projectId,
      ...estimateData
    }])
    .select()
    .single()
  if (error) throw error
  return data
}

export const updateSupplierPriceEstimate = async (id, estimate) => {
  // Eliminar user_id si ve del client
  const { user_id, ...estimateData } = estimate
  const { data, error } = await supabase
    .from('supplier_price_estimates')
    .update({
      ...estimateData,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export const deleteSupplierPriceEstimate = async (id) => {
  const { error } = await supabase
    .from('supplier_price_estimates')
    .delete()
    .eq('id', id)
  if (error) throw error
  return true
}

// ============================================
// PRODUCT IDENTIFIERS (GTIN, ASIN, FNSKU)
// ============================================

export const getProductIdentifiers = async (projectId) => {
  // Demo mode: return mock data
  if (isDemoMode()) {
    const { mockGetProductIdentifiers } = await import('../demo/demoMode')
    return await mockGetProductIdentifiers(projectId)
  }
  
  const { data, error } = await supabase
    .from('product_identifiers')
    .select('*')
    .eq('project_id', projectId)
    .single()
  if (error && error.code !== 'PGRST116') throw error // PGRST116 = no rows found
  return data
}

export const upsertProductIdentifiers = async (projectId, identifiers) => {
  // Get demo mode setting
  const { getDemoMode } = await import('./demoModeFilter')
  const demoMode = await getDemoMode()
  
  // Eliminar user_id si ve del client (seguretat: sempre s'assigna automàticament)
  const { user_id, ...identifiersData } = identifiers
  const { data, error } = await supabase
    .from('product_identifiers')
    .upsert({
      project_id: projectId,
      ...identifiersData,
      is_demo: demoMode, // Mark with current demo mode
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'user_id,project_id'
    })
    .select()
    .single()
  if (error) throw error
  return data
}

// ============================================
// GTIN POOL
// ============================================

export const getGtinPool = async (status = null) => {
  // Get demo mode setting
  const { getDemoMode } = await import('./demoModeFilter')
  const demoMode = await getDemoMode()
  
  const userId = await getCurrentUserId()
  let query = supabase
    .from('gtin_pool')
    .select(`
      *,
      projects:assigned_to_project_id (
        id,
        name,
        sku_internal,
        project_code
      )
    `)
    .eq('user_id', userId)
    .eq('is_demo', demoMode) // Filter by demo mode
    .order('created_at', { ascending: false })
  
  if (status) {
    query = query.eq('status', status)
  }
  
  const { data, error } = await query
  if (error) throw error
  return data
}

export const getAvailableGtinCodes = async () => {
  // Get demo mode setting
  const { getDemoMode } = await import('./demoModeFilter')
  const demoMode = await getDemoMode()
  
  const userId = await getCurrentUserId()
  const { data, error } = await supabase
    .from('gtin_pool')
    .select('*')
    .eq('user_id', userId)
    .eq('is_demo', demoMode) // Filter by demo mode
    .eq('status', 'available')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export const assignGtinFromPool = async (gtinPoolId, projectId) => {
  // Primer obtenir el GTIN del pool
  const { data: gtinData, error: gtinError } = await supabase
    .from('gtin_pool')
    .select('*')
    .eq('id', gtinPoolId)
    .single()
  if (gtinError) throw gtinError
  
  if (gtinData.status !== 'available') {
    throw new Error('Aquest GTIN ja està assignat o arxivat')
  }
  
  // Actualitzar el pool a "assigned"
  const { error: updateError } = await supabase
    .from('gtin_pool')
    .update({
      status: 'assigned',
      assigned_to_project_id: projectId,
      assigned_at: new Date().toISOString()
    })
    .eq('id', gtinPoolId)
  if (updateError) throw updateError
  
  // Actualitzar o crear product_identifiers amb el GTIN
  const { data: existingIdentifiers } = await getProductIdentifiers(projectId)
  
  const identifiersData = {
    gtin_type: gtinData.gtin_type,
    gtin_code: gtinData.gtin_code,
    exemption_reason: gtinData.exemption_reason
  }
  
  if (existingIdentifiers) {
    // Actualitzar existent
    const { data, error } = await supabase
      .from('product_identifiers')
      .update({
        ...identifiersData,
        updated_at: new Date().toISOString()
      })
      .eq('id', existingIdentifiers.id)
      .select()
      .single()
    if (error) throw error
    return data
  } else {
    // Crear nou
    const { data, error } = await supabase
      .from('product_identifiers')
      .insert([{
        project_id: projectId,
        ...identifiersData
      }])
      .select()
      .single()
    if (error) throw error
    return data
  }
}

export const addGtinToPool = async (gtinData) => {
  // Get demo mode setting
  const { getDemoMode } = await import('./demoModeFilter')
  const demoMode = await getDemoMode()
  
  const userId = await getCurrentUserId()
  
  // Eliminar user_id si ve del client (seguretat: sempre s'assigna automàticament)
  const { user_id, ...poolData } = gtinData
  
  const { data, error } = await supabase
    .from('gtin_pool')
    .insert([{
      ...poolData,
      user_id: userId, // Always set user_id explicitly
      is_demo: demoMode // Mark with current demo mode
    }])
    .select()
    .single()
  if (error) throw error
  return data
}

export const releaseGtinFromProject = async (gtinPoolId) => {
  const userId = await getCurrentUserId()
  
  // Obtenir el GTIN
  const { data: gtinData, error: gtinError } = await supabase
    .from('gtin_pool')
    .select('assigned_to_project_id')
    .eq('id', gtinPoolId)
    .eq('user_id', userId)
    .single()
  if (gtinError) throw gtinError
  
  if (!gtinData.assigned_to_project_id) {
    throw new Error('Aquest GTIN no està assignat a cap projecte')
  }
  
  // Alliberar el GTIN
  const { error: updateError } = await supabase
    .from('gtin_pool')
    .update({
      status: 'available',
      assigned_to_project_id: null,
      assigned_at: null
    })
    .eq('id', gtinPoolId)
    .eq('user_id', userId)
  if (updateError) throw updateError
  
  // Opcional: Netejar product_identifiers (o deixar-lo per històric)
  // Per ara el deixem per no perdre informació
  
  return true
}

export const getUnassignedGtinCodes = async () => {
  // Get demo mode setting
  const { getDemoMode } = await import('./demoModeFilter')
  const demoMode = await getDemoMode()
  
  // Legacy demo mode check (for backward compatibility)
  if (isDemoMode() && !demoMode) {
    return await mockGetUnassignedGtinCodes()
  }
  
  const userId = await getCurrentUserId()
  const { data, error } = await supabase
    .from('gtin_pool')
    .select('*')
    .eq('user_id', userId)
    .eq('is_demo', demoMode) // Filter by demo mode
    .eq('status', 'available')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export const getProjectsMissingGtin = async () => {
  // Get demo mode setting
  const { getDemoMode } = await import('./demoModeFilter')
  const demoMode = await getDemoMode()
  
  // Legacy demo mode check (for backward compatibility)
  if (isDemoMode() && !demoMode) {
    return await mockGetProjectsMissingGtin()
  }
  
  // Projectes actius que no tenen GTIN assignat (ni GTIN_EXEMPT)
  // Excloure DISCARDED
  const userId = await getCurrentUserId()
  // Use select('*') to avoid issues if decision column doesn't exist
  const { data: projects, error: projectsError } = await supabase
    .from('projects')
    .select('*')
    .eq('status', 'active')
    .eq('user_id', userId)
    .eq('is_demo', demoMode) // Filter by demo mode
  
  if (projectsError) throw projectsError
  
  // Filter DISCARDED client-side to avoid query issues (handle if decision column doesn't exist)
  const filteredProjects = (projects || []).filter(p => !p.decision || p.decision !== 'DISCARDED')
  
  const { data: identifiers, error: identifiersError } = await supabase
    .from('product_identifiers')
    .select('project_id, gtin_type, gtin_code')
    .eq('user_id', userId)
    .eq('is_demo', demoMode) // Filter by demo mode
  if (identifiersError) throw identifiersError
  
  const projectsWithIdentifiers = new Set(identifiers.map(i => i.project_id))
  const missingGtin = filteredProjects.filter(p => 
    !projectsWithIdentifiers.has(p.id) || 
    identifiers.find(i => i.project_id === p.id && !i.gtin_code && i.gtin_type !== 'GTIN_EXEMPT')
  )
  
  return missingGtin
}

export const getProgrammaticallyAssignedGTIN = async () => {
  // Get demo mode setting
  const { getDemoMode } = await import('./demoModeFilter')
  const demoMode = await getDemoMode()
  
  // Retorna els GTIN assignats programàticament des del pool
  // (aquells que tenen assigned_to_project_id a gtin_pool)
  const userId = await getCurrentUserId()
  
  const { data: assignedGtins, error: poolError } = await supabase
    .from('gtin_pool')
    .select(`
      id,
      gtin_code,
      gtin_type,
      status,
      assigned_to_project_id,
      created_at,
      updated_at,
      projects:assigned_to_project_id (
        id,
        name,
        sku,
        project_code
      )
    `)
    .eq('user_id', userId)
    .eq('is_demo', demoMode) // Filter by demo mode
    .eq('status', 'assigned')
    .not('assigned_to_project_id', 'is', null)
    .order('updated_at', { ascending: false })
  
  if (poolError) throw poolError
  
  // També obtenim els identifiers per obtenir informació completa
  const projectIds = assignedGtins
    ?.map(g => g.assigned_to_project_id)
    .filter(Boolean) || []
  
  let identifiersMap = {}
  if (projectIds.length > 0) {
    const { data: identifiers, error: identifiersError } = await supabase
      .from('product_identifiers')
      .select('project_id, gtin_code, gtin_type, asin, fnsku')
      .in('project_id', projectIds)
      .eq('user_id', userId)
    
    if (identifiersError) throw identifiersError
    
    identifiers?.forEach(id => {
      identifiersMap[id.project_id] = id
    })
  }
  
  // Combinem la informació del pool amb els identifiers
  return (assignedGtins || []).map(gtin => ({
    gtin_pool_id: gtin.id,
    gtin_code: gtin.gtin_code,
    gtin_type: gtin.gtin_type,
    status: gtin.status,
    assigned_to_project_id: gtin.assigned_to_project_id,
    assigned_at: gtin.updated_at,
    project: gtin.projects,
    identifiers: identifiersMap[gtin.assigned_to_project_id] || null
  }))
}

// ============================================
// AMAZON READINESS (PO)
// ============================================

export const getPoAmazonReadiness = async (purchaseOrderId) => {
  const userId = await getCurrentUserId()
  const { data, error } = await supabase
    .from('po_amazon_readiness')
    .select('*')
    .eq('purchase_order_id', purchaseOrderId)
    .eq('user_id', userId)
    .single()
  if (error && error.code !== 'PGRST116') throw error // PGRST116 = no rows found
  return data
}

export const upsertPoAmazonReadiness = async (purchaseOrderId, projectId, readinessData) => {
  // Eliminar user_id si ve del client (seguretat: sempre s'assigna automàticament)
  const { user_id, ...data } = readinessData
  const userId = await getCurrentUserId()
  
  const { data: result, error } = await supabase
    .from('po_amazon_readiness')
    .upsert({
      purchase_order_id: purchaseOrderId,
      project_id: projectId,
      user_id: userId, // Always set user_id explicitly
      ...data,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'user_id,purchase_order_id'
    })
    .select()
    .single()
  if (error) throw error
  return result
}

export const updatePoAmazonReadinessLabels = async (purchaseOrderId, labelsData) => {
  const userId = await getCurrentUserId()
  const { data, error } = await supabase
    .from('po_amazon_readiness')
    .update({
      labels_generated_at: new Date().toISOString(),
      labels_qty: labelsData.quantity,
      labels_template: labelsData.template,
      updated_at: new Date().toISOString()
    })
    .eq('purchase_order_id', purchaseOrderId)
    .eq('user_id', userId)
    .select()
    .single()
  if (error) throw error
  return data
}

export const updateManufacturerPackGenerated = async (purchaseOrderId, version) => {
  const userId = await getCurrentUserId()
  
  // Buscar o crear readiness record
  const existing = await getPoAmazonReadiness(purchaseOrderId)
  let projectId = null
  
  if (!existing) {
    // Necessitem project_id per crear el registre
    // Get demo mode setting
    const { getDemoMode } = await import('./demoModeFilter')
    const demoMode = await getDemoMode()
    
    const { data: poData } = await supabase
      .from('purchase_orders')
      .select('project_id')
      .eq('id', purchaseOrderId)
      .eq('user_id', userId)
      .eq('is_demo', demoMode) // Filter by demo mode
      .single()
    if (poData) projectId = poData.project_id
  } else {
    projectId = existing.project_id
  }
  
  if (!projectId) {
    throw new Error('PO must have a project_id to track manufacturer pack')
  }
  
  const { data, error } = await supabase
    .from('po_amazon_readiness')
    .upsert({
      purchase_order_id: purchaseOrderId,
      project_id: projectId,
      user_id: userId, // Always set user_id explicitly
      manufacturer_pack_version: version,
      manufacturer_pack_generated_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'user_id,purchase_order_id',
      ignoreDuplicates: false
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export const markManufacturerPackAsSent = async (purchaseOrderId) => {
  const userId = await getCurrentUserId()
  const { data, error } = await supabase
    .from('po_amazon_readiness')
    .update({
      manufacturer_pack_sent_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('purchase_order_id', purchaseOrderId)
    .eq('user_id', userId)
    .select()
    .single()
  if (error) throw error
  return data
}

export const getPosWaitingManufacturer = async (limit = 10) => {
  // Get demo mode setting
  const { getDemoMode } = await import('./demoModeFilter')
  const demoMode = await getDemoMode()
  
  // Legacy demo mode check (for backward compatibility)
  if (isDemoMode() && !demoMode) {
    return await mockGetPosWaitingManufacturer(limit)
  }
  
  const userId = await getCurrentUserId()
  
  const { data, error } = await supabase
    .from('po_amazon_readiness')
    .select(`
      *,
      purchase_orders!inner (
        id,
        po_number,
        status,
        order_date,
        project_id,
        is_demo,
        projects (
          id,
          name,
          sku,
          sku_internal
        ),
        suppliers (
          id,
          name
        )
      )
    `)
    .eq('user_id', userId)
    .eq('purchase_orders.is_demo', demoMode) // Filter by demo mode on joined table
    .not('manufacturer_pack_generated_at', 'is', null)
    .is('manufacturer_pack_sent_at', null)
    .order('manufacturer_pack_generated_at', { ascending: true })
    .limit(limit)
  
  if (error) throw error
  
  return (data || []).map(r => ({
    ...r.purchase_orders,
    readiness: r,
    packGeneratedAt: r.manufacturer_pack_generated_at,
    packVersion: r.manufacturer_pack_version || 1
  })).filter(po => po.id) // Filtrar nulls
}

export const getPosNotReady = async (limit = 10) => {
  // Demo mode: return mock data
  if (isDemoMode()) {
    return await mockGetPosNotReady(limit)
  }
  
  const userId = await getCurrentUserId()
  
  // Obtenir totes les POs amb readiness
  const { data: readinessData, error: readinessError } = await supabase
    .from('po_amazon_readiness')
    .select(`
      *,
      purchase_orders (
        id,
        po_number,
        status,
        project_id,
        projects (
          id,
          name,
          sku,
          sku_internal
        )
      )
    `)
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(limit * 3) // Obtenir més per filtrar després
  
  if (readinessError) throw readinessError
  
  if (!readinessData || readinessData.length === 0) return []
  
  // Obtenir identifiers per cada projecte
  const projectIds = [...new Set(readinessData.map(r => r.project_id))]
  const { data: identifiersData, error: identifiersError } = await supabase
    .from('product_identifiers')
    .select('project_id, fnsku')
    .in('project_id', projectIds)
    .eq('user_id', userId)
  
  if (identifiersError) throw identifiersError
  
  // Crear map de identifiers per project_id
  const identifiersMap = {}
  identifiersData?.forEach(id => {
    identifiersMap[id.project_id] = id
  })
  
  // Calcular readiness per cada PO
  const { computePoAmazonReady } = await import('./amazonReady')
  const notReady = []
  for (const readiness of readinessData) {
    if (!readiness.purchase_orders) continue
    const identifiers = identifiersMap[readiness.project_id]
    const { ready, missing } = computePoAmazonReady({
      po: readiness.purchase_orders,
      identifiers,
      readiness
    })
    
    if (!ready && readiness.purchase_orders) {
      notReady.push({
        ...readiness.purchase_orders,
        project: readiness.purchase_orders.projects,
        readiness,
        missingCount: missing.length,
        missing: missing.slice(0, 2) // Top 2 missing fields
      })
    }
    
    if (notReady.length >= limit) break
  }
  
  return notReady
}

// DAILY OPS WIDGETS
export const getShipmentsInTransit = async (limit = 10) => {
  // Get demo mode setting
  const { getDemoMode } = await import('./demoModeFilter')
  const demoMode = await getDemoMode()
  
  // Demo mode: return mock data
  if (demoMode) {
    return await mockGetShipmentsInTransit(limit)
  }
  
  const userId = await getCurrentUserId()
  
  try {
    // Verificar si existeix la taula po_shipments
    const { data, error } = await supabase
      .from('po_shipments')
      .select(`
        id,
        carrier,
        eta_date,
        status,
        tracking_number,
        pro_number,
        updated_at,
        purchase_orders!inner (
          id,
          po_number,
          is_demo,
          projects (
            id,
            name,
            sku_internal
          )
        )
      `)
      .eq('user_id', userId)
      .eq('purchase_orders.is_demo', false) // Filter by demo mode
      .in('status', ['picked_up', 'in_transit'])
      .order('eta_date', { ascending: true })
      .limit(limit)
    
    if (error) {
      // Si la taula no existeix, retornar array buit
      if (error.code === '42P01') return []
      throw error
    }
    
    return (data || []).map(shipment => ({
      id: shipment.id,
      po_number: shipment.purchase_orders?.po_number,
      carrier: shipment.carrier,
      eta_date: shipment.eta_date,
      tracking_number: shipment.tracking_number,
      pro_number: shipment.pro_number,
      project: shipment.purchase_orders?.projects
    }))
  } catch (err) {
    // Si hi ha error (taula no existeix), retornar array buit
    if (err.code === '42P01') return []
    throw err
  }
}

export const getResearchNoDecision = async (limit = 10) => {
  // Demo mode: return mock data
  if (isDemoMode()) {
    return await mockGetResearchNoDecision(limit)
  }
  
  const userId = await getCurrentUserId()
  
  try {
    // Use select('*') to avoid issues if decision column doesn't exist
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', userId)
      .eq('current_phase', 1)
      .order('created_at', { ascending: false })
      .limit(limit * 2) // Get more to filter after
    
    if (error) throw error
    
    // Filter client-side: no decision or HOLD (handle if decision column doesn't exist)
    return (data || []).filter(p => !p.decision || p.decision === 'HOLD').slice(0, limit)
  } catch (err) {
    console.error('Error in getResearchNoDecision:', err)
    return []
  }
}

export const getStaleTracking = async (limit = 10, staleDays = 7) => {
  // Demo mode: return mock data
  if (isDemoMode()) {
    return await mockGetStaleTracking(limit, staleDays)
  }
  
  const userId = await getCurrentUserId()
  
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - staleDays)
  
  const { data, error } = await supabase
    .from('purchase_orders')
    .select(`
      id,
      po_number,
      tracking_number,
      updated_at,
      projects (
        id,
        name,
        sku_internal
      )
    `)
    .eq('user_id', userId)
    .not('tracking_number', 'is', null)
    .lt('updated_at', cutoffDate.toISOString())
    .order('updated_at', { ascending: true })
    .limit(limit)
  
  if (error) throw error
  
  return (data || []).map(po => {
    const daysStale = Math.floor((new Date() - new Date(po.updated_at)) / (1000 * 60 * 60 * 24))
    return {
      ...po,
      daysStale
    }
  })
}

// SHIPMENT TRACKING
export const getPoShipment = async (poId) => {
  const userId = await getCurrentUserId()
  
  const { data, error } = await supabase
    .from('po_shipments')
    .select('*')
    .eq('user_id', userId)
    .eq('purchase_order_id', poId)
    .single()
  
  if (error && error.code !== 'PGRST116') throw error
  return data
}

export const upsertPoShipment = async (poId, payload) => {
  const userId = await getCurrentUserId()
  
  // Strip user_id si ve en payload
  const { user_id, ...cleanPayload } = payload
  
  // Verificar si existeix
  const existing = await getPoShipment(poId)
  
  const shipmentData = {
    ...cleanPayload,
    purchase_order_id: poId,
    user_id: userId
  }
  
  if (existing) {
    const { data, error } = await supabase
      .from('po_shipments')
      .update(shipmentData)
      .eq('id', existing.id)
      .eq('user_id', userId)
      .select()
      .single()
    
    if (error) throw error
    return data
  }
  
  const { data, error } = await supabase
    .from('po_shipments')
    .insert([shipmentData])
    .select()
    .single()
  
  if (error) throw error
  return data
}

export const setShipmentStatus = async (poId, status) => {
  const userId = await getCurrentUserId()
  
  const validStatuses = ['planned', 'booked', 'picked_up', 'in_transit', 'delivered']
  if (!validStatuses.includes(status)) {
    throw new Error(`Invalid status: ${status}`)
  }
  
  const existing = await getPoShipment(poId)
  
  if (!existing) {
    // Crear shipment amb status si no existeix
    return await upsertPoShipment(poId, { status })
  }
  
  const { data, error } = await supabase
    .from('po_shipments')
    .update({ status })
    .eq('id', existing.id)
    .eq('user_id', userId)
    .select()
    .single()
  
  if (error) throw error
  return data
}

// MAGATZEMS
export const getWarehouses = async () => {
  // Get demo mode setting
  const { getDemoMode } = await import('./demoModeFilter')
  const demoMode = await getDemoMode()
  
  // Avoid relationship ambiguity - fetch warehouses without embedded supplier
  // If supplier info is needed, it can be fetched separately using supplier_id
  const userId = await getCurrentUserId()
  const { data, error } = await supabase
    .from('warehouses')
    .select('*')
    .eq('user_id', userId)
    .eq('is_demo', demoMode) // Filter by demo mode
    .order('name', { ascending: true })
  if (error) throw error
  return data
}

export const getWarehouse = async (id) => {
  const { data, error } = await supabase
    .from('warehouses')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export const createWarehouse = async (warehouse) => {
  // Eliminar user_id si ve del client (seguretat: sempre s'assigna automàticament)
  const { user_id, ...warehouseData } = warehouse
  const { data, error } = await supabase
    .from('warehouses')
    .insert([warehouseData])
    .select()
    .single()
  if (error) throw error
  return data
}

export const updateWarehouse = async (id, updates) => {
  // Eliminar user_id si ve del client (no es pot canviar)
  const { user_id, ...updateData } = updates
  const { data, error } = await supabase
    .from('warehouses')
    .update({ ...updateData, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export const deleteWarehouse = async (id) => {
  const { error } = await supabase.from('warehouses').delete().eq('id', id)
  if (error) throw error
  return true
}

// CONFIGURACIÓ EMPRESA
export const getCompanySettings = async () => {
  const userId = await getCurrentUserId()
  const { data, error } = await supabase
    .from('company_settings')
    .select('*')
    .eq('user_id', userId)
    .limit(1)
    .single()
  if (error && error.code !== 'PGRST116') throw error
  return data
}

export const updateCompanySettings = async (settings) => {
  // Eliminar user_id si ve del client (seguretat: sempre s'assigna automàticament)
  const { user_id, ...settingsData } = settings
  const userId = await getCurrentUserId()
  const existing = await getCompanySettings()

  if (existing) {
    const { data, error } = await supabase
      .from('company_settings')
      .update({ ...settingsData, updated_at: new Date().toISOString() })
      .eq('id', existing.id)
      .eq('user_id', userId)
      .select()
      .single()
    if (error) throw error
    return data
  }

  const { data, error } = await supabase
    .from('company_settings')
    .insert([{ ...settingsData, user_id: userId }])
    .select()
    .single()
  if (error) throw error
  return data
}

// Language settings
export const updateLanguage = async (language) => {
  const userId = await getCurrentUserId()
  
  // Guardar a localStorage immediatament
  localStorage.setItem('freedolia_language', language)
  
  // Guardar a company_settings
  try {
    const existing = await getCompanySettings()
    await updateCompanySettings({
      ...existing,
      language
    })
  } catch (err) {
    console.warn('Error guardant idioma a company_settings:', err)
    // Continuar igual, ja està a localStorage
  }
  
  return language
}

// DASHBOARD PREFERENCES
export const getDashboardPreferences = async () => {
  const userId = await getCurrentUserId()
  const { data, error } = await supabase
    .from('dashboard_preferences')
    .select('*')
    .eq('user_id', userId)
    .limit(1)
    .single()
  if (error && error.code !== 'PGRST116') throw error
  return data
}

// Get actionable alerts based on thresholds
export const getAlerts = async (thresholds = {}) => {
  const userId = await getCurrentUserId()
  const alerts = []
  
  const {
    manufacturerPackDays = 3,
    researchDays = 7
  } = thresholds
  
  // 1. Manufacturer Pack alerts: generated_at > X days and not sent
  try {
    const { data: packs, error } = await supabase
      .from('po_amazon_readiness')
      .select(`
        id,
        purchase_order_id,
        manufacturer_pack_generated_at,
        manufacturer_pack_sent_at,
        purchase_orders (
          id,
          po_number,
          projects (
            id,
            name,
            sku_internal
          )
        )
      `)
      .eq('user_id', userId)
      .not('manufacturer_pack_generated_at', 'is', null)
      .is('manufacturer_pack_sent_at', null)
    
    if (!error && packs) {
      const now = new Date()
      packs.forEach(pack => {
        if (pack.manufacturer_pack_generated_at && pack.purchase_orders) {
          const generatedDate = new Date(pack.manufacturer_pack_generated_at)
          const daysSince = Math.floor((now - generatedDate) / (1000 * 60 * 60 * 24))
          
          if (daysSince > manufacturerPackDays) {
            alerts.push({
              type: 'manufacturer_pack',
              severity: daysSince > manufacturerPackDays * 2 ? 'high' : 'medium',
              message: `Pack generat fa ${daysSince} dies`,
              entityType: 'purchase_order',
              entityId: pack.purchase_order_id,
              poNumber: pack.purchase_orders.po_number,
              projectName: pack.purchase_orders.projects?.name,
              daysSince
            })
          }
        }
      })
    }
  } catch (err) {
    console.error('Error getting manufacturer pack alerts:', err)
  }
  
  // 2. Shipment alerts: eta_date < today and status != delivered
  try {
    const { data: shipments, error } = await supabase
      .from('po_shipments')
      .select(`
        id,
        purchase_order_id,
        eta_date,
        status,
        carrier,
        purchase_orders (
          id,
          po_number,
          projects (
            id,
            name
          )
        )
      `)
      .eq('user_id', userId)
      .not('eta_date', 'is', null)
      .neq('status', 'delivered')
    
    if (!error && shipments) {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      shipments.forEach(shipment => {
        if (shipment.eta_date && shipment.purchase_orders) {
          const etaDate = new Date(shipment.eta_date)
          etaDate.setHours(0, 0, 0, 0)
          
          if (etaDate < today) {
            const daysOverdue = Math.floor((today - etaDate) / (1000 * 60 * 60 * 24))
            alerts.push({
              type: 'shipment',
              severity: 'high',
              message: `Enviament amb ETA passat (${daysOverdue} dies)`,
              entityType: 'purchase_order',
              entityId: shipment.purchase_order_id,
              poNumber: shipment.purchase_orders.po_number,
              projectName: shipment.purchase_orders.projects?.name,
              carrier: shipment.carrier,
              etaDate: shipment.eta_date,
              daysOverdue
            })
          }
        }
      })
    }
  } catch (err) {
    // Table might not exist
    if (err.code !== '42P01') {
      console.error('Error getting shipment alerts:', err)
    }
  }
  
  // 3. Research alerts: phase = Research and no decision > X days
  try {
    const { data: projects, error } = await supabase
      .from('projects')
      .select('id, name, sku_internal, current_phase, decision, created_at')
      .eq('user_id', userId)
      .eq('current_phase', 1)
      .or('decision.is.null,decision.eq.HOLD')
      .order('created_at', { ascending: true })
    
    if (!error && projects) {
      const now = new Date()
      projects.forEach(project => {
        const createdDate = new Date(project.created_at)
        const daysSince = Math.floor((now - createdDate) / (1000 * 60 * 60 * 24))
        
        if (daysSince > researchDays) {
          alerts.push({
            type: 'research',
            severity: daysSince > researchDays * 2 ? 'high' : 'medium',
            message: `Recerca sense decisió fa ${daysSince} dies`,
            entityType: 'project',
            entityId: project.id,
            projectName: project.name,
            sku: project.sku_internal,
            daysSince
          })
        }
      })
    }
  } catch (err) {
    console.error('Error getting research alerts:', err)
  }
  
  return alerts.sort((a, b) => {
    // Sort by severity (high first) then by days
    const severityOrder = { high: 3, medium: 2, low: 1 }
    if (severityOrder[a.severity] !== severityOrder[b.severity]) {
      return severityOrder[b.severity] - severityOrder[a.severity]
    }
    return (b.daysSince || b.daysOverdue || 0) - (a.daysSince || a.daysOverdue || 0)
  })
}

export const updateDashboardPreferences = async (preferences) => {
  const { user_id, ...prefsData } = preferences
  const userId = await getCurrentUserId()
  const existing = await getDashboardPreferences()

  // Widgets default si no existeix configuració
  const defaultWidgets = {
    logistics_tracking: true,
    finance_chart: true,
    orders_in_progress: true,
    pos_not_ready: true,
    waiting_manufacturer: true,
    activity_feed: false,
    // Daily Ops widgets
    waiting_manufacturer_ops: true,
    pos_not_amazon_ready: true,
    shipments_in_transit: true,
    research_no_decision: true,
    stale_tracking: true
  }

  // Default widget order
  const defaultWidgetOrder = [
    'waiting_manufacturer_ops',
    'pos_not_amazon_ready',
    'shipments_in_transit',
    'research_no_decision',
    'stale_tracking'
  ]

  // Fusiona widgets nous amb els existents per preservar tots els widgets
  let widgetsToSave = defaultWidgets
  if (existing?.widgets) {
    widgetsToSave = { ...defaultWidgets, ...existing.widgets }
  }
  if (prefsData.widgets) {
    widgetsToSave = { ...widgetsToSave, ...prefsData.widgets }
  }

  // Manejar enabledWidgets (si ve en prefsData)
  let enabledWidgets = existing?.enabledWidgets || {}
  if (prefsData.enabledWidgets) {
    enabledWidgets = { ...enabledWidgets, ...prefsData.enabledWidgets }
  }

  // Manejar widgetOrder (si ve en prefsData)
  let widgetOrder = existing?.widgetOrder || defaultWidgetOrder
  if (prefsData.widgetOrder) {
    widgetOrder = prefsData.widgetOrder
  }

  // Manejar staleDays (si ve en prefsData)
  let staleDays = existing?.staleDays || 7
  if (prefsData.staleDays !== undefined) {
    staleDays = prefsData.staleDays
  }

  // Manejar alertThresholds (si ve en prefsData)
  let alertThresholds = existing?.alert_thresholds || {
    manufacturerPackDays: 3,
    researchDays: 7
  }
  if (prefsData.alertThresholds) {
    alertThresholds = { ...alertThresholds, ...prefsData.alertThresholds }
  }

  // Manejar layout (si ve en prefsData)
  let layout = existing?.layout || null
  if (prefsData.layout) {
    layout = prefsData.layout
  }

  // Preparar dades per guardar
  const dataToSave = {
    widgets: widgetsToSave,
    enabledWidgets,
    widgetOrder,
    staleDays,
    alert_thresholds: alertThresholds,
    layout
  }

  if (existing) {
    const { data, error } = await supabase
      .from('dashboard_preferences')
      .update({ 
        ...dataToSave,
        updated_at: new Date().toISOString() 
      })
      .eq('id', existing.id)
      .eq('user_id', userId)
      .select()
      .single()
    if (error) throw error
    return data
  }

  const { data, error } = await supabase
    .from('dashboard_preferences')
    .insert([{
      ...dataToSave,
      user_id: userId
    }])
    .select()
    .single()
  if (error) throw error
  return data
}

// AUDIT LOG
export const getAuditLogs = async (limit = 50, statusFilter = null) => {
  let query = supabase
    .from('audit_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (statusFilter) {
    query = query.eq('status', statusFilter)
  }

  const { data, error } = await query
  if (error) throw error
  return data || []
}

// ============================================
// PROFITABILITY CALCULATOR
// ============================================

export const getProjectProfitability = async (projectId) => {
  // Demo mode: return mock data
  if (isDemoMode()) {
    const { mockGetProjectProfitability } = await import('../demo/demoMode')
    return await mockGetProjectProfitability(projectId)
  }
  
  const userId = await getCurrentUserId()
  const { data, error } = await supabase
    .from('project_profitability_basic')
    .select('*')
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .single()
  if (error && error.code !== 'PGRST116') throw error // PGRST116 = no rows found
  return data
}

export const upsertProjectProfitability = async (projectId, profitabilityData) => {
  // Eliminar user_id si ve del client (seguretat: sempre s'assigna automàticament)
  const { user_id, ...data } = profitabilityData
  const userId = await getCurrentUserId()
  
  // Assegurar que tots els camps numèrics estan definits amb defaults
  const profitabilityRecord = {
    project_id: projectId,
    selling_price: data.selling_price ?? 0,
    cogs: data.cogs ?? 0,
    shipping_per_unit: data.shipping_per_unit ?? 0,
    referral_fee_percent: data.referral_fee_percent ?? 15,
    fba_fee_per_unit: data.fba_fee_per_unit ?? 0,
    ppc_per_unit: data.ppc_per_unit ?? 0,
    other_costs_per_unit: data.other_costs_per_unit ?? 0,
    fixed_costs: data.fixed_costs ?? 0,
    updated_at: new Date().toISOString()
  }
  
  const { data: result, error } = await supabase
    .from('project_profitability_basic')
    .upsert(profitabilityRecord, {
      onConflict: 'user_id,project_id'
    })
    .select()
    .single()
  if (error) throw error
  return result
}

// TASKS
export const getTasks = async (filters = {}) => {
  // Get demo mode setting
  const { getDemoMode } = await import('./demoModeFilter')
  const demoMode = await getDemoMode()
  
  // Legacy demo mode check (for backward compatibility)
  if (isDemoMode() && !demoMode) {
    const tasks = await mockGetTasks(filters.entityId || filters.projectId || null)
    // Apply filters client-side
    let filtered = tasks
    if (filters.status) {
      filtered = filtered.filter(t => t.status === filters.status)
    }
    if (filters.entityType) {
      filtered = filtered.filter(t => t.entity_type === filters.entityType)
    }
    if (filters.entityId) {
      filtered = filtered.filter(t => t.entity_id === filters.entityId)
    }
    return filtered
  }
  
  const userId = await getCurrentUserId()
  let query = supabase
    .from('tasks')
    .select('*')
    .eq('user_id', userId)
    .eq('is_demo', demoMode) // Filter by demo mode
    .order('due_date', { ascending: true, nullsLast: true })
    .order('created_at', { ascending: false })
  
  if (filters.status) {
    query = query.eq('status', filters.status)
  }
  if (filters.entityType) {
    query = query.eq('entity_type', filters.entityType)
  }
  if (filters.entityId) {
    query = query.eq('entity_id', filters.entityId)
  }
  
  const { data, error } = await query
  if (error) throw error
  return data || []
}

export const getOpenTasks = async (limit = 10) => {
  // Get demo mode setting
  const { getDemoMode } = await import('./demoModeFilter')
  const demoMode = await getDemoMode()
  
  const userId = await getCurrentUserId()
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', userId)
    .eq('is_demo', demoMode) // Filter by demo mode
    .eq('status', 'open')
    .order('due_date', { ascending: true, nullsLast: true })
    .order('priority', { ascending: false })
    .limit(limit)
  
  if (error) throw error
  return data || []
}

export const createTask = async (task) => {
  // Get demo mode setting
  const { getDemoMode } = await import('./demoModeFilter')
  const demoMode = await getDemoMode()
  
  const { user_id, ...taskData } = task
  const userId = await getCurrentUserId()
  
  const { data, error } = await supabase
    .from('tasks')
    .insert([{
      ...taskData,
      user_id: userId,
      is_demo: demoMode // Mark with current demo mode
    }])
    .select()
    .single()
  
  if (error) throw error
  return data
}

export const updateTask = async (id, updates) => {
  const userId = await getCurrentUserId()
  const { user_id, ...updateData } = updates
  
  const { data, error } = await supabase
    .from('tasks')
    .update(updateData)
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single()
  
  if (error) throw error
  return data
}

export const deleteTask = async (id) => {
  const userId = await getCurrentUserId()
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)
  
  if (error) throw error
}

export const markTaskDone = async (id) => {
  return await updateTask(id, { status: 'done' })
}

export const snoozeTask = async (id, days = 3) => {
  const userId = await getCurrentUserId()
  const { data: task } = await supabase
    .from('tasks')
    .select('due_date')
    .eq('id', id)
    .eq('user_id', userId)
    .single()
  
  if (!task) throw new Error('Task not found')
  
  const newDueDate = task.due_date 
    ? new Date(new Date(task.due_date).getTime() + days * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    : new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  
  return await updateTask(id, { 
    status: 'open',
    due_date: newDueDate 
  })
}

// Bulk actions for tasks
export const bulkMarkTasksDone = async (taskIds) => {
  const userId = await getCurrentUserId()
  const { data, error } = await supabase
    .from('tasks')
    .update({ status: 'done', updated_at: new Date().toISOString() })
    .in('id', taskIds)
    .eq('user_id', userId)
    .select()
  
  if (error) throw error
  return data
}

export const bulkSnoozeTasks = async (taskIds, days = 3) => {
  const userId = await getCurrentUserId()
  
  // Get current due dates
  const { data: tasks, error: fetchError } = await supabase
    .from('tasks')
    .select('id, due_date')
    .in('id', taskIds)
    .eq('user_id', userId)
  
  if (fetchError) throw fetchError
  
  // Calculate new due dates
  const updates = tasks.map(task => {
    const newDueDate = task.due_date 
      ? new Date(new Date(task.due_date).getTime() + days * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      : new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    
    return {
      id: task.id,
      due_date: newDueDate,
      status: 'open',
      updated_at: new Date().toISOString()
    }
  })
  
  // Update in batch
  const { data, error } = await supabase
    .from('tasks')
    .upsert(updates, { onConflict: 'id' })
    .select()
  
  if (error) throw error
  return data
}

// Bulk actions for purchase orders
export const bulkMarkPacksAsSent = async (poIds) => {
  const userId = await getCurrentUserId()
  
  // Get readiness records
  const { data: readinessRecords, error: fetchError } = await supabase
    .from('po_amazon_readiness')
    .select('id')
    .in('purchase_order_id', poIds)
    .eq('user_id', userId)
    .is('manufacturer_pack_sent_at', null)
    .not('manufacturer_pack_generated_at', 'is', null)
  
  if (fetchError) throw fetchError
  
  if (readinessRecords.length === 0) {
    return []
  }
  
  const readinessIds = readinessRecords.map(r => r.id)
  
  const { data, error } = await supabase
    .from('po_amazon_readiness')
    .update({
      manufacturer_pack_sent_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .in('id', readinessIds)
    .eq('user_id', userId)
    .select()
  
  if (error) throw error
  return data
}

export const bulkMarkShipmentsDelivered = async (poIds) => {
  const userId = await getCurrentUserId()
  
  // Check if po_shipments table exists and get shipments
  try {
    const { data: shipments, error: fetchError } = await supabase
      .from('po_shipments')
      .select('id, purchase_order_id')
      .in('purchase_order_id', poIds)
      .eq('user_id', userId)
      .in('status', ['picked_up', 'in_transit'])
    
    if (fetchError) {
      // Table might not exist
      if (fetchError.code === '42P01') {
        return []
      }
      throw fetchError
    }
    
    if (shipments.length === 0) {
      return []
    }
    
    const shipmentIds = shipments.map(s => s.id)
    
    const { data, error } = await supabase
      .from('po_shipments')
      .update({
        status: 'delivered',
        updated_at: new Date().toISOString()
      })
      .in('id', shipmentIds)
      .eq('user_id', userId)
      .select()
    
    if (error) throw error
    return data
  } catch (err) {
    // If table doesn't exist, return empty array
    if (err.code === '42P01') {
      return []
    }
    throw err
  }
}

// SUPPLIER QUOTES
// Get all calendar events (tasks, shipments, manufacturer packs, quotes)
export const getCalendarEvents = async (filters = {}) => {
  // Get demo mode setting
  const { getDemoMode } = await import('./demoModeFilter')
  const demoMode = await getDemoMode()
  
  // STRICT: Only return demo events if demoMode is explicitly true
  // No fallback, no mock data when demoMode is false
  if (demoMode === true) {
    // Only use mock events if demoMode is explicitly true
    const { mockGetCalendarEvents } = await import('../demo/demoMode')
    return await mockGetCalendarEvents(filters)
  }
  
  // When demoMode is false, only return real events from database
  const userId = await getCurrentUserId()
  const events = []
  
  try {
    // 1) Tasks
    if (filters.types?.includes('task') !== false) {
      const taskFilters = { ...filters }
      if (!filters.showCompleted) {
        taskFilters.status = 'open'
      }
      const tasks = await getTasks(taskFilters)
      if (tasks) {
        tasks.forEach(task => {
          // Filter out sticky-derived tasks if showStickyDerived is false
          if (filters.showStickyDerived === false && task.source === 'sticky_note') {
            return
          }
          
          if (task.due_date) {
            events.push({
              id: `task-${task.id}`,
              title: task.title,
              start: new Date(task.due_date),
              end: new Date(task.due_date),
              type: 'task',
              entity_type: task.entity_type,
              entity_id: task.entity_id,
              project_id: task.entity_type === 'project' ? task.entity_id : null,
              status: task.status,
              priority: task.priority,
              source: task.source, // Include source to identify sticky note tasks
              resource: task,
              taskId: task.id // Store task ID for drag & drop
            })
          }
        })
      }
    }
    
    // 2) Shipments
    if (filters.types?.includes('shipment') !== false) {
      const { data: shipments, error: shipmentsError } = await supabase
        .from('po_shipments')
        .select(`
          *,
          purchase_orders!inner(
            id,
            po_number,
            is_demo,
            projects(id, name)
          )
        `)
        .eq('user_id', userId)
        .eq('is_demo', demoMode) // Filter by demo mode on po_shipments
        .eq('purchase_orders.is_demo', demoMode) // Filter by demo mode on purchase_orders
      
      if (!shipmentsError && shipments) {
        shipments.forEach(shipment => {
          const po = shipment.purchase_orders
          const project = po?.projects
          
          // Pickup event
          if (shipment.pickup_date) {
            events.push({
              id: `shipment-pickup-${shipment.id}`,
              title: `Pickup: ${po?.po_number || 'PO'} (${shipment.carrier || 'N/A'})`,
              start: new Date(shipment.pickup_date),
              end: new Date(shipment.pickup_date),
              type: 'shipment',
              entity_type: 'purchase_order',
              entity_id: po?.id,
              project_id: project?.id,
              status: shipment.status,
              shipment_type: shipment.shipment_type,
              resource: shipment
            })
          }
          
          // ETA event
          if (shipment.eta_date) {
            events.push({
              id: `shipment-eta-${shipment.id}`,
              title: `ETA: ${po?.po_number || 'PO'} (${shipment.carrier || 'N/A'})`,
              start: new Date(shipment.eta_date),
              end: new Date(shipment.eta_date),
              type: 'shipment',
              entity_type: 'purchase_order',
              entity_id: po?.id,
              project_id: project?.id,
              status: shipment.status,
              shipment_type: shipment.shipment_type,
              resource: shipment
            })
          }
        })
      }
    }
    
    // 3) Manufacturer packs
    if (filters.types?.includes('manufacturer') !== false) {
      const { data: pos, error: posError } = await supabase
        .from('purchase_orders')
        .select(`
          id,
          po_number,
          manufacturer_pack_generated_at,
          manufacturer_pack_sent_at,
          projects(id, name)
        `)
        .eq('user_id', userId)
        .eq('is_demo', demoMode) // Filter by demo mode
        .not('manufacturer_pack_generated_at', 'is', null)
      
      if (!posError && pos) {
        pos.forEach(po => {
          // Pack generated event
          if (po.manufacturer_pack_generated_at) {
            events.push({
              id: `manufacturer-generated-${po.id}`,
              title: `Pack generated: ${po.po_number}`,
              start: new Date(po.manufacturer_pack_generated_at),
              end: new Date(po.manufacturer_pack_generated_at),
              type: 'manufacturer',
              entity_type: 'purchase_order',
              entity_id: po.id,
              project_id: po.projects?.id,
              status: po.manufacturer_pack_sent_at ? 'sent' : 'pending',
              resource: po
            })
          }
          
          // Pack sent event
          if (po.manufacturer_pack_sent_at) {
            events.push({
              id: `manufacturer-sent-${po.id}`,
              title: `Pack sent: ${po.po_number}`,
              start: new Date(po.manufacturer_pack_sent_at),
              end: new Date(po.manufacturer_pack_sent_at),
              type: 'manufacturer',
              entity_type: 'purchase_order',
              entity_id: po.id,
              project_id: po.projects?.id,
              status: 'sent',
              resource: po
            })
          }
        })
      }
    }
    
    // 4) Quotes (only if validity_date column exists)
    if (filters.types?.includes('quote') !== false) {
      try {
        const { data: quotes, error: quotesError } = await supabase
          .from('supplier_quotes')
          .select(`
            *,
            projects(id, name),
            suppliers(id, name)
          `)
          .eq('user_id', userId)
          .eq('is_demo', demoMode) // Filter by demo mode
        
        if (quotesError) {
          // If column doesn't exist, skip quotes
          if (quotesError.code === '42703') {
            console.warn('validity_date column does not exist in supplier_quotes, skipping quote events')
          } else {
            throw quotesError
          }
        } else if (quotes) {
          quotes.forEach(quote => {
            if (quote.validity_date) {
              events.push({
                id: `quote-${quote.id}`,
                title: `Quote expires: ${quote.projects?.name || 'Project'} (${quote.suppliers?.name || 'Supplier'})`,
                start: new Date(quote.validity_date),
                end: new Date(quote.validity_date),
                type: 'quote',
                entity_type: 'quote',
                entity_id: quote.id,
                project_id: quote.project_id,
                status: 'active',
                resource: quote
              })
            }
          })
        }
      } catch (err) {
        // Skip quotes if there's an error (e.g., column doesn't exist)
        console.warn('Error loading quote events:', err)
      }
    }
    
    // 5) Purchase Orders (PO dates)
    if (filters.types?.includes('purchase_order') !== false) {
      const { data: pos, error: posError } = await supabase
        .from('purchase_orders')
        .select(`
          id,
          po_number,
          order_date,
          expected_delivery_date,
          projects(id, name)
        `)
        .eq('user_id', userId)
        .eq('is_demo', demoMode) // Filter by demo mode
      
      if (!posError && pos) {
        pos.forEach(po => {
          // Order date event
          if (po.order_date) {
            events.push({
              id: `po-order-${po.id}`,
              title: `PO: ${po.po_number || 'N/A'}`,
              start: new Date(po.order_date),
              end: new Date(po.order_date),
              type: 'purchase_order',
              entity_type: 'purchase_order',
              entity_id: po.id,
              project_id: po.projects?.id,
              status: 'ordered',
              resource: po
            })
          }
          
          // Expected delivery event
          if (po.expected_delivery_date) {
            events.push({
              id: `po-delivery-${po.id}`,
              title: `Delivery: ${po.po_number || 'N/A'}`,
              start: new Date(po.expected_delivery_date),
              end: new Date(po.expected_delivery_date),
              type: 'purchase_order',
              entity_type: 'purchase_order',
              entity_id: po.id,
              project_id: po.projects?.id,
              status: 'expected',
              resource: po
            })
          }
        })
      }
    }
    
    // Filter by project if specified
    if (filters.projectId) {
      return events.filter(e => e.project_id === filters.projectId)
    }
    
    return events
  } catch (err) {
    console.error('Error getting calendar events:', err)
    return []
  }
}

export const getSupplierQuotes = async (projectId) => {
  const userId = await getCurrentUserId()
  const { data, error } = await supabase
    .from('supplier_quotes')
    .select(`
      *,
      suppliers (
        id,
        name,
        country
      ),
      supplier_quote_price_breaks (
        id,
        min_qty,
        unit_price
      )
    `)
    .eq('user_id', userId)
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return data || []
}

export const getSupplierQuote = async (quoteId) => {
  const userId = await getCurrentUserId()
  const { data, error } = await supabase
    .from('supplier_quotes')
    .select(`
      *,
      suppliers (
        id,
        name,
        country
      ),
      supplier_quote_price_breaks (
        id,
        min_qty,
        unit_price
      )
    `)
    .eq('id', quoteId)
    .eq('user_id', userId)
    .single()
  
  if (error) throw error
  return data
}

export const createSupplierQuote = async (quote) => {
  const { user_id, price_breaks, ...quoteData } = quote
  const userId = await getCurrentUserId()
  
  // Insert quote
  const { data: quoteResult, error: quoteError } = await supabase
    .from('supplier_quotes')
    .insert([{
      ...quoteData,
      user_id: userId
    }])
    .select()
    .single()
  
  if (quoteError) throw quoteError
  
  // Insert price breaks if provided
  if (price_breaks && price_breaks.length > 0) {
    const priceBreaksData = price_breaks.map(pb => ({
      quote_id: quoteResult.id,
      min_qty: pb.min_qty,
      unit_price: pb.unit_price
    }))
    
    const { error: breaksError } = await supabase
      .from('supplier_quote_price_breaks')
      .insert(priceBreaksData)
    
    if (breaksError) throw breaksError
  }
  
  // Return quote with price breaks
  return await getSupplierQuote(quoteResult.id)
}

export const updateSupplierQuote = async (quoteId, updates) => {
  const { user_id, price_breaks, ...updateData } = updates
  const userId = await getCurrentUserId()
  
  // Update quote
  const { error: quoteError } = await supabase
    .from('supplier_quotes')
    .update(updateData)
    .eq('id', quoteId)
    .eq('user_id', userId)
  
  if (quoteError) throw quoteError
  
  // Update price breaks if provided
  if (price_breaks !== undefined) {
    // Delete existing price breaks
    const { error: deleteError } = await supabase
      .from('supplier_quote_price_breaks')
      .delete()
      .eq('quote_id', quoteId)
    
    if (deleteError) throw deleteError
    
    // Insert new price breaks
    if (price_breaks.length > 0) {
      const priceBreaksData = price_breaks.map(pb => ({
        quote_id: quoteId,
        min_qty: pb.min_qty,
        unit_price: pb.unit_price
      }))
      
      const { error: insertError } = await supabase
        .from('supplier_quote_price_breaks')
        .insert(priceBreaksData)
      
      if (insertError) throw insertError
    }
  }
  
  return await getSupplierQuote(quoteId)
}

export const deleteSupplierQuote = async (quoteId) => {
  const userId = await getCurrentUserId()
  const { error } = await supabase
    .from('supplier_quotes')
    .delete()
    .eq('id', quoteId)
    .eq('user_id', userId)
  
  if (error) throw error
}

// DECISION LOG
export const getDecisionLog = async (entityType, entityId) => {
  const userId = await getCurrentUserId()
  const { data, error } = await supabase
    .from('decision_log')
    .select('*')
    .eq('user_id', userId)
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  
  if (error) throw error
  return data
}

export const createDecisionLog = async (decision) => {
  const { user_id, ...decisionData } = decision
  const userId = await getCurrentUserId()
  
  // Check if decision already exists for this entity (1 decisión activa por entidad)
  const existing = await getDecisionLog(decisionData.entity_type, decisionData.entity_id)
  
  if (existing) {
    // Update existing instead of creating new
    return await updateDecisionLog(existing.id, {
      decision: decisionData.decision,
      reason: decisionData.reason || null,
      notes: decisionData.notes || null
    })
  }
  
  // Create new
  const { data, error } = await supabase
    .from('decision_log')
    .insert([{
      ...decisionData,
      user_id: userId
    }])
    .select()
    .single()
  
  if (error) throw error
  return data
}

export const updateDecisionLog = async (id, updates) => {
  const userId = await getCurrentUserId()
  const { user_id, ...updateData } = updates
  
  const { data, error } = await supabase
    .from('decision_log')
    .update(updateData)
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single()
  
  if (error) throw error
  return data
}

// Planned vs Actual: Get PO related to a quote (same supplier + project)
export const getPoForQuote = async (quoteId) => {
  const userId = await getCurrentUserId()
  
  // Get quote
  const { data: quote, error: quoteError } = await supabase
    .from('supplier_quotes')
    .select('supplier_id, project_id')
    .eq('id', quoteId)
    .eq('user_id', userId)
    .single()
  
  if (quoteError || !quote) return null
  
  // Find PO with same supplier and project
  const { data: pos, error: poError } = await supabase
    .from('purchase_orders')
    .select('*')
    .eq('supplier_id', quote.supplier_id)
    .eq('project_id', quote.project_id)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
  
  if (poError || !pos || pos.length === 0) return null
  
  return pos[0]
}

// Planned vs Actual: Get quote related to a PO (same supplier + project)
export const getQuoteForPo = async (poId) => {
  const userId = await getCurrentUserId()
  
  // Get PO
  const { data: po, error: poError } = await supabase
    .from('purchase_orders')
    .select('supplier_id, project_id')
    .eq('id', poId)
    .eq('user_id', userId)
    .single()
  
  if (poError || !po) return null
  
  // Find quote with same supplier and project (most recent)
  const { data: quotes, error: quoteError } = await supabase
    .from('supplier_quotes')
    .select(`
      *,
      supplier_quote_price_breaks (
        min_qty,
        unit_price
      )
    `)
    .eq('supplier_id', po.supplier_id)
    .eq('project_id', po.project_id)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
  
  if (quoteError || !quotes || quotes.length === 0) return null
  
  return quotes[0]
}

// Planned vs Actual: Get shipment for PO
export const getShipmentForPo = async (poId) => {
  const userId = await getCurrentUserId()
  
  try {
    const { data, error } = await supabase
      .from('po_shipments')
      .select('*')
      .eq('purchase_order_id', poId)
      .eq('user_id', userId)
      .single()
    
    if (error && error.code !== 'PGRST116') throw error
    return data || null
  } catch (err) {
    // Table might not exist
    return null
  }
}

// Quick action: Mark Manufacturer Pack as Sent
export const quickMarkPackAsSent = async (poId) => {
  const userId = await getCurrentUserId()
  const readiness = await getPoAmazonReadiness(poId)
  
  if (!readiness) {
    throw new Error('PO readiness not found')
  }
  
  const { data, error } = await supabase
    .from('po_amazon_readiness')
    .update({
      manufacturer_pack_sent_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', readiness.id)
    .eq('user_id', userId)
    .select()
    .single()
  
  if (error) throw error
  
  // Log audit
  try {
    const { logAudit } = await import('./auditLog')
    await logAudit({
      entityType: 'purchase_order',
      entityId: poId,
      action: 'mark_pack_sent',
      status: 'success',
      message: 'Manufacturer pack marked as sent'
    })
  } catch (err) {
    console.warn('Error logging audit:', err)
  }
  
  return data
}

// Sticky Notes functions
export const getStickyNotes = async (filters = {}) => {
  // Get demo mode setting
  const { getDemoMode } = await import('./demoModeFilter')
  const demoMode = await getDemoMode()
  
  // Legacy demo mode check (for backward compatibility)
  if (isDemoMode() && !demoMode) {
    const notes = await mockGetStickyNotes(filters.projectId !== undefined ? filters.projectId : null)
    // Apply filters client-side
    let filtered = notes
    if (filters.status) {
      filtered = filtered.filter(n => n.status === filters.status)
    }
    if (filters.pinned !== undefined) {
      filtered = filtered.filter(n => n.pinned === filters.pinned)
    }
    return filtered
  }
  
  const userId = await getCurrentUserId()
  let query = supabase
    .from('sticky_notes')
    .select(`
      *,
      tasks:linked_task_id (
        id,
        title,
        status,
        due_date,
        priority
      )
    `)
    .eq('user_id', userId)
    .eq('is_demo', demoMode) // Filter by demo mode
    .order('created_at', { ascending: false })
  
  if (filters.status) {
    query = query.eq('status', filters.status)
  }
  if (filters.pinned !== undefined) {
    query = query.eq('pinned', filters.pinned)
  }
  
  const { data, error } = await query
  if (error) throw error
  return data || []
}

export const createStickyNote = async (note) => {
  // Get demo mode setting
  const { getDemoMode } = await import('./demoModeFilter')
  const demoMode = await getDemoMode()
  
  const { user_id, ...noteData } = note
  const userId = await getCurrentUserId()
  
  const { data, error } = await supabase
    .from('sticky_notes')
    .insert([{
      ...noteData,
      user_id: userId,
      is_demo: demoMode // Mark with current demo mode
    }])
    .select()
    .single()
  
  if (error) throw error
  return data
}

export const updateStickyNote = async (id, updates) => {
  const userId = await getCurrentUserId()
  
  const { data, error } = await supabase
    .from('sticky_notes')
    .update(updates)
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single()
  
  if (error) throw error
  return data
}

export const deleteStickyNote = async (id) => {
  const userId = await getCurrentUserId()
  
  const { data, error } = await supabase
    .from('sticky_notes')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single()
  
  if (error) throw error
  return data
}

export const markStickyNoteDone = async (id) => {
  return await updateStickyNote(id, { status: 'done' })
}

// Convert sticky note to task
export const convertStickyNoteToTask = async (stickyNoteId, options = {}) => {
  const userId = await getCurrentUserId()
  
  // Get sticky note
  const { data: stickyNote, error: stickyError } = await supabase
    .from('sticky_notes')
    .select('*')
    .eq('id', stickyNoteId)
    .eq('user_id', userId)
    .single()
  
  if (stickyError) throw stickyError
  if (!stickyNote) throw new Error('Sticky note not found')
  
  // D) Evitar duplicats - Check if already linked
  if (stickyNote.linked_task_id) {
    throw new Error('ALREADY_LINKED')
  }
  
  // Create task from sticky note
  // title = sticky.title o resum curt del content
  const taskTitle = stickyNote.title || stickyNote.content.split('\n')[0].substring(0, 100) || 'Task from note'
  // description/notes = sticky.content
  const taskNotes = stickyNote.content
  // due_date = sticky.due_date o today()
  const taskDueDate = stickyNote.due_date || options.dueDate || new Date().toISOString().split('T')[0]
  // priority = sticky.priority
  const taskPriority = stickyNote.priority || 'normal'
  
  // Determine entity_type and entity_id
  // si l'usuari està dins un projecte quan crea la note, linka a project
  // sinó, entity_type='project' i entity_id null (per global tasks)
  const entityType = options.entity_type || 'project'
  const entityId = options.entity_id || null // Allow null for global tasks
  
  // Create task
  const { data: task, error: taskError } = await supabase
    .from('tasks')
    .insert([{
      user_id: userId,
      title: taskTitle,
      notes: taskNotes,
      due_date: taskDueDate,
      priority: taskPriority,
      status: 'open',
      source: 'sticky_note',
      entity_type: entityType,
      entity_id: entityId
    }])
    .select()
    .single()
  
  if (taskError) throw taskError
  
  // Update sticky note with task link
  // pinned = false (perquè deixi de molestar)
  const { data: updatedNote, error: updateError } = await supabase
    .from('sticky_notes')
    .update({
      linked_task_id: task.id,
      converted_to_task_at: new Date().toISOString(),
      pinned: false // Para que deje de molestar en el overlay
    })
    .eq('id', stickyNoteId)
    .eq('user_id', userId)
    .select()
    .single()
  
  if (updateError) throw updateError
  
  return { task, stickyNote: updatedNote }
}

// Unlink task from sticky note
export const unlinkStickyNoteTask = async (stickyNoteId) => {
  const userId = await getCurrentUserId()
  
  const { data, error } = await supabase
    .from('sticky_notes')
    .update({
      linked_task_id: null,
      converted_to_task_at: null
    })
    .eq('id', stickyNoteId)
    .eq('user_id', userId)
    .select()
    .single()
  
  if (error) throw error
  return data
}

// Update getStickyNotes to include linked task info
// (This will be done by modifying the query to join tasks table if needed)
export const getStickyNoteWithTask = async (id) => {
  const userId = await getCurrentUserId()
  
  const { data, error } = await supabase
    .from('sticky_notes')
    .select(`
      *,
      tasks:linked_task_id (
        id,
        title,
        status,
        due_date,
        priority
      )
    `)
    .eq('id', id)
    .eq('user_id', userId)
    .single()
  
  if (error) throw error
  return data
}

// ============================================
// RECEIPT UPLOAD (STORAGE)
// ============================================

/**
 * Upload receipt file to Supabase Storage bucket "receipts"
 * @param {File} file - File to upload (PDF, JPG, PNG)
 * @param {string} expenseId - Expense ID (for folder structure)
 * @returns {Promise<{url: string, path: string}>} Public URL and path
 */
export const uploadReceipt = async (file, expenseId = null) => {
  const userId = await getCurrentUserId()
  if (!userId) throw new Error('User not authenticated')

  // Validar tipus de fitxer
  const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Tipus de fitxer no permès. Només PDF, JPG i PNG.')
  }

  // Validar mida (max 10MB)
  const maxSize = 10 * 1024 * 1024 // 10MB
  if (file.size > maxSize) {
    throw new Error('El fitxer és massa gran. Màxim 10MB.')
  }

  // Generar nom únic: userId/expenseId-timestamp-filename
  const timestamp = Date.now()
  const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
  const filePath = expenseId 
    ? `${userId}/${expenseId}-${timestamp}-${sanitizedFileName}`
    : `${userId}/${timestamp}-${sanitizedFileName}`

  try {
    // Upload a Supabase Storage
    const { data, error } = await supabase.storage
      .from('receipts')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (error) throw error

    // Obtenir URL pública
    const { data: urlData } = supabase.storage
      .from('receipts')
      .getPublicUrl(filePath)

    return {
      url: urlData.publicUrl,
      path: filePath,
      filename: file.name,
      size: file.size
    }
  } catch (err) {
    console.error('Error uploading receipt:', err)
    throw new Error(`Error pujant receipt: ${err.message || 'Error desconegut'}`)
  }
}

/**
 * Delete receipt from Supabase Storage
 * @param {string} filePath - Path del fitxer a eliminar
 */
export const deleteReceipt = async (filePath) => {
  try {
    const { error } = await supabase.storage
      .from('receipts')
      .remove([filePath])
    
    if (error) throw error
    return true
  } catch (err) {
    console.error('Error deleting receipt:', err)
    throw new Error(`Error eliminant receipt: ${err.message || 'Error desconegut'}`)
  }
}

/**
 * Get public URL for receipt
 * @param {string} filePath - Path del fitxer
 * @returns {string} Public URL
 */
export const getReceiptUrl = (filePath) => {
  if (!filePath) return null
  const { data } = supabase.storage
    .from('receipts')
    .getPublicUrl(filePath)
  return data.publicUrl
}

// ============================================
// RECURRING EXPENSES
// ============================================

/**
 * Get all recurring expenses for current user
 */
export const getRecurringExpenses = async () => {
  // Get demo mode setting
  const { getDemoMode } = await import('./demoModeFilter')
  const demoMode = await getDemoMode()
  
  const userId = await getCurrentUserId()
  const { data, error } = await supabase
    .from('recurring_expenses')
    .select(`
      *,
      category:finance_categories(id, name, color, icon),
      project:projects(id, name),
      supplier:suppliers(id, name)
    `)
    .eq('user_id', userId)
    .eq('is_demo', demoMode) // Filter by demo mode
    .order('day_of_month', { ascending: true })
  if (error) throw error
  return data || []
}

/**
 * Create recurring expense
 */
export const createRecurringExpense = async (recurringExpense) => {
  // Get demo mode setting
  const { getDemoMode } = await import('./demoModeFilter')
  const demoMode = await getDemoMode()
  
  const userId = await getCurrentUserId()
  const { user_id, ...data } = recurringExpense
  
  // Calcular next_generation_date
  const today = new Date()
  const currentMonth = new Date(today.getFullYear(), today.getMonth(), 1)
  const dayOfMonth = data.day_of_month || 1
  const targetDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), dayOfMonth)
  
  // Si el dia ja ha passat aquest mes, generar per al mes següent
  if (targetDate < today) {
    targetDate.setMonth(targetDate.getMonth() + 1)
  }
  
  const { data: result, error } = await supabase
    .from('recurring_expenses')
    .insert([{
      ...data,
      user_id: userId,
      is_demo: demoMode, // Mark with current demo mode
      next_generation_date: targetDate.toISOString().split('T')[0]
    }])
    .select()
    .single()
  if (error) throw error
  return result
}

/**
 * Update recurring expense
 */
export const updateRecurringExpense = async (id, updates) => {
  const { user_id, ...data } = updates
  const { data: result, error } = await supabase
    .from('recurring_expenses')
    .update(data)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return result
}

/**
 * Delete recurring expense
 */
export const deleteRecurringExpense = async (id) => {
  const { error } = await supabase
    .from('recurring_expenses')
    .delete()
    .eq('id', id)
  if (error) throw error
  return true
}

/**
 * Generate recurring expenses (call Supabase function)
 */
export const generateRecurringExpenses = async () => {
  const { data, error } = await supabase.rpc('generate_recurring_expenses')
  if (error) throw error
  return data || 0
}

/**
 * Mark recurring expense as paid
 */
export const markRecurringExpenseAsPaid = async (expenseId) => {
  const { data, error } = await supabase
    .from('expenses')
    .update({
      recurring_status: 'paid',
      payment_status: 'paid'
    })
    .eq('id', expenseId)
    .select()
    .single()
  if (error) throw error
  return data
}

/**
 * Get recurring expenses KPIs
 */
export const getRecurringExpensesKPIs = async () => {
  // Get demo mode setting
  const { getDemoMode } = await import('./demoModeFilter')
  const demoMode = await getDemoMode()
  
  const userId = await getCurrentUserId()
  const today = new Date()
  const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
  const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1)
  const nextMonthStr = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}`
  
  // Pending (expected, no pagades, mes actual o anterior)
  const { data: pending } = await supabase
    .from('expenses')
    .select('amount, currency')
    .eq('user_id', userId)
    .eq('is_demo', demoMode) // Filter by demo mode
    .eq('recurring_status', 'expected')
    .eq('payment_status', 'pending')
    .lte('recurring_period', currentMonth)
  
  // Paid (pagades)
  const { data: paid } = await supabase
    .from('expenses')
    .select('amount, currency')
    .eq('user_id', userId)
    .eq('is_demo', demoMode) // Filter by demo mode
    .eq('recurring_status', 'paid')
  
  // Upcoming (expected, mes següent o posterior)
  const { data: upcoming } = await supabase
    .from('expenses')
    .select('amount, currency')
    .eq('user_id', userId)
    .eq('is_demo', demoMode) // Filter by demo mode
    .eq('recurring_status', 'expected')
    .gte('recurring_period', nextMonthStr)
  
  return {
    pending: {
      count: pending?.length || 0,
      amount: pending?.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0) || 0
    },
    paid: {
      count: paid?.length || 0,
      amount: paid?.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0) || 0
    },
    upcoming: {
      count: upcoming?.length || 0,
      amount: upcoming?.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0) || 0
    }
  }
}

export default supabase
