/**
 * Demo Data for Freedoliapp
 * 
 * Realistic mock data for demo mode.
 * When VITE_DEMO_MODE=true, these data replace Supabase queries.
 */

// Helper to generate IDs (not used currently, but kept for future use)
// const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

// Helper to generate dates
const daysAgo = (days) => {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return date.toISOString()
}

const daysFromNow = (days) => {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString()
}

// Demo Projects (10 projects with different states)
export const demoProjects = [
  {
    id: '1a111111-1111-4111-8111-111111111111',
    name: 'Wireless Bluetooth Earbuds Pro',
    project_code: 'PR-FRDL250001',
    sku_internal: 'FRDL-EARBUDS-001',
    phase: 'live',
    decision: 'GO',
    created_at: daysAgo(120),
    updated_at: daysAgo(5),
    gtin: '1234567890123',
    fnsku: 'X001ABC123',
    profitability: {
      amazon_price: 49.99,
      cogs: 18.50,
      amazon_fees: 12.50,
      shipping: 3.00,
      profit: 16.00,
      margin: 32.0
    },
    notes: 'Best seller, high margin product',
    status: 'active'
  },
  {
    id: '1a111111-2222-4111-8111-222222222222',
    name: 'USB-C Fast Charging Cable Set',
    project_code: 'PR-FRDL250002',
    sku_internal: 'FRDL-CABLE-002',
    phase: 'production',
    decision: 'GO',
    created_at: daysAgo(90),
    updated_at: daysAgo(2),
    gtin: '1234567890124',
    fnsku: null,
    profitability: {
      amazon_price: 19.99,
      cogs: 6.50,
      amazon_fees: 5.00,
      shipping: 2.00,
      profit: 6.49,
      margin: 32.5
    },
    notes: 'Waiting for FNSKU assignment',
    status: 'active'
  },
  {
    id: '1a111111-3333-4111-8111-333333333333',
    name: 'Smart Watch Band Leather',
    project_code: 'PR-FRDL250003',
    sku_internal: 'FRDL-BAND-003',
    phase: 'research',
    decision: null,
    created_at: daysAgo(30),
    updated_at: daysAgo(1),
    gtin: null,
    fnsku: null,
    profitability: {
      amazon_price: 29.99,
      cogs: 12.00,
      amazon_fees: 7.50,
      shipping: 2.50,
      profit: 8.00,
      margin: 26.7
    },
    notes: 'Need supplier quotes comparison',
    status: 'active'
  },
  {
    id: '1a111111-4444-4111-8111-444444444444',
    name: 'Phone Stand Adjustable',
    project_code: 'PR-FRDL250004',
    sku_internal: 'FRDL-STAND-004',
    phase: 'shipping',
    decision: 'GO',
    created_at: daysAgo(60),
    updated_at: daysAgo(3),
    gtin: '1234567890125',
    fnsku: 'X002DEF456',
    profitability: {
      amazon_price: 24.99,
      cogs: 9.00,
      amazon_fees: 6.25,
      shipping: 2.00,
      profit: 7.74,
      margin: 31.0
    },
    notes: 'First shipment in transit',
    status: 'active'
  },
  {
    id: '1a111111-5555-4111-8111-555555555555',
    name: 'Laptop Cooling Pad RGB',
    project_code: 'PR-FRDL250005',
    sku_internal: 'FRDL-PAD-005',
    phase: 'production',
    decision: 'RISKY',
    created_at: daysAgo(45),
    updated_at: daysAgo(7),
    gtin: '1234567890126',
    fnsku: null,
    profitability: {
      amazon_price: 39.99,
      cogs: 22.00,
      amazon_fees: 10.00,
      shipping: 3.50,
      profit: 4.49,
      margin: 11.2
    },
    notes: 'Low margin, high competition',
    status: 'active'
  },
  {
    id: '1a111111-6666-4111-8111-666666666666',
    name: 'Car Phone Mount Magnetic',
    project_code: 'PR-FRDL250006',
    sku_internal: 'FRDL-MOUNT-006',
    phase: 'research',
    decision: null,
    created_at: daysAgo(15),
    updated_at: daysAgo(0),
    gtin: null,
    fnsku: null,
    profitability: {
      amazon_price: 16.99,
      cogs: 5.50,
      amazon_fees: 4.25,
      shipping: 1.50,
      profit: 5.74,
      margin: 33.8
    },
    notes: 'Good margin potential',
    status: 'active'
  },
  {
    id: '1a111111-7777-4111-8111-777777777777',
    name: 'Wireless Mouse Ergonomic',
    project_code: 'PR-FRDL250007',
    sku_internal: 'FRDL-MOUSE-007',
    phase: 'listing',
    decision: 'GO',
    created_at: daysAgo(75),
    updated_at: daysAgo(4),
    gtin: '1234567890127',
    fnsku: 'X003GHI789',
    profitability: {
      amazon_price: 34.99,
      cogs: 14.00,
      amazon_fees: 8.75,
      shipping: 2.50,
      profit: 9.74,
      margin: 27.8
    },
    notes: 'Ready for launch',
    status: 'active'
  },
  {
    id: '1a111111-8888-4111-8111-888888888888',
    name: 'Tablet Stand Foldable',
    project_code: 'PR-FRDL250008',
    sku_internal: 'FRDL-STAND-008',
    phase: 'research',
    decision: null,
    created_at: daysAgo(20),
    updated_at: daysAgo(2),
    gtin: null,
    fnsku: null,
    profitability: {
      amazon_price: 14.99,
      cogs: 4.00,
      amazon_fees: 3.75,
      shipping: 1.00,
      profit: 6.24,
      margin: 41.6
    },
    notes: 'Excellent margin, need samples',
    status: 'active'
  },
  {
    id: '1a111111-9999-4111-8111-999999999999',
    name: 'HDMI Cable 4K 10ft',
    project_code: 'PR-FRDL250009',
    sku_internal: 'FRDL-CABLE-009',
    phase: 'production',
    decision: 'GO',
    created_at: daysAgo(50),
    updated_at: daysAgo(1),
    gtin: '1234567890128',
    fnsku: null,
    profitability: {
      amazon_price: 12.99,
      cogs: 3.50,
      amazon_fees: 3.25,
      shipping: 1.00,
      profit: 5.24,
      margin: 40.3
    },
    notes: 'High volume, low margin',
    status: 'active'
  },
  {
    id: '1a111111-aaaa-4111-8111-aaaaaaaaaaaa',
    name: 'Gaming Headset RGB',
    project_code: 'PR-FRDL250010',
    sku_internal: 'FRDL-HEADSET-010',
    phase: 'research',
    decision: 'DISCARDED',
    created_at: daysAgo(100),
    updated_at: daysAgo(30),
    gtin: null,
    fnsku: null,
    profitability: {
      amazon_price: 79.99,
      cogs: 45.00,
      amazon_fees: 20.00,
      shipping: 5.00,
      profit: 9.99,
      margin: 12.5
    },
    notes: 'Discarded: too competitive, low margin',
    status: 'discarded'
  }
]

