/**
 * Column-name dictionaries for known import sources.
 * Each dictionary maps canonical FreedoliApp fields to arrays of possible source column names
 * (case-insensitive, partial match via regex when applicable).
 *
 * Canonical fields (target):
 *   - asin                   Amazon ASIN (B0XXXXXXXX)
 *   - sku                    seller SKU
 *   - product_name           product display name / title
 *   - category               Amazon category / browse node name
 *   - units_sold             units sold in period
 *   - units_in_stock         current inventory units
 *   - revenue                gross revenue
 *   - cogs                   cost of goods sold (unit * qty)
 *   - fba_fees               total FBA fees in period
 *   - referral_fees          total referral/commission fees
 *   - ppc_cost               total PPC/ad spend
 *   - net_profit             net profit / net proceeds
 *   - selling_price          unit selling price
 *   - buy_cost               unit cost
 *   - bsr                    best sellers rank
 *   - reviews_count          number of reviews
 *   - rating                 average star rating
 *   - price                  listing price
 *   - search_volume          monthly keyword search volume
 *   - monthly_revenue        estimated monthly revenue
 *   - monthly_sales          estimated monthly units sold
 *   - date                   transaction / row date
 *   - orders                 number of orders
 *   - refunds                total refunded amount
 *   - roi                    return on investment (%)
 */

// Common helper: case-insensitive string match
export function norm(s) { return String(s || '').trim().toLowerCase() }

/**
 * Amazon Seller Central (Business Reports / Inventory Reports / Settlement Reports)
 * https://sellercentral.amazon.com/
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
}

/**
 * Helium 10 Profits / Inventory Management exports
 * https://www.helium10.com/
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
}

/**
 * Jungle Scout (Product Database, Sales Analytics, Keyword Scout)
 * https://www.junglescout.com/
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
 * Sellerboard — Dashboard / P&L / Inventory exports
 * https://sellerboard.com/
 */
export const SELLERBOARD_COLUMNS = {
  date: ['date'],
  asin: ['asin'],
  sku: ['sku'],
  product_name: ['product name', 'product', 'title'],
  orders: ['orders'],
  units_sold: ['units', 'qty', 'sold'],
  revenue: ['revenue', 'sales'],
  cogs: ['cogs', 'goods cost'],
  fba_fees: ['fba fees', 'fba'],
  ppc_cost: ['ppc', 'advertising', 'ad spend'],
  referral_fees: ['referral fees', 'commissions'],
  refunds: ['refunds', 'refund amount'],
  net_profit: ['net profit', 'profit'],
}

/**
 * InventoryLab / Stratify exports
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
}

/**
 * Master registry — UI uses this to populate source selector.
 */
export const IMPORT_SOURCES = [
  { id: 'generic', label: 'Excel / CSV genèric', dict: null },
  { id: 'amazon', label: 'Amazon Seller Central', dict: AMAZON_COLUMNS },
  { id: 'helium10', label: 'Helium 10', dict: HELIUM10_COLUMNS },
  { id: 'sellerboard', label: 'Sellerboard', dict: SELLERBOARD_COLUMNS },
  { id: 'junglescout', label: 'Jungle Scout', dict: JUNGLE_SCOUT_COLUMNS },
  { id: 'inventorylab', label: 'InventoryLab', dict: INVENTORYLAB_COLUMNS },
]

/** Retrieve dict by source id. */
export function getSourceDict(sourceId) {
  return IMPORT_SOURCES.find((s) => s.id === sourceId)?.dict || null
}
