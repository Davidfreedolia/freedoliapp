/**
 * Column-name dictionaries for known import sources.
 *
 * Each dictionary maps canonical FreedoliApp fields to arrays of possible source
 * column names. Matching is case-insensitive with fuzzy fallback (see columnMapper).
 *
 * Canonical fields (target):
 *   Identifiers
 *     asin, sku, product_name, brand, category
 *   Sales / units
 *     units_sold, orders, revenue
 *   Amazon fees
 *     fba_fees, referral_fees, storage_fee, other_fees
 *   Costs
 *     cogs, ppc_cost, shipping, promotions, refunds, other_expenses
 *   Inventory
 *     units_in_stock, fba_stock, warehouse_stock, in_transit,
 *     daily_velocity, days_of_stock, reorder_date, reorder_qty,
 *     lead_time, moq
 *   Pricing / margin
 *     selling_price, buy_cost, price, net_profit, roi, margin_pct
 *   Market / research
 *     bsr, reviews_count, rating, search_volume, monthly_revenue, monthly_sales
 *   Invoicing / accounting
 *     invoice_number, client, supplier, nif, concept, base_amount, vat, total,
 *     status, payment_method, account
 *   Project / task
 *     task_id, section, assignee, due_date, start_date, completed_at,
 *     description, tags, project, priority, marketplace
 *   Dates & misc
 *     date, currency, notes
 */

// Common helper: case-insensitive string match
export function norm(s) { return String(s || '').trim().toLowerCase() }

/**
 * Amazon Seller Central (Business / Inventory / Settlement reports).
 */
export const AMAZON_COLUMNS = {
  asin: ['asin', 'amazon asin', '(child) asin', '(parent) asin'],
  sku: ['sku', 'seller sku', 'msku', 'merchant-sku', 'sku de venedor'],
  product_name: ['title', 'product name', 'item name', 'listing title'],
  units_sold: ['units ordered', 'quantity', 'qty', 'units sold', 'ordered product sales (units)'],
  units_in_stock: ['afn-fulfillable-quantity', 'available', 'quantity-available', 'units in stock'],
  revenue: ['ordered product sales', 'total sales', 'item-price', 'product sales'],
  fba_fees: ['fba fees', 'fba fulfillment fee', 'fba inventory fee'],
  referral_fees: ['selling fees', 'referral fee', 'commission'],
  date: ['date', 'order-date', 'posted-date', 'purchase-date'],
  orders: ['total order items', 'order-id count', 'orders'],
  refunds: ['refunded amount', 'refund total', 'refunds'],
  marketplace: ['marketplace', 'sales-channel'],
}

/**
 * Helium 10 Profits / Inventory Management.
 */
export const HELIUM10_COLUMNS = {
  asin: ['asin'],
  sku: ['sku'],
  product_name: ['product name', 'title', 'product title'],
  units_sold: ['units sold', 'sales units', 'total units'],
  units_in_stock: ['units in stock', 'current stock', 'inventory'],
  revenue: ['revenue', 'gross sales', 'sales'],
  cogs: ['cogs', 'cost of goods', 'total cogs'],
  fba_fees: ['fba fees', 'fba'],
  ppc_cost: ['ppc cost', 'ads', 'ad spend', 'ppc spend'],
  net_profit: ['net profit', 'profit', 'net'],
  refunds: ['refunds'],
  orders: ['orders', 'total orders'],
  date: ['date', 'period'],
}

/**
 * Jungle Scout (Product Database, Sales Analytics, Keyword Scout).
 */
export const JUNGLE_SCOUT_COLUMNS = {
  asin: ['asin', 'parent asin'],
  product_name: ['product name', 'title', 'name'],
  category: ['category', 'top category'],
  price: ['price', 'current price'],
  bsr: ['bsr', 'best sellers rank', 'rank'],
  reviews_count: ['reviews', 'review count', '# reviews'],
  rating: ['rating', 'avg rating'],
  monthly_sales: ['est. monthly sales', 'estimated sales', 'sales/mo'],
  monthly_revenue: ['est. monthly revenue', 'estimated revenue', 'revenue/mo'],
  search_volume: ['search volume', 'exact search volume', 'monthly searches'],
}