// Demo Purchase Orders (más POs para mostrar diferentes estados)
export const demoPurchaseOrders = [
  {
    id: '2f8f2b4a-1111-4a7b-9c1a-111111111111',
    po_number: 'PO-2024-001',
    project_id: '1a111111-1111-4111-8111-111111111111',
    supplier_id: 'demo-supplier-1',
    status: 'received',
    created_at: daysAgo(60),
    updated_at: daysAgo(10),
    total_amount: 1850.00,
    currency: 'EUR',
    items: [
      { sku: 'FRDL-EARBUDS-001', quantity: 100, unit_price: 18.50 }
    ],
    tracking_number: 'TRACK123456',
    eta_date: daysAgo(5),
    order_date: daysAgo(60),
    expected_delivery_date: daysAgo(5)
  },
  {
    id: '2f8f2b4a-2222-4a7b-9c1a-222222222222',
    po_number: 'PO-2024-002',
    project_id: '1a111111-2222-4111-8111-222222222222',
    supplier_id: 'demo-supplier-2',
    status: 'in_transit',
    created_at: daysAgo(30),
    updated_at: daysAgo(2),
    total_amount: 650.00,
    currency: 'EUR',
    items: [
      { sku: 'FRDL-CABLE-002', quantity: 100, unit_price: 6.50 }
    ],
    tracking_number: 'TRACK789012',
    eta_date: daysFromNow(5),
    order_date: daysAgo(30),
    expected_delivery_date: daysFromNow(5)
  },
  {
    id: '2f8f2b4a-3333-4a7b-9c1a-333333333333',
    po_number: 'PO-2024-003',
    project_id: '1a111111-4444-4111-8111-444444444444',
    supplier_id: 'demo-supplier-3',
    status: 'in_transit',
    created_at: daysAgo(20),
    updated_at: daysAgo(1),
    total_amount: 900.00,
    currency: 'EUR',
    items: [
      { sku: 'FRDL-STAND-004', quantity: 100, unit_price: 9.00 }
    ],
    tracking_number: 'TRACK345678',
    eta_date: daysFromNow(3),
    order_date: daysAgo(20),
    expected_delivery_date: daysFromNow(3)
  },
  {
    id: '2f8f2b4a-4444-4a7b-9c1a-444444444444',
    po_number: 'PO-2024-004',
    project_id: '1a111111-5555-4111-8111-555555555555',
    supplier_id: 'demo-supplier-1',
    status: 'waiting_manufacturer',
    created_at: daysAgo(15),
    updated_at: daysAgo(7),
    total_amount: 2200.00,
    currency: 'EUR',
    items: [
      { sku: 'FRDL-PAD-005', quantity: 100, unit_price: 22.00 }
    ],
    tracking_number: null,
    eta_date: null,
    order_date: daysAgo(15),
    expected_delivery_date: daysFromNow(20)
  },
  {
    id: '2f8f2b4a-5555-4a7b-9c1a-555555555555',
    po_number: 'PO-2024-005',
    project_id: '1a111111-7777-4111-8111-777777777777',
    supplier_id: 'demo-supplier-2',
    status: 'confirmed',
    created_at: daysAgo(10),
    updated_at: daysAgo(4),
    total_amount: 1400.00,
    currency: 'EUR',
    items: [
      { sku: 'FRDL-MOUSE-007', quantity: 100, unit_price: 14.00 }
    ],
    tracking_number: null,
    eta_date: daysFromNow(15),
    order_date: daysAgo(10),
    expected_delivery_date: daysFromNow(15)
  },
  {
    id: '2f8f2b4a-6666-4a7b-9c1a-666666666666',
    po_number: 'PO-2024-006',
    project_id: '1a111111-9999-4111-8111-999999999999',
    supplier_id: 'demo-supplier-3',
    status: 'waiting_manufacturer',
    created_at: daysAgo(8),
    updated_at: daysAgo(1),
    total_amount: 350.00,
    currency: 'EUR',
    items: [
      { sku: 'FRDL-CABLE-009', quantity: 100, unit_price: 3.50 }
    ],
    tracking_number: null,
    eta_date: null,
    order_date: daysAgo(8),
    expected_delivery_date: daysFromNow(12)
  }
]

