/**
 * Planned vs Actual Comparison Utilities
 */
import { safeJsonArray } from './safeJson'

/**
 * Get unit price from quote for a given quantity
 */
export const getQuoteUnitPrice = (quote, quantity) => {
  if (!quote.supplier_quote_price_breaks || quote.supplier_quote_price_breaks.length === 0) {
    return null
  }
  
  const sortedBreaks = [...quote.supplier_quote_price_breaks]
    .sort((a, b) => b.min_qty - a.min_qty) // Sort descending
  
  for (const breakItem of sortedBreaks) {
    if (quantity >= breakItem.min_qty) {
      return parseFloat(breakItem.unit_price)
    }
  }
  
  // Return highest price break if quantity is less than all breaks
  return parseFloat(sortedBreaks[sortedBreaks.length - 1]?.unit_price || 0)
}

/**
 * Get actual unit price from PO
 */
export const getPoUnitPrice = (po) => {
  if (!po.items) return null
  
  try {
    const items = safeJsonArray(po.items)
    if (!Array.isArray(items) || items.length === 0) return null
    
    // Get first item's unit_price (assuming all items have same price)
    const firstItem = items[0]
    return parseFloat(firstItem.unit_price) || null
  } catch (err) {
    return null
  }
}

/**
 * Get total quantity from PO
 */
export const getPoQuantity = (po) => {
  if (!po.items) return null
  
  const items = safeJsonArray(po.items)
  return items.reduce((sum, item) => sum + (parseFloat(item?.qty) || 0), 0)
}

/**
 * Calculate price comparison
 */
export const comparePrice = (plannedPrice, actualPrice) => {
  if (!plannedPrice || !actualPrice) return null
  
  const delta = actualPrice - plannedPrice
  const deltaPercent = (delta / plannedPrice) * 100
  
  return {
    planned: plannedPrice,
    actual: actualPrice,
    delta: delta,
    deltaPercent: deltaPercent,
    status: deltaPercent < -2 ? 'better' : deltaPercent > 2 ? 'worse' : 'on_target'
  }
}

/**
 * Calculate lead time comparison
 */
export const compareLeadTime = (promisedDays, actualDays) => {
  if (!promisedDays || actualDays === null || actualDays === undefined) return null
  
  const delta = actualDays - promisedDays
  
  return {
    promised: promisedDays,
    actual: actualDays,
    delta: delta,
    status: delta < -1 ? 'better' : delta > 1 ? 'worse' : 'on_target'
  }
}

/**
 * Calculate actual lead time from PO dates
 */
export const calculateActualLeadTime = (po, shipment) => {
  if (!po.created_at) return null
  
  const startDate = new Date(po.created_at)
  let endDate = null
  
  // Try to get delivery date from shipment
  if (shipment && shipment.status === 'delivered' && shipment.eta_date) {
    endDate = new Date(shipment.eta_date)
  } else if (po.status === 'received' && po.updated_at) {
    // Use updated_at as proxy for received date
    endDate = new Date(po.updated_at)
  } else {
    // No delivery date available
    return null
  }
  
  if (!endDate) return null
  
  const diffTime = endDate - startDate
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  return diffDays
}




