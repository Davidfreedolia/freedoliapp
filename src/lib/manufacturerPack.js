import { computePoAmazonReady } from './amazonReady'

/**
 * Valida si es pot generar el Manufacturer Pack
 * Requereix camps crítics d'Amazon Ready per Packing List i Carton Labels
 * @param {Object} params
 * @param {Object} params.readiness - po_amazon_readiness record
 * @param {Object} params.identifiers - Product identifiers
 * @param {Object} params.options - Opcions del pack (includePackingList, includeCartonLabels, includeFnskuLabels)
 * @returns {Object} { valid: boolean, errors: string[], warnings: string[] }
 */
export const validateManufacturerPack = ({ readiness, identifiers, options = {} }) => {
  const errors = []
  const warnings = []

  const {
    includePackingList = true,
    includeCartonLabels = true,
    includeFnskuLabels = true
  } = options

  // Validacions per Packing List
  if (includePackingList || includeCartonLabels) {
    if (!readiness) {
      errors.push('Amazon readiness data not initialized. Please fill the Amazon Ready section first.')
      return { valid: false, errors, warnings }
    }

    // Camp crític: cartons_count
    if (!readiness.cartons_count || readiness.cartons_count <= 0) {
      errors.push('Cartons count is required for Packing List and Carton Labels')
    }

    // Camp crític: units_per_carton
    if (!readiness.units_per_carton || readiness.units_per_carton <= 0) {
      errors.push('Units per carton is required for Packing List and Carton Labels')
    }

    // Camps crítics per Carton Labels
    if (includeCartonLabels) {
      if (!readiness.carton_length_cm || readiness.carton_length_cm <= 0) {
        errors.push('Carton length is required for Carton Labels')
      }
      
      if (!readiness.carton_width_cm || readiness.carton_width_cm <= 0) {
        errors.push('Carton width is required for Carton Labels')
      }
      
      if (!readiness.carton_height_cm || readiness.carton_height_cm <= 0) {
        errors.push('Carton height is required for Carton Labels')
      }
      
      if (!readiness.carton_weight_kg || readiness.carton_weight_kg <= 0) {
        errors.push('Carton weight is required for Carton Labels')
      }
    } else {
      // Per Packing List sol, dimensions i weight són opcionals però recomanats
      if (!readiness.carton_length_cm || !readiness.carton_width_cm || !readiness.carton_height_cm) {
        warnings.push('Carton dimensions not set (recommended for Packing List)')
      }
      
      if (!readiness.carton_weight_kg) {
        warnings.push('Carton weight not set (recommended for Packing List)')
      }
    }
  }

  // Validacions per FNSKU Labels
  if (includeFnskuLabels) {
    if (!readiness) {
      errors.push('Amazon readiness data not initialized')
      return { valid: false, errors, warnings }
    }

    if (readiness.needs_fnsku) {
      if (!identifiers || !identifiers.fnsku) {
        errors.push('FNSKU not set in project identifiers. Please add FNSKU to the project first.')
      }
      
      if (!readiness.labels_generated_at) {
        warnings.push('FNSKU labels not generated yet. They will be generated now.')
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * Genera el nom de fitxer per a cada document
 */
export const getManufacturerPackFileNames = (poNumber) => {
  const sanitized = (poNumber || 'PO').replace(/[^a-zA-Z0-9]/g, '_')
  return {
    po: `PO_${sanitized}.pdf`,
    fnsku: `FNSKU_Labels_${sanitized}.pdf`,
    packingList: `PackingList_${sanitized}.pdf`,
    cartonLabels: `CartonLabels_${sanitized}.pdf`,
    zip: `ManufacturerPack_${sanitized}.zip`
  }
}