/**
 * Sellerboard — Dashboard P&L / Products / Orders / PPC.
 * Includes English + German + Spanish labels (Sellerboard is localized).
 */
export const SELLERBOARD_COLUMNS = {
  date: ['date', 'month', 'day', 'fecha', 'datum', 'mes', 'periodo'],
  asin: ['asin'],
  sku: ['sku', 'seller sku'],
  product_name: [
    'product name', 'product', 'title',
    'producto', 'nombre',
    'produkt', 'produktname',
  ],
  brand: ['brand', 'marca', 'marke'],
  category: ['category', 'categoría', 'kategorie'],
  orders: ['orders', 'order count', 'pedidos', 'bestellungen'],
  units_sold: [
    'units', 'qty', 'sold', 'quantity', 'units sold',
    'unidades', 'unidades vendidas',
    'verkaufte einheiten', 'einheiten',
  ],
  revenue: [
    'revenue', 'sales', 'gross sales', 'gross revenue',
    'ventas', 'ingresos',
    'umsatz', 'verkäufe',
  ],
  cogs: [
    'cogs', 'goods cost', 'cost of goods', 'product cost',
    'coste', 'coste de producto', 'coste de bienes',
    'wareneinsatz', 'warenkosten',
  ],
  fba_fees: [
    'fba fees', 'fba', 'fba fulfillment',
    'fba tarifa', 'comisión fba',
    'fba-gebühr', 'fba gebühren',
  ],
  referral_fees: [
    'referral fees', 'commissions', 'referral fee', 'amazon fees',
    'comisiones', 'comisión amazon',
    'provision', 'vermittlungsgebühr',
  ],
  storage_fee: [
    'storage fee', 'storage fees', 'monthly storage',
    'almacenamiento', 'tarifa almacenamiento',
    'lagergebühren', 'lagergebühr',
  ],
  ppc_cost: [
    'ppc', 'advertising', 'ad spend', 'ppc cost', 'sponsored',
    'publicidad', 'gastos publicidad', 'anuncios',
    'werbekosten', 'anzeigen', 'werbeausgaben',
  ],
  refunds: [
    'refunds', 'refund amount', 'refund cost', 'returns',
    'devoluciones', 'reembolsos', 'coste devolución',
    'rückerstattungen', 'retouren',
  ],
  promotions: [
    'coupons', 'deals', 'promotions', 'promo cost',
    'cupones', 'promociones', 'descuentos',
    'gutscheine', 'promotionen', 'aktionen',
  ],
  shipping: [
    'shipping', 'shipping cost', 'versandkosten', 'envío',
    'coste de envío', 'gastos envío',
  ],
  other_expenses: [
    'other expenses', 'other', 'indirect expenses',
    'otros gastos', 'sonstige kosten', 'sonstige ausgaben',
  ],
  net_profit: [
    'net profit', 'profit', 'net',
    'beneficio', 'beneficio neto', 'ganancia',
    'gewinn', 'reingewinn',
  ],
  margin_pct: [
    'margin', 'margin%', 'margen', 'marge',
  ],
  roi: ['roi', 'roi %'],
  units_in_stock: [
    'units in stock', 'inventory', 'available', 'stock',
    'existencias', 'bestand',
  ],
  marketplace: ['marketplace', 'market', 'país', 'land'],
}

/**
 * InventoryLab / Stratify.
 */
export const INVENTORYLAB_COLUMNS = {
  sku: ['sku', 'msku'],
  asin: ['asin'],
  product_name: ['title', 'product name'],
  units_in_stock: ['quantity', 'qty', 'units'],
  buy_cost: ['buy cost', 'cost', 'unit cost'],
  fba_fees: ['fees', 'fba fees'],
  net_profit: ['net proceeds', 'profit', 'net'],
  roi: ['roi', 'roi %'],
  date: ['date', 'purchase date'],
}

/**
 * Holded — facturación y contabilidad (Spain). Supports ES + EN column names.
 */