// Demo Suppliers
export const demoSuppliers = [
  {
    id: 'demo-supplier-1',
    name: 'Shenzhen Tech Co.',
    contact_name: 'Li Wei',
    email: 'liwei@shenzhentech.com',
    phone: '+86 138 0013 8000',
    address: 'Shenzhen, China',
    rating: 4.5,
    notes: 'Reliable, good quality'
  },
  {
    id: 'demo-supplier-2',
    name: 'Guangzhou Electronics Ltd',
    contact_name: 'Zhang Ming',
    email: 'zhang@guangzhou-elec.com',
    phone: '+86 139 0013 9000',
    address: 'Guangzhou, China',
    rating: 4.2,
    notes: 'Fast shipping, competitive prices'
  },
  {
    id: 'demo-supplier-3',
    name: 'Dongguan Manufacturing',
    contact_name: 'Wang Fang',
    email: 'wang@dongguan-mfg.com',
    phone: '+86 137 0013 7000',
    address: 'Dongguan, China',
    rating: 4.0,
    notes: 'Good for small orders'
  }
]

// Demo Tasks (más tasks para mostrar diferentes estados)
export const demoTasks = [
  {
    id: 'demo-task-1',
    project_id: '1a111111-3333-4111-8111-333333333333',
    entity_type: 'project',
    entity_id: '1a111111-3333-4111-8111-333333333333',
    title: 'Compare supplier quotes',
    description: 'Get quotes from 3 suppliers for leather bands',
    status: 'open',
    priority: 'high',
    due_date: daysFromNow(7),
    created_at: daysAgo(5),
    notes: 'Waiting for Alibaba response'
  },
  {
    id: 'demo-task-2',
    project_id: '1a111111-2222-4111-8111-222222222222',
    entity_type: 'project',
    entity_id: '1a111111-2222-4111-8111-222222222222',
    title: 'Request FNSKU from Amazon',
    description: 'Submit FNSKU request for USB-C cables',
    status: 'open',
    priority: 'high',
    due_date: daysFromNow(3),
    created_at: daysAgo(2),
    notes: 'Urgent - needed for production'
  },
  {
    id: 'demo-task-3',
    project_id: '1a111111-6666-4111-8111-666666666666',
    entity_type: 'project',
    entity_id: '1a111111-6666-4111-8111-666666666666',
    title: 'Order samples',
    description: 'Order 5 samples of magnetic car mount',
    status: 'open',
    priority: 'medium',
    due_date: daysFromNow(14),
    created_at: daysAgo(1),
    notes: 'Check quality before GO decision'
  },
  {
    id: 'demo-task-4',
    project_id: '1a111111-8888-4111-8111-888888888888',
    entity_type: 'project',
    entity_id: '1a111111-8888-4111-8111-888888888888',
    title: 'Review profitability',
    description: 'Final review before GO decision',
    status: 'open',
    priority: 'medium',
    due_date: daysFromNow(10),
    created_at: daysAgo(3),
    notes: 'Excellent margin potential'
  },
  {
    id: 'demo-task-5',
    project_id: '1a111111-1111-4111-8111-111111111111',
    entity_type: 'project',
    entity_id: '1a111111-1111-4111-8111-111111111111',
    title: 'Replenish inventory',
    description: 'Order more earbuds, stock running low',
    status: 'done',
    priority: 'high',
    due_date: daysAgo(5),
    created_at: daysAgo(20),
    completed_at: daysAgo(5),
    notes: 'PO-2024-001 created'
  },
  {
    id: 'demo-task-6',
    project_id: '1a111111-4444-4111-8111-444444444444',
    entity_type: 'project',
    entity_id: '1a111111-4444-4111-8111-444444444444',
    title: 'Track shipment',
    description: 'Monitor PO-2024-003 in transit',
    status: 'open',
    priority: 'medium',
    due_date: daysFromNow(3),
    created_at: daysAgo(1),
    notes: 'ETA in 3 days'
  },
  {
    id: 'demo-task-7',
    project_id: null,
    entity_type: 'project',
    entity_id: null,
    title: 'Review Q4 targets',
    description: 'Check progress on 15 new products goal',
    status: 'open',
    priority: 'low',
    due_date: daysFromNow(30),
    created_at: daysAgo(10),
    notes: 'Global task'
  }
]

