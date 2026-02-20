import { parseSupplierQuote } from '../src/lib/parseSupplierQuote.js'

const test = `
# SUPPLIER_QUOTE

supplier_name: Runtime Test Supplier
incoterm: EXW
currency: USD
moq: 100
unit_price: 1.95
tooling_fee: 0
packaging_included: false
lead_time_days: 20
sample_cost: 50
payment_terms: 100% TT
shipping_estimate: 0.20
valid_until: 2026-12-31
notes: Runtime validation
`

const result = parseSupplierQuote(test)
console.log('SUPPLIER PARSER TEST →', result)
