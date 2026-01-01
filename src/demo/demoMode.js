/**
 * Demo Mode Utilities
 * 
 * Centralized demo mode detection and data mocking
 */

import {
  demoProjects,
  demoPurchaseOrders,
  demoSuppliers,
  demoTasks,
  demoStickyNotes,
  demoExpenses,
  demoIncomes,
  demoFinanceCategories,
  enrichDemoProject,
  getDemoProject,
  getDemoPOsByProject,
  getDemoTasksByProject,
  getDemoGlobalNotes,
  getDemoSupplierPriceEstimatesByProject,
  getDemoFinanceCategories
} from './demoData'

/**
 * Check if demo mode is enabled
 * Priority: VITE_DEMO_MODE env var > localStorage toggle
 */
export const isDemoMode = () => {
  // Check environment variable first
  if (import.meta.env.VITE_DEMO_MODE === 'true') {
    return true
  }
  
  // Check localStorage toggle (for runtime switching)
  const demoToggle = localStorage.getItem('demo_mode_toggle')
  if (demoToggle === 'true') {
    return true
  }
  
  return false
}

/**
 * Mock getProjects - returns demo projects
 */
export const mockGetProjects = async (includeDiscarded = false) => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 300))
  
  if (includeDiscarded) {
    return demoProjects
  }
  
  return demoProjects.filter(p => p.decision !== 'DISCARDED')
}

/**
 * Mock getProject - returns single demo project with related data
 */
export const mockGetProject = async (id) => {
  await new Promise(resolve => setTimeout(resolve, 200))
  
  const project = getDemoProject(id)
  if (!project) {
    throw new Error('Project not found')
  }
  
  return enrichDemoProject(project)
}

/**
 * Mock getPurchaseOrders - returns demo POs
 */
export const mockGetPurchaseOrders = async () => {
  await new Promise(resolve => setTimeout(resolve, 300))
  
  // Enrich POs with project and supplier data
  return demoPurchaseOrders.map(po => ({
    ...po,
    projects: getDemoProject(po.project_id),
    suppliers: demoSuppliers.find(s => s.id === po.supplier_id)
  }))
}

/**
 * Mock getPurchaseOrder - returns single PO
 */
export const mockGetPurchaseOrder = async (id) => {
  await new Promise(resolve => setTimeout(resolve, 200))
  
  const po = demoPurchaseOrders.find(p => p.id === id)
  if (!po) {
    throw new Error('Purchase order not found')
  }
  
  return {
    ...po,
    projects: getDemoProject(po.project_id),
    suppliers: demoSuppliers.find(s => s.id === po.supplier_id)
  }
}

/**
 * Mock getPosWaitingManufacturer
 */
export const mockGetPosWaitingManufacturer = async (limit = 10) => {
  await new Promise(resolve => setTimeout(resolve, 300))
  
  const waiting = demoPurchaseOrders
    .filter(po => po.status === 'waiting_manufacturer')
    .slice(0, limit)
    .map(po => ({
      ...po,
      projects: getDemoProject(po.project_id),
      suppliers: demoSuppliers.find(s => s.id === po.supplier_id)
    }))
  
  return waiting
}

/**
 * Mock getPosNotReady - POs missing Amazon readiness data
 */
export const mockGetPosNotReady = async (limit = 10) => {
  await new Promise(resolve => setTimeout(resolve, 300))
  
  // Find POs where project doesn't have FNSKU
  const notReady = demoPurchaseOrders
    .filter(po => {
      const project = getDemoProject(po.project_id)
      return project && !project.fnsku
    })
    .slice(0, limit)
    .map(po => {
      const project = getDemoProject(po.project_id)
      return {
        ...po,
        project,
        missing: project?.fnsku ? [] : ['FNSKU'],
        missingCount: project?.fnsku ? 0 : 1
      }
    })
  
  return notReady
}

/**
 * Mock getShipmentsInTransit
 */
export const mockGetShipmentsInTransit = async (limit = 10) => {
  await new Promise(resolve => setTimeout(resolve, 300))
  
  const inTransit = demoPurchaseOrders
    .filter(po => po.status === 'in_transit' && po.tracking_number)
    .slice(0, limit)
    .map(po => ({
      ...po,
      po_number: po.po_number,
      tracking_number: po.tracking_number,
      eta_date: po.eta_date,
      carrier: 'DHL Express'
    }))
  
  return inTransit
}

/**
 * Mock getResearchNoDecision
 */
export const mockGetResearchNoDecision = async (limit = 10) => {
  await new Promise(resolve => setTimeout(resolve, 300))
  
  return demoProjects
    .filter(p => p.phase === 'research' && !p.decision)
    .slice(0, limit)
}

/**
 * Mock getStaleTracking
 */
export const mockGetStaleTracking = async (limit = 10, staleDays = 7) => {
  await new Promise(resolve => setTimeout(resolve, 300))
  
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - staleDays)
  
  return demoPurchaseOrders
    .filter(po => {
      if (!po.updated_at) return false
      const updated = new Date(po.updated_at)
      return updated < cutoffDate && po.tracking_number
    })
    .slice(0, limit)
    .map(po => {
      const daysStale = Math.floor((new Date() - new Date(po.updated_at)) / (1000 * 60 * 60 * 24))
      return {
        ...po,
        projects: getDemoProject(po.project_id),
        tracking_number: po.tracking_number,
        daysStale
      }
    })
}

/**
 * Mock getTasks
 */