// Demo Sticky Notes (más notes para mostrar diferentes estados)
export const demoStickyNotes = [
  {
    id: 'demo-note-1',
    project_id: null,
    content: 'Remember to check competitor prices weekly',
    color: 'yellow',
    status: 'open',
    pinned: true,
    created_at: daysAgo(10),
    title: 'Weekly reminder'
  },
  {
    id: 'demo-note-2',
    project_id: '1a111111-3333-4111-8111-333333333333',
    content: 'Waiting for supplier response on leather samples',
    color: 'blue',
    status: 'open',
    pinned: false,
    created_at: daysAgo(5),
    title: 'Supplier follow-up'
  },
  {
    id: 'demo-note-3',
    project_id: null,
    content: 'Q4 target: 15 new products launched',
    color: 'green',
    status: 'open',
    pinned: true,
    created_at: daysAgo(30),
    title: 'Q4 Goals'
  },
  {
    id: 'demo-note-4',
    project_id: '1a111111-5555-4111-8111-555555555555',
    content: 'Low margin warning - consider price increase',
    color: 'red',
    status: 'open',
    pinned: false,
    created_at: daysAgo(7),
    title: 'Margin alert'
  },
  {
    id: 'demo-note-5',
    project_id: '1a111111-2222-4111-8111-222222222222',
    content: 'FNSKU request submitted, waiting for Amazon response',
    color: 'yellow',
    status: 'open',
    pinned: false,
    created_at: daysAgo(2),
    title: 'FNSKU pending'
  },
  {
    id: 'demo-note-6',
    project_id: null,
    content: 'Review all Research phase projects this week',
    color: 'blue',
    status: 'open',
    pinned: false,
    created_at: daysAgo(1),
    title: 'Weekly review'
  }
]

