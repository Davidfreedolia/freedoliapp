/**
 * Helper per calcular si una Purchase Order està "Amazon Ready"
 * @param {Object} params
 * @param {Object} params.po - Purchase Order object
 * @param {Object} params.identifiers - Product identifiers (GTIN, ASIN, FNSKU)
 * @param {Object} params.readiness - po_amazon_readiness record
 * @returns {Object} { ready: boolean, missing: string[] }
 */
export const computePoAmazonReady = ({ po, identifiers, readiness }) => {
  const missing = []
  
  // Si no hi ha readiness record, tot falta
  if (!readiness) {
    return {
      ready: false,
      missing: ['Amazon readiness data not initialized']
    }
  }

  // 1. FNSKU Labels (si needs_fnsku = true)
  if (readiness.needs_fnsku) {
    // Requereix FNSKU al projecte
    if (!identifiers || !identifiers.fnsku) {
      missing.push('FNSKU not set in project identifiers')
    }
    
    // Requereix etiquetes generades
    if (!readiness.labels_generated_at) {
      missing.push('FNSKU labels not generated')
    } else if (!readiness.labels_qty || readiness.labels_qty <= 0) {
      missing.push('FNSKU labels quantity must be > 0')
    }
  }

  // 2. Packaging mínim (sempre requerit)
  if (!readiness.units_per_carton || readiness.units_per_carton <= 0) {
    missing.push('Units per carton not set')
  }
  
  if (!readiness.cartons_count || readiness.cartons_count <= 0) {
    missing.push('Cartons count not set')
  }
  
  if (!readiness.carton_length_cm || readiness.carton_length_cm <= 0) {
    missing.push('Carton length (cm) not set')
  }
  
  if (!readiness.carton_width_cm || readiness.carton_width_cm <= 0) {
    missing.push('Carton width (cm) not set')
  }
  
  if (!readiness.carton_height_cm || readiness.carton_height_cm <= 0) {
    missing.push('Carton height (cm) not set')
  }
  
  if (!readiness.carton_weight_kg || readiness.carton_weight_kg <= 0) {
    missing.push('Carton weight (kg) not set')
  }

  return {
    ready: missing.length === 0,
    missing
  }
}








