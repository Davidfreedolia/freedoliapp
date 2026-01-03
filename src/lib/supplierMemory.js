/**
 * Supplier Memory - Calculate supplier performance metrics
 */

import { 
  getQuoteUnitPrice, 
  getPoUnitPrice, 
  getPoQuantity,
  comparePrice, 
  compareLeadTime,
  calculateActualLeadTime
} from './plannedVsActual'

/**
 * Get supplier performance metrics
 */
export const getSupplierMetrics = async (supplierId, supabase, getCurrentUserId) => {
  const userId = await getCurrentUserId()
  
  // Get all quotes from this supplier
  const { data: quotes, error: quotesError } = await supabase
    .from('supplier_quotes')
    .select(`
      *,
      supplier_quote_price_breaks (
        min_qty,
        unit_price
      )
    `)
    .eq('supplier_id', supplierId)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  
  if (quotesError) throw quotesError
  
  // Get all POs from this supplier
  const { data: pos, error: posError } = await supabase
    .from('purchase_orders')
    .select('*')
    .eq('supplier_id', supplierId)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  
  if (posError) throw posError
  
  // Get shipments for POs
  const shipmentsMap = {}
  if (pos && pos.length > 0) {
    const poIds = pos.map(po => po.id)
    try {
      const { data: shipments } = await supabase
        .from('po_shipments')
        .select('*')
        .in('purchase_order_id', poIds)
        .eq('user_id', userId)
      
      if (shipments) {
        shipments.forEach(s => {
          shipmentsMap[s.purchase_order_id] = s
        })
      }
    } catch (err) {
      // Table might not exist
    }
  }
  
  // Get decision logs for quotes
  const { data: quoteDecisions } = await supabase
    .from('decision_log')
    .select('*')
    .eq('entity_type', 'quote')
    .eq('user_id', userId)
    .in('entity_id', quotes?.map(q => q.id) || [])
  
  const selectedQuotes = new Set()
  if (quoteDecisions) {
    quoteDecisions
      .filter(d => d.decision === 'selected')
      .forEach(d => selectedQuotes.add(d.entity_id))
  }
  
  // Calculate metrics
  const quotesSent = quotes?.length || 0
  const quotesSelected = selectedQuotes.size
  
  // Calculate price deviations
  const priceDeviations = []
  const leadTimeDeviations = []
  
  if (quotes && pos) {
    for (const quote of quotes) {
      // Find POs with same project
      const relatedPos = pos.filter(po => po.project_id === quote.project_id)
      
      for (const po of relatedPos) {
        const poQuantity = getPoQuantity(po)
        if (!poQuantity) continue
        
        const plannedPrice = getQuoteUnitPrice(quote, poQuantity)
        const actualPrice = getPoUnitPrice(po)
        
        if (plannedPrice && actualPrice) {
          const comparison = comparePrice(plannedPrice, actualPrice)
          if (comparison) {
            priceDeviations.push(comparison.deltaPercent)
          }
        }
        
        // Lead time
        const promisedLeadTime = quote.lead_time_days
        if (promisedLeadTime) {
          const shipment = shipmentsMap[po.id]
          const actualLeadTime = calculateActualLeadTime(po, shipment)
          
          if (actualLeadTime !== null) {
            const ltComparison = compareLeadTime(promisedLeadTime, actualLeadTime)
            if (ltComparison) {
              leadTimeDeviations.push(ltComparison.delta)
            }
          }
        }
      }
    }
  }
  
  const avgPriceDeviation = priceDeviations.length > 0
    ? priceDeviations.reduce((sum, d) => sum + d, 0) / priceDeviations.length
    : null
  
  const avgLeadTimeDeviation = leadTimeDeviations.length > 0
    ? leadTimeDeviations.reduce((sum, d) => sum + d, 0) / leadTimeDeviations.length
    : null
  
  return {
    quotesSent,
    quotesSelected,
    avgPriceDeviation,
    avgLeadTimeDeviation,
    priceDeviationsCount: priceDeviations.length,
    leadTimeDeviationsCount: leadTimeDeviations.length,
    totalPos: pos?.length || 0
  }
}

/**
 * Generate automatic badges based on metrics
 */
export const generateSupplierBadges = (metrics) => {
  const badges = []
  const minSamples = 3 // Minimum samples to show badges
  
  // Often Late badge
  if (metrics.leadTimeDeviationsCount >= minSamples && metrics.avgLeadTimeDeviation > 3) {
    badges.push({
      id: 'often_late',
      label: 'Often Late',
      color: '#ef4444',
      icon: '⏰'
    })
  }
  
  // Price Changes badge
  if (metrics.priceDeviationsCount >= minSamples) {
    const absAvgDeviation = Math.abs(metrics.avgPriceDeviation)
    if (absAvgDeviation > 5) {
      badges.push({
        id: 'price_changes',
        label: 'Price Changes',
        color: '#f59e0b',
        icon: '💰'
      })
    }
  }
  
  // Reliable badge
  if (metrics.quotesSelected >= 2 && 
      metrics.leadTimeDeviationsCount >= minSamples && 
      metrics.avgLeadTimeDeviation !== null &&
      metrics.avgLeadTimeDeviation <= 1 &&
      metrics.priceDeviationsCount >= minSamples &&
      Math.abs(metrics.avgPriceDeviation) <= 3) {
    badges.push({
      id: 'reliable',
      label: 'Reliable',
      color: '#10b981',
      icon: '✓'
    })
  }
  
  return badges
}