// Demo Expenses (más expenses para mostrar diferentes categorías y estados)
export const demoExpenses = [
  {
    id: 'demo-expense-1',
    project_id: '1a111111-1111-4111-8111-111111111111',
    amount: 1850.00,
    currency: 'EUR',
    expense_date: daysAgo(60),
    category_id: 'demo-cat-po',
    description: 'PO-2024-001 - Earbuds production',
    payment_status: 'paid',
    reference_number: 'PO-2024-001'
  },
  {
    id: 'demo-expense-2',
    project_id: '1a111111-2222-4111-8111-222222222222',
    amount: 650.00,
    currency: 'EUR',
    expense_date: daysAgo(30),
    category_id: 'demo-cat-po',
    description: 'PO-2024-002 - USB-C cables',
    payment_status: 'pending',
    reference_number: 'PO-2024-002'
  },
  {
    id: 'demo-expense-3',
    project_id: null,
    amount: 50.00,
    currency: 'EUR',
    expense_date: daysAgo(15),
    category_id: 'demo-cat-tools',
    description: 'Amazon seller tools subscription',
    payment_status: 'paid'
  },
  {
    id: 'demo-expense-4',
    project_id: '1a111111-4444-4111-8111-444444444444',
    amount: 900.00,
    currency: 'EUR',
    expense_date: daysAgo(20),
    category_id: 'demo-cat-po',
    description: 'PO-2024-003 - Phone Stand production',
    payment_status: 'pending',
    reference_number: 'PO-2024-003'
  },
  {
    id: 'demo-expense-5',
    project_id: '1a111111-3333-4111-8111-333333333333',
    amount: 120.00,
    currency: 'EUR',
    expense_date: daysAgo(10),
    category_id: 'demo-cat-samples',
    description: 'Leather band samples (5 units)',
    payment_status: 'paid'
  },
  {
    id: 'demo-expense-6',
    project_id: null,
    amount: 200.00,
    currency: 'EUR',
    expense_date: daysAgo(5),
    category_id: 'demo-cat-marketing',
    description: 'PPC campaign - January',
    payment_status: 'paid'
  }
]

// Demo Incomes (más incomes para mostrar diferentes proyectos)
export const demoIncomes = [
  {
    id: 'demo-income-1',
    project_id: '1a111111-1111-4111-8111-111111111111',
    amount: 4999.00,
    currency: 'EUR',
    income_date: daysAgo(20),
    description: 'Earbuds sales - January',
    category_id: 'demo-cat-sales'
  },
  {
    id: 'demo-income-2',
    project_id: '1a111111-1111-4111-8111-111111111111',
    amount: 3500.00,
    currency: 'EUR',
    income_date: daysAgo(10),
    description: 'Earbuds sales - February',
    category_id: 'demo-cat-sales'
  },
  {
    id: 'demo-income-3',
    project_id: '1a111111-4444-4111-8111-444444444444',
    amount: 2499.00,
    currency: 'EUR',
    income_date: daysAgo(5),
    description: 'Phone Stand sales - First week',
    category_id: 'demo-cat-sales'
  },
  {
    id: 'demo-income-4',
    project_id: '1a111111-2222-4111-8111-222222222222',
    amount: 1999.00,
    currency: 'EUR',
    income_date: daysAgo(2),
    description: 'USB-C cables sales',
    category_id: 'demo-cat-sales'
  }
]

