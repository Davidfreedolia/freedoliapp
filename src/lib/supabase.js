import { createClient } from '@supabase/supabase-js'

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

if (!supabaseUrl || !supabaseAnonKey) {
  missingEnvError()
}

// Client Supabase robust (sessions, refresh, etc.)
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'freedoliapp-auth',
  },
})

// ============================================
// HELPERS
// ============================================

// Obtenir user_id de la sessió actual
const getCurrentUserId = async () => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No hi ha usuari autenticat')
  return user.id
}

// ============================================
// FUNCIONS API
// ============================================

// PROJECTES
export const getProjects = async () => {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export const getProject = async (id) => {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export const createProject = async (project) => {
  // Eliminar user_id si ve del client (seguretat: sempre s'assigna automàticament)
  const { user_id, ...projectData } = project
  const { data, error } = await supabase
    .from('projects')
    .insert([projectData])
    .select()
    .single()
  if (error) throw error
  return data
}

export const updateProject = async (id, updates) => {
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
  const { error } = await supabase.from('projects').delete().eq('id', id)
  if (error) throw error
  return true
}

// PROVEÏDORS
export const getSuppliers = async () => {
  const { data, error } = await supabase
    .from('suppliers')
    .select('*')
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
  const { data, error } = await supabase
    .from('suppliers')
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
  let query = supabase
    .from('purchase_orders')
    .select(
      `
      *,
      supplier:suppliers(name, contact_name, email),
      project:projects(name, project_code, sku)
    `
    )
    .order('created_at', { ascending: false })

  if (projectId) query = query.eq('project_id', projectId)

  const { data, error } = await query
  if (error) throw error
  return data
}

export const getPurchaseOrder = async (id) => {
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
  // Eliminar user_id si ve del client (seguretat: sempre s'assigna automàticament)
  const { user_id, ...poData } = po
  const { data, error } = await supabase
    .from('purchase_orders')
    .insert([poData])
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
  const { data, error } = await supabase
    .from('documents')
    .select('*')
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
  let query = supabase
    .from('payments')
    .select('*')
    .order('payment_date', { ascending: false })

  if (projectId) query = query.eq('project_id', projectId)

  const { data, error } = await query
  if (error) throw error
  return data
}

export const createPayment = async (payment) => {
  // Eliminar user_id si ve del client (seguretat: sempre s'assigna automàticament)
  const { user_id, ...paymentData } = payment
  const { data, error } = await supabase
    .from('payments')
    .insert([paymentData])
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
  const { data: projects } = await supabase
    .from('projects')
    .select('id, status, current_phase')

  const { data: payments } = await supabase
    .from('payments')
    .select('amount, currency, type')
    .eq('status', 'completed')

  const activeProjects = projects?.filter((p) => p.status === 'active').length || 0
  const completedProjects =
    projects?.filter((p) => p.status === 'completed').length || 0

  const totalInvested =
    payments?.reduce((sum, p) => {
      if (p.currency === 'EUR') return sum + (p.amount || 0)
      if (p.currency === 'USD') return sum + (p.amount || 0) * 0.92
      return sum
    }, 0) || 0

  return {
    totalProjects: projects?.length || 0,
    activeProjects,
    completedProjects,
    totalInvested,
  }
}

// ============================================
// GENERADORS DE CODIS
// ============================================

export const generateProjectCode = async () => {
  const year = new Date().getFullYear().toString().slice(-2)
  const prefix = `PR-FRDL${year}`

  const { data } = await supabase
    .from('projects')
    .select('project_code')
    .like('project_code', `${prefix}%`)
    .order('project_code', { ascending: false })
    .limit(1)

  let nextNum = 1
  if (data && data.length > 0 && data[0].project_code) {
    const lastCode = data[0].project_code
    const numPart = lastCode.replace(`PR-FRDL${year}`, '')
    const lastNum = parseInt(numPart) || 0
    nextNum = lastNum + 1
  }

  const projectCode = `PR-FRDL${year}${nextNum.toString().padStart(4, '0')}`
  const sku = `FRDL${year}${nextNum.toString().padStart(4, '0')}`

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
// PRODUCT IDENTIFIERS (GTIN, ASIN, FNSKU)
// ============================================

export const getProductIdentifiers = async (projectId) => {
  const { data, error } = await supabase
    .from('product_identifiers')
    .select('*')
    .eq('project_id', projectId)
    .single()
  if (error && error.code !== 'PGRST116') throw error // PGRST116 = no rows found
  return data
}

export const upsertProductIdentifiers = async (projectId, identifiers) => {
  // Eliminar user_id si ve del client (seguretat: sempre s'assigna automàticament)
  const { user_id, ...identifiersData } = identifiers
  const { data, error } = await supabase
    .from('product_identifiers')
    .upsert({
      project_id: projectId,
      ...identifiersData,
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
  let query = supabase
    .from('gtin_pool')
    .select('*')
    .order('created_at', { ascending: false })
  
  if (status) {
    query = query.eq('status', status)
  }
  
  const { data, error } = await query
  if (error) throw error
  return data
}

export const getAvailableGtinCodes = async () => {
  const { data, error } = await supabase
    .from('gtin_pool')
    .select('*')
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
      updated_at: new Date().toISOString()
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
  // Eliminar user_id si ve del client (seguretat: sempre s'assigna automàticament)
  const { user_id, ...poolData } = gtinData
  const { data, error } = await supabase
    .from('gtin_pool')
    .insert([poolData])
    .select()
    .single()
  if (error) throw error
  return data
}

export const getUnassignedGtinCodes = async () => {
  const { data, error } = await supabase
    .from('gtin_pool')
    .select('*')
    .eq('status', 'available')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export const getProjectsMissingGtin = async () => {
  // Projectes actius que no tenen GTIN assignat (ni GTIN_EXEMPT)
  const { data: projects, error: projectsError } = await supabase
    .from('projects')
    .select('id, name, project_code, sku, status')
    .eq('status', 'active')
  if (projectsError) throw projectsError
  
  const { data: identifiers, error: identifiersError } = await supabase
    .from('product_identifiers')
    .select('project_id, gtin_type, gtin_code')
  if (identifiersError) throw identifiersError
  
  const projectsWithIdentifiers = new Set(identifiers.map(i => i.project_id))
  const missingGtin = projects.filter(p => 
    !projectsWithIdentifiers.has(p.id) || 
    identifiers.find(i => i.project_id === p.id && !i.gtin_code && i.gtin_type !== 'GTIN_EXEMPT')
  )
  
  return missingGtin
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

export const getPosNotReady = async (limit = 5) => {
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
          sku
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
        missing
      })
    }
    
    if (notReady.length >= limit) break
  }
  
  return notReady
}

// MAGATZEMS
export const getWarehouses = async () => {
  const { data, error } = await supabase
    .from('warehouses')
    .select(
      `
      *,
      supplier:suppliers(name, type)
    `
    )
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
    .insert([settingsData])
    .select()
    .single()
  if (error) throw error
  return data
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

export const updateDashboardPreferences = async (preferences) => {
  const { user_id, ...prefsData } = preferences
  const userId = await getCurrentUserId()
  const existing = await getDashboardPreferences()

  // Widgets default si no existeix configuració
  const defaultWidgets = {
    logistics_tracking: true,
    finance_chart: true,
    orders_in_progress: true,
    activity_feed: false
  }

  if (existing) {
    const { data, error } = await supabase
      .from('dashboard_preferences')
      .update({ 
        widgets: prefsData.widgets || existing.widgets || defaultWidgets,
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
      widgets: prefsData.widgets || defaultWidgets
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

export default supabase
