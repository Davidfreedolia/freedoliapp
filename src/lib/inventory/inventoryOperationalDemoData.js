const DAY_MS = 24 * 60 * 60 * 1000

function isoDateFromNow(daysFromNow) {
  return new Date(Date.now() + (daysFromNow * DAY_MS)).toISOString()
}

function makeSalesRow(productId, averageDailySales) {
  return {
    product_id: productId,
    orders_count: Math.round(averageDailySales * 30)
  }
}

export function getInventoryOperationalDemoData() {
  const projects = [
    { id: 'demo-inventory-project-reorder', name: 'Demo Inventory Reorder', project_code: 'DEMO-INV-001' },
    { id: 'demo-inventory-project-watch-fba', name: 'Demo Inventory Amazon Inbound', project_code: 'DEMO-INV-002' },
    { id: 'demo-inventory-project-safe', name: 'Demo Inventory Healthy Coverage', project_code: 'DEMO-INV-003' },
    { id: 'demo-inventory-project-let-die', name: 'Demo Inventory Let Die', project_code: 'DEMO-INV-004' },
    { id: 'demo-inventory-project-watch-warehouse', name: 'Demo Inventory Warehouse Inbound', project_code: 'DEMO-INV-005' },
    { id: 'demo-inventory-project-buckets', name: 'Demo Inventory Mixed Buckets', project_code: 'DEMO-INV-006' }
  ]

  const byId = new Map(projects.map((project) => [project.id, project]))

  const inventory = [
    {
      id: 'demo-inventory-row-001',
      project_id: 'demo-inventory-project-reorder',
      sku: 'DEMO-INV-001',
      product_name: 'Slim Cable Organizer',
      units_amazon_fba: 12,
      units_amazon_fbm: 6,
      units_in_transit: 0,
      units_in_forwarder: 0,
      units_in_production: 0,
      total_units: 18,
      reorder_point: 40,
      isDemoSeed: true
    },
    {
      id: 'demo-inventory-row-002',
      project_id: 'demo-inventory-project-watch-fba',
      sku: 'DEMO-INV-002',
      product_name: 'Portable Label Printer',
      units_amazon_fba: 60,
      units_amazon_fbm: 12,
      units_in_transit: 28,
      units_in_forwarder: 12,
      units_in_production: 0,
      total_units: 112,
      reorder_point: 55,
      isDemoSeed: true
    },
    {
      id: 'demo-inventory-row-003',
      project_id: 'demo-inventory-project-safe',
      sku: 'DEMO-INV-003',
      product_name: 'Desktop Monitor Riser',
      units_amazon_fba: 180,
      units_amazon_fbm: 70,
      units_in_transit: 0,
      units_in_forwarder: 0,
      units_in_production: 0,
      total_units: 250,
      reorder_point: 80,
      isDemoSeed: true
    },
    {
      id: 'demo-inventory-row-004',
      project_id: 'demo-inventory-project-let-die',
      sku: 'DEMO-INV-004',
      product_name: 'Legacy Silicone Sleeve',
      units_amazon_fba: 6,
      units_amazon_fbm: 3,
      units_in_transit: 0,
      units_in_forwarder: 0,
      units_in_production: 0,
      total_units: 9,
      reorder_point: 15,
      isDemoSeed: true
    },
    {
      id: 'demo-inventory-row-005',
      project_id: 'demo-inventory-project-watch-warehouse',
      sku: 'DEMO-INV-005',
      product_name: 'Foldable Packing Station',
      units_amazon_fba: 24,
      units_amazon_fbm: 20,
      units_in_transit: 16,
      units_in_forwarder: 10,
      units_in_production: 0,
      total_units: 70,
      reorder_point: 35,
      isDemoSeed: true
    },
    {
      id: 'demo-inventory-row-006',
      project_id: 'demo-inventory-project-buckets',
      sku: 'DEMO-INV-006',
      product_name: 'Multi-Port Desk Hub',
      units_amazon_fba: 48,
      units_amazon_fbm: 22,
      units_in_transit: 14,
      units_in_forwarder: 10,
      units_in_production: 8,
      total_units: 102,
      reorder_point: 45,
      isDemoSeed: true
    }
  ].map((item) => ({
    ...item,
    project: byId.get(item.project_id)
  }))

  const salesRows = [
    makeSalesRow('demo-inventory-project-reorder', 4.2),
    makeSalesRow('demo-inventory-project-watch-fba', 3.4),
    makeSalesRow('demo-inventory-project-safe', 2.0),
    makeSalesRow('demo-inventory-project-watch-warehouse', 2.2),
    makeSalesRow('demo-inventory-project-buckets', 1.8)
  ]

  const shipmentRows = [
    {
      id: 'demo-inventory-shipment-001',
      status: 'in_transit',
      eta_estimated: isoDateFromNow(6),
      destination_type: 'amazon_fba',
      destination_country: 'ES',
      destination_amazon_fc_code: 'BCN8',
      purchase_orders: {
        project_id: 'demo-inventory-project-watch-fba'
      }
    },
    {
      id: 'demo-inventory-shipment-002',
      status: 'customs',
      eta_estimated: isoDateFromNow(11),
      destination_type: 'warehouse',
      destination_country: 'DE',
      destination_amazon_fc_code: null,
      purchase_orders: {
        project_id: 'demo-inventory-project-watch-warehouse'
      }
    }
  ]

  return {
    projects,
    inventory,
    salesRows,
    shipmentRows
  }
}