// Demo Finance Categories
export const demoFinanceCategories = [
  {
    id: 'demo-cat-po',
    name: 'Purchase Orders',
    type: 'expense',
    color: '#ef4444',
    icon: 'ShoppingCart',
    sort_order: 1,
    is_system: true
  },
  {
    id: 'demo-cat-samples',
    name: 'Samples',
    type: 'expense',
    color: '#f59e0b',
    icon: 'Package',
    sort_order: 2,
    is_system: false
  },
  {
    id: 'demo-cat-marketing',
    name: 'Marketing',
    type: 'expense',
    color: '#8b5cf6',
    icon: 'Megaphone',
    sort_order: 3,
    is_system: false
  },
  {
    id: 'demo-cat-tools',
    name: 'Tools & Software',
    type: 'expense',
    color: '#6b7280',
    icon: 'Monitor',
    sort_order: 4,
    is_system: false
  },
  {
    id: 'demo-cat-sales',
    name: 'Sales',
    type: 'income',
    color: '#10b981',
    icon: 'TrendingUp',
    sort_order: 1,
    is_system: true
  }
]

// Demo Supplier Price Estimates (Quick Quotes)
export const demoSupplierPriceEstimates = [
  {
    id: 'demo-estimate-1',
    project_id: '1a111111-3333-4111-8111-333333333333',
    source: '1688',
    price: 12.50,
    currency: 'CNY',
    moq: 100,
    notes: 'Good quality, fast shipping',
    created_at: daysAgo(5)
  },
  {
    id: 'demo-estimate-2',
    project_id: '1a111111-3333-4111-8111-333333333333',
    source: 'Alibaba',
    price: 13.20,
    currency: 'USD',
    moq: 50,
    notes: 'Premium supplier, longer lead time',
    created_at: daysAgo(4)
  },
  {
    id: 'demo-estimate-3',
    project_id: '1a111111-3333-4111-8111-333333333333',
    source: 'Zentrada',
    price: 11.80,
    currency: 'EUR',
    moq: 200,
    notes: 'Best price, higher MOQ',
    created_at: daysAgo(3)
  },
  {
    id: 'demo-estimate-4',
    project_id: '1a111111-6666-4111-8111-666666666666',
    source: '1688',
    price: 5.80,
    currency: 'CNY',
    moq: 100,
    notes: 'Standard quality',
    created_at: daysAgo(2)
  },
  {
    id: 'demo-estimate-5',
    project_id: '1a111111-6666-4111-8111-666666666666',
    source: 'Alibaba',
    price: 6.20,
    currency: 'USD',
    moq: 50,
    notes: 'Better quality option',
    created_at: daysAgo(1)
  },
  {
    id: 'demo-estimate-6',
    project_id: '1a111111-8888-4111-8111-888888888888',
    source: '1688',
    price: 4.20,
    currency: 'CNY',
    moq: 100,
    notes: 'Excellent margin potential',
    created_at: daysAgo(3)
  }
]

// Helper to get project by ID
export const getDemoProject = (id) => {
  return demoProjects.find(p => p.id === id)
}

// Helper to get POs by project
export const getDemoPOsByProject = (projectId) => {
  return demoPurchaseOrders.filter(po => po.project_id === projectId)
}

// Helper to get tasks by project
export const getDemoTasksByProject = (projectId) => {
  return demoTasks.filter(t => t.project_id === projectId)
}

// Helper to get notes by project (null = global)
export const getDemoNotesByProject = (projectId) => {
  return demoStickyNotes.filter(n => n.project_id === projectId)
}

// Helper to get global notes
export const getDemoGlobalNotes = () => {
  return demoStickyNotes.filter(n => n.project_id === null)
}

// Helper to get supplier price estimates by project
export const getDemoSupplierPriceEstimatesByProject = (projectId) => {
  return demoSupplierPriceEstimates.filter(e => e.project_id === projectId)
}

// Helper to get finance categories
export const getDemoFinanceCategories = () => {
  return demoFinanceCategories
}