export const HOLDED_COLUMNS = {
  date: ['fecha', 'fecha factura', 'invoice date', 'date'],
  invoice_number: ['número', 'nº', 'nº factura', 'invoice number', 'number'],
  client: ['cliente', 'customer', 'client', 'nombre cliente'],
  supplier: ['proveedor', 'supplier', 'vendor', 'nombre proveedor'],
  nif: ['nif', 'cif', 'tax id', 'vat number', 'nif/cif'],
  concept: ['concepto', 'concept', 'description', 'descripción'],
  category: ['categoría', 'category', 'tipo'],
  base_amount: ['base imponible', 'subtotal', 'base', 'net amount'],
  vat: ['iva', 'vat', 'tax', 'impuesto'],
  total: ['total', 'importe total', 'amount', 'importe'],
  status: ['estado', 'status', 'state'],
  payment_method: ['forma de pago', 'payment method', 'método de pago'],
  product_name: ['nombre', 'name', 'producto', 'product'],
  sku: ['sku', 'referencia', 'reference', 'código'],
  price: ['precio', 'price', 'pvp', 'selling price'],
  cost: ['coste', 'cost', 'precio coste', 'cost price'],
  stock: ['stock', 'existencias', 'inventory', 'cantidad'],
  email: ['email', 'correo', 'e-mail'],
  phone: ['teléfono', 'phone', 'tel'],
  address: ['dirección', 'address'],
  city: ['ciudad', 'city'],
  country: ['país', 'country'],
}

/**
 * Asana — project/task CSV exports.
 */
export const ASANA_COLUMNS = {
  task_id: ['task id', 'id'],
  product_name: ['name', 'task name', 'nombre', 'tarea'],
  section: ['section/column', 'section', 'column', 'sección', 'columna'],
  assignee: ['assignee', 'assigned to', 'asignado', 'responsable'],
  due_date: ['due date', 'deadline', 'fecha límite', 'vencimiento'],
  start_date: ['start date', 'start', 'fecha inicio', 'inicio'],
  completed_at: ['completed at', 'completed', 'completado'],
  status: ['status', 'estado', 'custom status'],
  description: ['description', 'notes', 'descripción', 'notas'],
  tags: ['tags', 'labels', 'etiquetas'],
  project: ['projects', 'project', 'proyecto'],
  priority: ['priority', 'prioridad'],
  asin: ['asin'],
  sku: ['sku'],
  marketplace: ['marketplace', 'market'],
}

/**
 * Monday.com — board CSV exports.
 */
export const MONDAY_COLUMNS = {
  product_name: ['name', 'item', 'nombre', 'elemento'],
  section: ['group', 'grupo', 'board group'],
  status: ['status', 'estado'],
  assignee: ['person', 'owner', 'persona', 'responsable'],
  date: ['date', 'fecha', 'timeline start', 'timeline end'],
  description: ['text', 'notes', 'texto', 'notas'],
  numbers: ['numbers', 'amount', 'número', 'importe'],
  category: ['dropdown', 'category', 'categoría'],
  url: ['link', 'url', 'enlace'],
  asin: ['asin'],
  sku: ['sku'],
  supplier: ['supplier', 'proveedor'],
  cost: ['cost', 'coste', 'cogs'],
  price: ['price', 'precio', 'selling price'],
}

/**
 * Notion / Airtable — generic flexible DBs. Pattern matching via fuzzy.
 */
export const NOTION_COLUMNS = {
  product_name: ['name', 'title', 'nombre', 'título', 'product', 'producto'],
  status: ['status', 'estado', 'stage', 'phase', 'fase', 'etapa'],
  date: ['date', 'created', 'fecha', 'created time', 'last edited time'],
  tags: ['tags', 'labels', 'multi-select', 'etiquetas'],
  url: ['url', 'link', 'enlace'],
  asin: ['asin', 'amazon asin'],
  sku: ['sku', 'reference'],
  supplier: ['supplier', 'proveedor', 'vendor', 'fabricante'],
  cost: ['cost', 'cogs', 'coste', 'unit cost', 'precio coste'],
  price: ['price', 'precio', 'selling price', 'pvp'],
  marketplace: ['marketplace', 'market', 'país', 'country'],
  description: ['notes', 'description', 'notas', 'descripción', 'comments'],
  section: ['phase', 'stage', 'fase', 'etapa', 'pipeline stage'],
}

