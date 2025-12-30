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
  const { data, error } = await supabase
    .from('projects')
    .insert([project])
    .select()
    .single()
  if (error) throw error
  return data
}

export const updateProject = async (id, updates) => {
  const { data, error } = await supabase
    .from('projects')
    .update(updates)
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
  const { data, error } = await supabase
    .from('suppliers')
    .insert([supplier])
    .select()
    .single()
  if (error) throw error
  return data
}

export const updateSupplier = async (id, updates) => {
  const { data, error } = await supabase
    .from('suppliers')
    .update({ ...updates, updated_at: new Date().toISOString() })
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
  const { data, error } = await supabase
    .from('purchase_orders')
    .insert([po])
    .select()
    .single()
  if (error) throw error
  return data
}

export const updatePurchaseOrder = async (id, updates) => {
  const { data, error } = await supabase
    .from('purchase_orders')
    .update({ ...updates, updated_at: new Date().toISOString() })
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
  const { data, error } = await supabase
    .from('documents')
    .insert([doc])
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
  const { data, error } = await supabase
    .from('payments')
    .insert([payment])
    .select()
    .single()
  if (error) throw error
  return data
}

export const updatePayment = async (id, updates) => {
  const { data, error } = await supabase
    .from('payments')
    .update(updates)
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
  const { data, error } = await supabase
    .from('warehouses')
    .insert([warehouse])
    .select()
    .single()
  if (error) throw error
  return data
}

export const updateWarehouse = async (id, updates) => {
  const { data, error } = await supabase
    .from('warehouses')
    .update({ ...updates, updated_at: new Date().toISOString() })
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
  const { data, error } = await supabase
    .from('company_settings')
    .select('*')
    .limit(1)
    .single()
  if (error && error.code !== 'PGRST116') throw error
  return data
}

export const updateCompanySettings = async (settings) => {
  const existing = await getCompanySettings()

  if (existing) {
    const { data, error } = await supabase
      .from('company_settings')
      .update({ ...settings, updated_at: new Date().toISOString() })
      .eq('id', existing.id)
      .select()
      .single()
    if (error) throw error
    return data
  }

  const { data, error } = await supabase
    .from('company_settings')
    .insert([settings])
    .select()
    .single()
  if (error) throw error
  return data
}

export default supabase