// Demo Calendar Events (derived from tasks and shipments)
export const demoCalendarEvents = [
  {
    id: 'demo-event-1',
    title: 'Compare supplier quotes',
    start: daysFromNow(7),
    end: daysFromNow(7),
    type: 'task',
    entity_type: 'project',
    entity_id: '1a111111-3333-4111-8111-333333333333',
    project_id: '1a111111-3333-4111-8111-333333333333',
    status: 'open',
    priority: 'high',
    resource: demoTasks.find(t => t.id === 'demo-task-1')
  },
  {
    id: 'demo-event-2',
    title: 'Request FNSKU from Amazon',
    start: daysFromNow(3),
    end: daysFromNow(3),
    type: 'task',
    entity_type: 'project',
    entity_id: '1a111111-2222-4111-8111-222222222222',
    project_id: '1a111111-2222-4111-8111-222222222222',
    status: 'open',
    priority: 'high',
    resource: demoTasks.find(t => t.id === 'demo-task-2')
  },
  {
    id: 'demo-event-3',
    title: 'PO-2024-002 ETA',
    start: daysFromNow(5),
    end: daysFromNow(5),
    type: 'shipment',
    entity_type: 'purchase_order',
    entity_id: '2f8f2b4a-2222-4a7b-9c1a-222222222222',
    project_id: '1a111111-2222-4111-8111-222222222222',
    status: 'in_transit',
    resource: demoPurchaseOrders.find(po => po.id === '2f8f2b4a-2222-4a7b-9c1a-222222222222')
  },
  {
    id: 'demo-event-4',
    title: 'PO-2024-003 ETA',
    start: daysFromNow(3),
    end: daysFromNow(3),
    type: 'shipment',
    entity_type: 'purchase_order',
    entity_id: '2f8f2b4a-3333-4a7b-9c1a-333333333333',
    project_id: '1a111111-4444-4111-8111-444444444444',
    status: 'in_transit',
    resource: demoPurchaseOrders.find(po => po.id === '2f8f2b4a-3333-4a7b-9c1a-333333333333')
  },
  {
    id: 'demo-event-5',
    title: 'Order samples',
    start: daysFromNow(14),
    end: daysFromNow(14),
    type: 'task',
    entity_type: 'project',
    entity_id: '1a111111-6666-4111-8111-666666666666',
    project_id: '1a111111-6666-4111-8111-666666666666',
    status: 'open',
    priority: 'medium',
    resource: demoTasks.find(t => t.id === 'demo-task-3')
  },
  {
    id: 'demo-event-6',
    title: 'Review profitability',
    start: daysFromNow(10),
    end: daysFromNow(10),
    type: 'task',
    entity_type: 'project',
    entity_id: '1a111111-8888-4111-8111-888888888888',
    project_id: '1a111111-8888-4111-8111-888888888888',
    status: 'open',
    priority: 'medium',
    resource: demoTasks.find(t => t.id === 'demo-task-4')
  },
  {
    id: 'demo-event-7',
    title: 'Track shipment',
    start: daysFromNow(3),
    end: daysFromNow(3),
    type: 'task',
    entity_type: 'project',
    entity_id: '1a111111-4444-4111-8111-444444444444',
    project_id: '1a111111-4444-4111-8111-444444444444',
    status: 'open',
    priority: 'medium',
    resource: demoTasks.find(t => t.id === 'demo-task-6')
  }
]

// Demo Manufacturer Pack Data
export const demoManufacturerPackData = {
  '2f8f2b4a-1111-4a7b-9c1a-111111111111': {
    generated: true,
    generated_at: daysAgo(10),
    sent: true,
    sent_at: daysAgo(8),
    includes: {
      po: true,
      fnsku_labels: true,
      packing_list: true,
      carton_labels: true
    }
  },
  '2f8f2b4a-4444-4a7b-9c1a-444444444444': {
    generated: true,
    generated_at: daysAgo(5),
    sent: false,
    sent_at: null,
    includes: {
      po: true,
      fnsku_labels: true,
      packing_list: true,
      carton_labels: false
    }
  }
}

// Helper to enrich projects with related data
export const enrichDemoProject = (project) => {
  return {
    ...project,
    purchase_orders: getDemoPOsByProject(project.id),
    tasks: getDemoTasksByProject(project.id),
    notes: getDemoNotesByProject(project.id),
    expenses: demoExpenses.filter(e => e.project_id === project.id),
    incomes: demoIncomes.filter(i => i.project_id === project.id),
    supplier_price_estimates: getDemoSupplierPriceEstimatesByProject(project.id)
  }
}