export const AIRTABLE_COLUMNS = { ...NOTION_COLUMNS }

/**
 * Trello — JSON export (board/lists/cards). The parser emits rows with these keys.
 */
export const TRELLO_COLUMNS = {
  product_name: ['card_name', 'name'],
  section: ['list_name', 'list', 'column'],
  description: ['desc', 'description'],
  due_date: ['due', 'due_date', 'duedate'],
  tags: ['labels', 'tags'],
  assignee: ['members', 'idmembers'],
}

/**
 * SoStocked — inventory & forecasting.
 */
export const SOSTOCKED_COLUMNS = {
  asin: ['asin'],
  sku: ['sku'],
  product_name: ['product name', 'product', 'title', 'name'],
  fba_stock: ['fba stock', 'fba units', 'fba inventory', 'amazon stock'],
  warehouse_stock: ['warehouse stock', 'wh stock', '3pl stock', 'warehouse'],
  in_transit: ['in transit', 'transit', 'on order', 'in production'],
  daily_velocity: ['daily velocity', 'velocity', 'daily sales', 'units/day'],
  days_of_stock: ['days of stock', 'dos', 'coverage days', 'stock days'],
  reorder_date: ['reorder date', 'next order date', 'order by'],
  reorder_qty: ['reorder qty', 'reorder quantity', 'order qty'],
  supplier: ['supplier', 'vendor', 'manufacturer'],
  lead_time: ['lead time', 'lead time days', 'delivery time'],
  moq: ['moq', 'minimum order', 'min order qty'],
  cost: ['cost', 'unit cost', 'cogs', 'cost price'],
}

/**
 * QuickBooks — generic ledger export.
 */
export const QUICKBOOKS_COLUMNS = {
  date: ['date', 'transaction date', 'txn date'],
  category: ['transaction type', 'type', 'txn type'],
  invoice_number: ['ref number', 'reference', 'doc number', 'num'],
  client: ['name', 'customer/vendor', 'payee'],
  account: ['account', 'category'],
  total: ['amount', 'total', 'debit', 'credit'],
  description: ['memo', 'description', 'memo/description'],
  vat: ['vat', 'tax amount', 'sales tax'],
}

/**
 * Xero — invoice export.
 */
export const XERO_COLUMNS = {
  date: ['date', 'invoice date', 'due date'],
  invoice_number: ['invoice number', 'reference', 'invoice no'],
  client: ['contact', 'name', 'customer', 'supplier'],
  description: ['description', 'item', 'line description'],
  units_sold: ['quantity', 'qty'],
  price: ['unit amount', 'unit price', 'price'],
  total: ['amount', 'line amount', 'total'],
  vat: ['tax amount', 'tax', 'vat'],
  account: ['account', 'account code', 'account name'],
  currency: ['currency', 'currency code'],
}

/**
 * Keepa — Amazon price history.
 */
export const KEEPA_COLUMNS = {
  asin: ['asin'],
  product_name: ['title', 'product title'],
  price: ['amazon price', 'buy box price', 'new price'],
  bsr: ['sales rank', 'bsr', 'best sellers rank'],
  reviews_count: ['review count', 'reviews', 'rating count'],
  rating: ['rating', 'avg rating', 'stars'],
  category: ['category', 'root category', 'sub category'],
  brand: ['brand', 'manufacturer'],
  date: ['date', 'timestamp'],
}

/**
 * Master registry — UI uses this to populate source selector.
 * `group` drives the visual grouping on the wizard grid.
 */