export const mockGetTasks = async (projectId = null) => {
  await new Promise(resolve => setTimeout(resolve, 200))
  
  if (projectId) {
    return getDemoTasksByProject(projectId)
  }
  
  return demoTasks
}

/**
 * Mock getStickyNotes
 */
export const mockGetStickyNotes = async (projectId = null) => {
  await new Promise(resolve => setTimeout(resolve, 200))
  
  if (projectId === null) {
    return getDemoGlobalNotes()
  }
  
  const { getDemoNotesByProject } = await import('./demoData')
  return getDemoNotesByProject(projectId)
}

/**
 * Mock getExpenses
 */
export const mockGetExpenses = async () => {
  await new Promise(resolve => setTimeout(resolve, 300))
  
  return demoExpenses
}

/**
 * Mock getIncomes
 */
export const mockGetIncomes = async () => {
  await new Promise(resolve => setTimeout(resolve, 300))
  
  return demoIncomes
}

/**
 * Mock getSuppliers
 */
export const mockGetSuppliers = async () => {
  await new Promise(resolve => setTimeout(resolve, 300))
  
  return demoSuppliers
}

/**
 * Mock getDashboardStats
 */
export const mockGetDashboardStats = async () => {
  await new Promise(resolve => setTimeout(resolve, 200))
  
  const activeProjects = demoProjects.filter(p => p.status === 'active' && p.decision !== 'DISCARDED')
  const completedProjects = demoProjects.filter(p => p.phase === 'live')
  const totalInvested = demoExpenses
    .filter(e => e.payment_status === 'paid')
    .reduce((sum, e) => sum + parseFloat(e.amount || 0), 0)
  
  return {
    totalProjects: demoProjects.length,
    activeProjects: activeProjects.length,
    completedProjects: completedProjects.length,
    totalInvested
  }
}

/**
 * Mock getProjectsMissingGtin
 */
export const mockGetProjectsMissingGtin = async () => {
  await new Promise(resolve => setTimeout(resolve, 200))
  
  return demoProjects.filter(p => !p.gtin && p.decision !== 'DISCARDED')
}

/**
 * Mock getUnassignedGtinCodes
 */
export const mockGetUnassignedGtinCodes = async () => {
  await new Promise(resolve => setTimeout(resolve, 200))
  
  // Return empty array (all GTINs are assigned in demo)
  return []
}

/**
 * Mock getSupplierPriceEstimates
 */
export const mockGetSupplierPriceEstimates = async (projectId) => {
  await new Promise(resolve => setTimeout(resolve, 200))
  
  const { getDemoSupplierPriceEstimatesByProject } = await import('./demoData')
  return getDemoSupplierPriceEstimatesByProject(projectId)
}

/**
 * Mock getFinanceCategories
 */
export const mockGetFinanceCategories = async () => {
  await new Promise(resolve => setTimeout(resolve, 200))
  
  return getDemoFinanceCategories()
}

/**
 * Mock getProductIdentifiers
 */
export const mockGetProductIdentifiers = async (projectId) => {
  await new Promise(resolve => setTimeout(resolve, 200))
  
  const project = getDemoProject(projectId)
  if (!project) return null
  
  return {
    project_id: projectId,
    gtin_type: project.gtin ? 'EAN' : null,
    gtin_code: project.gtin || null,
    asin: project.asin || null,
    fnsku: project.fnsku || null,
    exemption_reason: null
  }
}

/**
 * Mock getProjectProfitability
 */
export const mockGetProjectProfitability = async (projectId) => {
  await new Promise(resolve => setTimeout(resolve, 200))
  
  const project = getDemoProject(projectId)
  if (!project || !project.profitability) return null
  
  const prof = project.profitability
  return {
    project_id: projectId,
    selling_price: prof.amazon_price || 0,
    cogs: prof.cogs || 0,
    shipping_per_unit: prof.shipping || 0,
    referral_fee_percent: Math.round((prof.amazon_fees / prof.amazon_price) * 100) || 15,
    fba_fee_per_unit: 0,
    ppc_per_unit: 0,
    other_costs_per_unit: 0,
    fixed_costs: 0
  }
}

/**
 * Mock getCalendarEvents
 */
export const mockGetCalendarEvents = async (filters = {}) => {
  await new Promise(resolve => setTimeout(resolve, 300))
  
  const { demoCalendarEvents } = await import('./demoData')
  let events = [...demoCalendarEvents]
  
  // Filter by type
  if (filters.types && Array.isArray(filters.types)) {
    events = events.filter(e => filters.types.includes(e.type))
  }
  
  // Filter by status
  if (filters.status) {
    events = events.filter(e => e.status === filters.status)
  }
  
  // Filter completed tasks
  if (filters.showCompleted === false) {
    events = events.filter(e => e.status !== 'done' && e.status !== 'completed')
  }
  
  // Filter sticky-derived tasks
  if (filters.showStickyDerived === false) {
    events = events.filter(e => !e.resource?.source || e.resource.source !== 'sticky_note')
  }
  
  return events
}

/**
 * Mock getManufacturerPackStatus
 */
export const mockGetManufacturerPackStatus = async (poId) => {
  await new Promise(resolve => setTimeout(resolve, 200))
  
  const { demoManufacturerPackData } = await import('./demoData')
  return demoManufacturerPackData[poId] || {
    generated: false,
    generated_at: null,
    sent: false,
    sent_at: null,
    includes: {
      po: false,
      fnsku_labels: false,
      packing_list: false,
      carton_labels: false
    }
  }
}

