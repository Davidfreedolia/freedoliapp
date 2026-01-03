/**
 * Help Content Structure
 * 
 * Hierarchical structure for contextual help and user manual.
 * Actual text comes from i18n translations (ca.json, en.json, es.json)
 * 
 * Structure:
 * - sections: Main sections (Dashboard, Projects, Orders, Finances, etc.)
 * - fields: Specific fields within sections (profitability.cogs, po.fba_fee, etc.)
 */

export const helpKeys = {
  // ============================================
  // PROFITABILITY SECTION
  // ============================================
  profitability: {
    title: 'help.profitability.title',
    short: 'help.profitability.short',
    long: 'help.profitability.long',
    fields: {
      selling_price: {
        title: 'help.profitability.selling_price.title',
        short: 'help.profitability.selling_price.short',
        long: 'help.profitability.selling_price.long',
        example: 'help.profitability.selling_price.example'
      },
      cogs: {
        title: 'help.profitability.cogs.title',
        short: 'help.profitability.cogs.short',
        long: 'help.profitability.cogs.long',
        example: 'help.profitability.cogs.example'
      },
      shipping_per_unit: {
        title: 'help.profitability.shipping_per_unit.title',
        short: 'help.profitability.shipping_per_unit.short',
        long: 'help.profitability.shipping_per_unit.long',
        example: 'help.profitability.shipping_per_unit.example'
      },
      referral_fee_percent: {
        title: 'help.profitability.referral_fee_percent.title',
        short: 'help.profitability.referral_fee_percent.short',
        long: 'help.profitability.referral_fee_percent.long',
        example: 'help.profitability.referral_fee_percent.example'
      },
      fba_fee_per_unit: {
        title: 'help.profitability.fba_fee_per_unit.title',
        short: 'help.profitability.fba_fee_per_unit.short',
        long: 'help.profitability.fba_fee_per_unit.long',
        example: 'help.profitability.fba_fee_per_unit.example'
      },
      ppc_per_unit: {
        title: 'help.profitability.ppc_per_unit.title',
        short: 'help.profitability.ppc_per_unit.short',
        long: 'help.profitability.ppc_per_unit.long',
        example: 'help.profitability.ppc_per_unit.example'
      },
      other_costs_per_unit: {
        title: 'help.profitability.other_costs_per_unit.title',
        short: 'help.profitability.other_costs_per_unit.short',
        long: 'help.profitability.other_costs_per_unit.long',
        example: 'help.profitability.other_costs_per_unit.example'
      },
      fixed_costs: {
        title: 'help.profitability.fixed_costs.title',
        short: 'help.profitability.fixed_costs.short',
        long: 'help.profitability.fixed_costs.long',
        example: 'help.profitability.fixed_costs.example'
      },
      margin: {
        title: 'help.profitability.margin.title',
        short: 'help.profitability.margin.short',
        long: 'help.profitability.margin.long',
        example: 'help.profitability.margin.example'
      },
      roi: {
        title: 'help.profitability.roi.title',
        short: 'help.profitability.roi.short',
        long: 'help.profitability.roi.long',
        example: 'help.profitability.roi.example'
      }
    }
  },

  // ============================================
  // AMAZON READINESS SECTION
  // ============================================
  amazon_ready: {
    title: 'help.amazon_ready.title',
    short: 'help.amazon_ready.short',
    long: 'help.amazon_ready.long',
    fields: {
      fnsku: {
        title: 'help.amazon_ready.fnsku.title',
        short: 'help.amazon_ready.fnsku.short',
        long: 'help.amazon_ready.fnsku.long',
        example: 'help.amazon_ready.fnsku.example'
      },
      gtin: {
        title: 'help.amazon_ready.gtin.title',
        short: 'help.amazon_ready.gtin.short',
        long: 'help.amazon_ready.gtin.long',
        example: 'help.amazon_ready.gtin.example'
      },
      units_per_carton: {
        title: 'help.amazon_ready.units_per_carton.title',
        short: 'help.amazon_ready.units_per_carton.short',
        long: 'help.amazon_ready.units_per_carton.long',
        example: 'help.amazon_ready.units_per_carton.example'
      },
      cartons_per_pallet: {
        title: 'help.amazon_ready.cartons_per_pallet.title',
        short: 'help.amazon_ready.cartons_per_pallet.short',
        long: 'help.amazon_ready.cartons_per_pallet.long',
        example: 'help.amazon_ready.cartons_per_pallet.example'
      }
    }
  },

  // ============================================
  // PURCHASE ORDERS SECTION
  // ============================================
  purchase_orders: {
    title: 'help.purchase_orders.title',
    short: 'help.purchase_orders.short',
    long: 'help.purchase_orders.long',
    fields: {
      po_number: {
        title: 'help.purchase_orders.po_number.title',
        short: 'help.purchase_orders.po_number.short',
        long: 'help.purchase_orders.po_number.long'
      },
      status: {
        title: 'help.purchase_orders.status.title',
        short: 'help.purchase_orders.status.short',
        long: 'help.purchase_orders.status.long'
      },
      tracking_number: {
        title: 'help.purchase_orders.tracking_number.title',
        short: 'help.purchase_orders.tracking_number.short',
        long: 'help.purchase_orders.tracking_number.long'
      },
      eta_date: {
        title: 'help.purchase_orders.eta_date.title',
        short: 'help.purchase_orders.eta_date.short',
        long: 'help.purchase_orders.eta_date.long'
      }
    }
  },

  // ============================================
  // RESEARCH SECTION
  // ============================================
  research: {
    title: 'help.research.title',
    short: 'help.research.short',
    long: 'help.research.long',
    fields: {
      asin: {
        title: 'help.research.asin.title',
        short: 'help.research.asin.short',
        long: 'help.research.asin.long',
        example: 'help.research.asin.example'
      },
      supplier_quotes: {
        title: 'help.research.supplier_quotes.title',
        short: 'help.research.supplier_quotes.short',
        long: 'help.research.supplier_quotes.long'
      },
      decision: {
        title: 'help.research.decision.title',
        short: 'help.research.decision.short',
        long: 'help.research.decision.long'
      }
    }
  },

  // ============================================
  // FINANCES SECTION
  // ============================================
  finances: {
    title: 'help.finances.title',
    short: 'help.finances.short',
    long: 'help.finances.long',
    fields: {
      expenses: {
        title: 'help.finances.expenses.title',
        short: 'help.finances.expenses.short',
        long: 'help.finances.expenses.long'
      },
      incomes: {
        title: 'help.finances.incomes.title',
        short: 'help.finances.incomes.short',
        long: 'help.finances.incomes.long'
      },
      categories: {
        title: 'help.finances.categories.title',
        short: 'help.finances.categories.short',
        long: 'help.finances.categories.long'
      },
      recurring_expenses: {
        title: 'help.finances.recurring_expenses.title',
        short: 'help.finances.recurring_expenses.short',
        long: 'help.finances.recurring_expenses.long'
      }
    }
  },

  // ============================================
  // DASHBOARD SECTION
  // ============================================
  dashboard: {
    title: 'help.dashboard.title',
    short: 'help.dashboard.short',
    long: 'help.dashboard.long',
    fields: {
      widgets: {
        title: 'help.dashboard.widgets.title',
        short: 'help.dashboard.widgets.short',
        long: 'help.dashboard.widgets.long'
      },
      sticky_notes: {
        title: 'help.dashboard.sticky_notes.title',
        short: 'help.dashboard.sticky_notes.short',
        long: 'help.dashboard.sticky_notes.long'
      },
      tasks: {
        title: 'help.dashboard.tasks.title',
        short: 'help.dashboard.tasks.short',
        long: 'help.dashboard.tasks.long'
      }
    }
  }
}

/**
 * Get help content by key
 * @param {string} key - Help key (e.g., 'profitability.cogs')
 * @returns {object|null} Help content object or null if not found
 */
export const getHelpContent = (key) => {
  const parts = key.split('.')
  let current = helpKeys

  for (const part of parts) {
    if (current[part]) {
      current = current[part]
    } else if (current.fields && current.fields[part]) {
      return current.fields[part]
    } else {
      return null
    }
  }

  return current
}

/**
 * Get all sections for manual view
 * @returns {array} Array of section objects
 */
export const getAllSections = () => {
  return Object.keys(helpKeys).map(key => ({
    key,
    ...helpKeys[key]
  }))
}