export const IMPORT_SOURCES = [
  // Amazon tools
  { id: 'sellerboard', label: 'Sellerboard', group: 'amazon', tagline: 'Profit analytics', recommended: true, domain: 'sellerboard.com', dict: SELLERBOARD_COLUMNS },
  { id: 'helium10', label: 'Helium 10', group: 'amazon', tagline: 'All-in-one Amazon tool', domain: 'helium10.com', dict: HELIUM10_COLUMNS },
  { id: 'junglescout', label: 'Jungle Scout', group: 'amazon', tagline: 'Product research', domain: 'junglescout.com', dict: JUNGLE_SCOUT_COLUMNS },
  { id: 'inventorylab', label: 'InventoryLab', group: 'amazon', tagline: 'Inventory & P&L', domain: 'inventorylab.com', dict: INVENTORYLAB_COLUMNS },
  { id: 'sostocked', label: 'SoStocked', group: 'amazon', tagline: 'Inventory forecasting', domain: 'sostocked.com', dict: SOSTOCKED_COLUMNS },
  { id: 'keepa', label: 'Keepa', group: 'amazon', tagline: 'Price history', domain: 'keepa.com', dict: KEEPA_COLUMNS },
  { id: 'amazon', label: 'Amazon Seller Central', group: 'amazon', tagline: 'Reports oficials', domain: 'amazon.com', dict: AMAZON_COLUMNS },

  // Accounting
  { id: 'holded', label: 'Holded', group: 'accounting', tagline: 'Facturació i comptabilitat', popular: 'ES', domain: 'holded.com', dict: HOLDED_COLUMNS },
  { id: 'quickbooks', label: 'QuickBooks', group: 'accounting', tagline: 'Accounting (US/UK)', domain: 'quickbooks.intuit.com', dict: QUICKBOOKS_COLUMNS },
  { id: 'xero', label: 'Xero', group: 'accounting', tagline: 'Accounting (UK/AU)', domain: 'xero.com', dict: XERO_COLUMNS },

  // Project management
  { id: 'asana', label: 'Asana', group: 'projects', tagline: 'Project management', domain: 'asana.com', dict: ASANA_COLUMNS },
  { id: 'monday', label: 'Monday.com', group: 'projects', tagline: 'Work management', domain: 'monday.com', dict: MONDAY_COLUMNS },
  { id: 'trello', label: 'Trello', group: 'projects', tagline: 'Kanban boards (JSON)', domain: 'trello.com', dict: TRELLO_COLUMNS },

  // Flexible DBs
  { id: 'notion', label: 'Notion', group: 'database', tagline: 'All-in-one workspace', domain: 'notion.so', dict: NOTION_COLUMNS },
  { id: 'airtable', label: 'Airtable', group: 'database', tagline: 'Database spreadsheets', domain: 'airtable.com', dict: AIRTABLE_COLUMNS },

  // Generic — no remote logo, render the FileSpreadsheet icon instead.
  { id: 'generic', label: 'Excel / CSV genèric', group: 'generic', tagline: 'Funciona amb tot', domain: null, dict: null },
]

/**
 * Clearbit Logo API (https://logo.clearbit.com/{domain}) returns the
 * brand's high-quality color logo. Used as primary; components should
 * fall back to Google Favicons if the image fails to load.
 */
export const getSourceLogoUrl = (source) =>
  source?.domain ? `https://logo.clearbit.com/${source.domain}` : null

export const getSourceFaviconFallback = (source) =>
  source?.domain
    ? `https://www.google.com/s2/favicons?domain=${source.domain}&sz=64`
    : null

/** UI source groups (ordered). */
export const SOURCE_GROUPS = [
  { id: 'amazon', labelKey: 'dataImport.groups.amazon', defaultLabel: 'Eines Amazon' },
  { id: 'accounting', labelKey: 'dataImport.groups.accounting', defaultLabel: 'Comptabilitat' },
  { id: 'projects', labelKey: 'dataImport.groups.projects', defaultLabel: 'Gestió de projectes' },
  { id: 'database', labelKey: 'dataImport.groups.database', defaultLabel: 'Bases de dades' },
  { id: 'generic', labelKey: 'dataImport.groups.generic', defaultLabel: 'Genèric' },
]

/** Retrieve dict by source id. */
export function getSourceDict(sourceId) {
  return IMPORT_SOURCES.find((s) => s.id === sourceId)?.dict || null
}

/** Retrieve full source descriptor (label, tagline, group) by id. */
export function getSource(sourceId) {
  return IMPORT_SOURCES.find((s) => s.id === sourceId) || null
}
