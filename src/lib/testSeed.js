/**
 * testSeed.js — realistic "video-ready" acceptance dataset.
 *
 * Purpose: feed the app with data that looks impressive on a screen recording
 * (3-min commercial video per canvas F0ATVB6036C). Differs from demoSeed.js in:
 *   - rows are NOT marked is_demo=true → dashboard KPIs, Finances, reports
 *     render them as real data.
 *   - Spanish product names, round numbers, net margins 28-35% on every live SKU.
 *   - Month-6 (Apr 2026) revenue ≥ €15.000, overall margin ~33%.
 *   - 5 POs across the lifecycle (draft → shipped → delivered).
 *   - Research report: viability_score 78, recommendation "go".
 *   - 3 pending decisions with clear Spanish text.
 *
 * Cleanup uses the `TEST-` prefix on `project_code` / `po_number` / `sku`
 * instead of a DB flag, so it works against the live schema.
 *
 * Usage (browser console, while authenticated):
 *   import { generateTestData, clearTestData } from '@/lib/testSeed'
 *   await generateTestData({ orgId })
 *   ...
 *   await clearTestData()
 */

import { supabase, getCurrentUserId } from './supabase'

// ---------------- PRODUCTS ----------------
// Net margin per unit = price − (price × 0.15 Amazon fee) − fba_fee − unit_cost.
// Margins below land in the 29-34% band. All numbers are whole/half euros.
export const TEST_PRODUCTS = [
  // ---- 4 LIVE products (phase 7, decision GO) -------------------------------
  {
    asin: 'B0CX23WVMB',
    sku: 'TEST-ORG-BAMBOO-01',
    name: 'Organizador Cajones Bambú — 8 Compartimentos',
    marketplace: 'ES',
    phase: 7,
    decision: 'GO',
    price: 30,           // €30.00
    unitCost: 12,        // COGS €12.00
    fbaFee: 3.5,         // FBA €3.50
    // Net/unit = 30 − 4.50 − 3.50 − 12 = 10.00 → 33% margin
    monthlyUnits: [100, 130, 150, 170, 190, 200],
  },
  {
    asin: 'B0DFG8KNTJ',
    sku: 'TEST-KITCHEN-SILICONE-01',
    name: 'Utensilios Silicona Cocina (Set 12 Piezas)',
    marketplace: 'ES',
    phase: 7,
    decision: 'GO',
    price: 25,           // €25.00
    unitCost: 10,        // €10.00
    fbaFee: 3,           // €3.00
    // Net/unit = 25 − 3.75 − 3 − 10 = 8.25 → 33% margin
    monthlyUnits: [100, 130, 150, 170, 190, 200],
  },
  {
    asin: 'B0BTGFK1QR',
    sku: 'TEST-YOGA-MAT-01',
    name: 'Esterilla Yoga TPE 6mm Eco-Friendly',
    marketplace: 'DE',
    phase: 7,
    decision: 'GO',
    price: 35,           // €35.00
    unitCost: 14,        // €14.00
    fbaFee: 4,           // €4.00
    // Net/unit = 35 − 5.25 − 4 − 14 = 11.75 → 33.6% margin
    monthlyUnits: [50, 65, 75, 85, 95, 100],
  },
  {
    asin: 'B0CM5JFG9Z',
    sku: 'TEST-BANDS-01',
    name: 'Bandas de Resistencia (5 Niveles con Funda)',
    marketplace: 'ES',
    phase: 7,
    decision: 'GO',
    price: 20,           // €20.00
    unitCost: 8,         // €8.00
    fbaFee: 3,           // €3.00
    // Net/unit = 20 − 3 − 3 − 8 = 6 → 30% margin
    monthlyUnits: [50, 65, 75, 85, 95, 100],
  },
  // ---- 4 UPCOMING projects (earlier phases, for kanban density) -------------
  {
    asin: 'B0DJKP2QTX',
    sku: 'TEST-USB-CABLE-01',
    name: 'Cable USB-C Trenzado 2m (Pack 3)',
    marketplace: 'DE',
    phase: 4,
    decision: 'GO',
    price: 16,
    unitCost: 3,
    fbaFee: 3,
  },
  {
    asin: 'B0CRV7KLMN',
    sku: 'TEST-DIFFUSER-01',
    name: 'Difusor Aromaterapia 500ml con Luz LED',
    marketplace: 'ES',
    phase: 3,
    decision: 'HOLD',
    price: 30,
    unitCost: 9,
    fbaFee: 3.5,
  },
  {
    asin: 'B0DNT4WXYZ',
    sku: 'TEST-STAND-01',
    name: 'Soporte Portátil Aluminio Ajustable',
    marketplace: 'IT',
    phase: 2,
    decision: null,
    price: 32,
    unitCost: 10,
    fbaFee: 3.5,
  },
  {
    asin: 'B0DPQ6RABM',
    sku: 'TEST-CUTTING-BOARD-01',
    name: 'Tabla de Cortar Bambú (Set 3 Piezas)',
    marketplace: 'ES',
    phase: 1,
    decision: null,
    price: 28,
    unitCost: 7,
    fbaFee: 3,
  },
]

// ---------------- SUPPLIERS ----------------
const TEST_SUPPLIERS = [
  {
    name: 'Shenzhen Yixing Trading Co.',
    type: 'manufacturer',
    rating: 5,
    contact_name: 'Wang Lei',
    email: 'wang.lei@yixing-trading.cn',
    phone: '+86-755-8886-1234',
    incoterm: 'FOB',
    payment_terms: 'T/T 30% / 70%',
  },
  {
    name: 'Ningbo Greenleaf Home Products',
    type: 'manufacturer',
    rating: 4,
    contact_name: 'Liu Xiaomei',
    email: 'sales@greenleaf-ningbo.com',
    phone: '+86-574-5566-7788',
    incoterm: 'FOB',
    payment_terms: 'T/T 30% / 70%',
  },
  {
    name: 'Zentrada GmbH (Stock Europeo)',
    type: 'manufacturer',
    rating: 4,
    contact_name: 'Hans Becker',
    email: 'becker@zentrada.de',
    phone: '+49-89-123-45678',
    incoterm: 'EXW',
    payment_terms: 'Net 30',
  },
]

// ---------------- HELPERS ----------------
const iso = (d) => d.toISOString().split('T')[0]
const MONTH_STARTS = [
  new Date('2025-11-01'),
  new Date('2025-12-01'),
  new Date('2026-01-01'),
  new Date('2026-02-01'),
  new Date('2026-03-01'),
  new Date('2026-04-01'),
]
const MONTH_LABEL_ES = ['Noviembre 2025', 'Diciembre 2025', 'Enero 2026', 'Febrero 2026', 'Marzo 2026', 'Abril 2026']

async function tryInsert(table, row) {
  const { data, error } = await supabase.from(table).insert([row]).select().single()
  if (error) {
    console.warn(`[testSeed] insert ${table} failed:`, error.message)
    return null
  }
  return data
}

// ---------------- GENERATE ----------------
export async function generateTestData({ orgId } = {}, onProgress = null) {
  const counts = {
    products: 0, suppliers: 0, pos: 0,
    expenses: 0, incomes: 0, research: 0, decisions: 0,
  }
  const report = (k) => { counts[k] = (counts[k] || 0) + 1; if (onProgress) onProgress({ ...counts }) }

  try {
    const userId = await getCurrentUserId()

    // 1) Suppliers ------------------------------------------------------------
    const suppliers = []
    for (const s of TEST_SUPPLIERS) {
      const row = await tryInsert('suppliers', {
        name: s.name, type: s.type, rating: s.rating,
        contact_name: s.contact_name, email: s.email, phone: s.phone,
        incoterm: s.incoterm, payment_terms: s.payment_terms,
        user_id: userId,
      })
      if (row) { suppliers.push({ ...row, _meta: s }); report('suppliers') }
    }

    // 2) Projects -------------------------------------------------------------
    const projects = []
    for (let i = 0; i < TEST_PRODUCTS.length; i++) {
      const p = TEST_PRODUCTS[i]
      const row = await tryInsert('projects', {
        project_code: `TEST-PR-${String(i + 1).padStart(4, '0')}`,
        sku: p.sku,
        sku_internal: p.sku,
        name: p.name,
        description: `Producto de test listo para grabación: ${p.name}`,
        current_phase: p.phase,
        decision: p.decision,
        status: 'active',
        asin: p.asin,
        marketplace: p.marketplace,
      })
      if (row) { projects.push({ ...row, _meta: p }); report('products') }
    }

    // 3) Purchase orders — 5 POs across lifecycle ----------------------------
    // statuses: delivered, shipped, in_production, confirmed, draft
    const poPlan = [
      { projectIdx: 0, supplierIdx: 0, status: 'delivered',     qty: 2000, monthsAgo: 4 },
      { projectIdx: 1, supplierIdx: 1, status: 'shipped',       qty: 1500, monthsAgo: 2 },
      { projectIdx: 2, supplierIdx: 0, status: 'in_production', qty: 1000, monthsAgo: 1 },
      { projectIdx: 3, supplierIdx: 1, status: 'confirmed',     qty:  800, monthsAgo: 1 },
      { projectIdx: 4, supplierIdx: 2, status: 'draft',         qty:  500, monthsAgo: 0 },
    ]
    for (let i = 0; i < poPlan.length; i++) {
      const plan = poPlan[i]
      const project = projects[plan.projectIdx]
      const supplier = suppliers[plan.supplierIdx]
      if (!project || !supplier) continue
      const unitPrice = project._meta.unitCost
      const items = [{
        sku: project.sku, description: project.name,
        quantity: plan.qty, unit_price: unitPrice, total: plan.qty * unitPrice,
      }]
      const orderDate = new Date()
      orderDate.setMonth(orderDate.getMonth() - plan.monthsAgo)
      await tryInsert('purchase_orders', {
        po_number: `TEST-PO-2026-${String(i + 1).padStart(3, '0')}`,
        project_id: project.id,
        supplier_id: supplier.id,
        order_date: iso(orderDate),
        status: plan.status,
        currency: 'USD',
        incoterm: supplier._meta.incoterm,
        payment_terms: supplier._meta.payment_terms,
        items: JSON.stringify(items),
        total_amount: plan.qty * unitPrice,
        user_id: userId,
      })
      report('pos')
    }

    // 4) Finances — 6 months × live products ---------------------------------
    // For each live SKU, emit 1 income row + 3 expense rows per month.
    for (let m = 0; m < MONTH_STARTS.length; m++) {
      const monthDate = MONTH_STARTS[m]
      const monthLabel = MONTH_LABEL_ES[m]
      for (const project of projects) {
        const units = project._meta.monthlyUnits?.[m]
        if (!units) continue
        const price = project._meta.price
        const unitCost = project._meta.unitCost
        const fbaFee = project._meta.fbaFee

        const revenue = +(units * price).toFixed(2)
        const amazonFees = +(revenue * 0.15).toFixed(2)
        const fbaTotal = +(units * fbaFee).toFixed(2)
        const cogs = +(units * unitCost).toFixed(2)

        await tryInsert('incomes', {
          project_id: project.id,
          amount: revenue,
          currency: 'EUR',
          description: `Ventas Amazon ${monthLabel} — ${units} unidades`,
          income_date: iso(monthDate),
          platform: 'amazon',
          marketplace: project._meta.marketplace,
          user_id: userId,
        })
        report('incomes')

        const expenseRows = [
          { desc: `Amazon referral fee (15%) — ${monthLabel}`, amount: amazonFees },
          { desc: `FBA fulfilment — ${monthLabel}`,            amount: fbaTotal },
          { desc: `COGS (landed) — ${monthLabel}`,             amount: cogs },
        ]
        for (const exp of expenseRows) {
          await tryInsert('expenses', {
            project_id: project.id,
            amount: exp.amount,
            currency: 'EUR',
            description: exp.desc,
            expense_date: iso(monthDate),
            user_id: userId,
          })
          report('expenses')
        }
      }
    }

    // 5) Research report — Organizador Cajones Bambú, score 78, go ----------
    const bambooProject = projects.find((p) => p._meta.sku === 'TEST-ORG-BAMBOO-01')
    if (bambooProject) {
      await tryInsert('research_reports', {
        org_id: orgId || bambooProject.org_id || null,
        project_id: bambooProject.id,
        input_asin: bambooProject._meta.asin,
        input_description: bambooProject.name,
        marketplace: 'ES',
        sources_used: ['amazon', 'suppliers', 'ai'],
        raw_data: { test: true },
        ai_analysis: {
          market: {
            selling_price: { min: 25, max: 35, currency: 'EUR' },
            bsr: 4820,
            reviews_range: 'medium',
            competition_level: 'medium',
            search_volume: 14500,
            trend: 'estable',
            summary: 'Mercado saludable con demanda estable y competencia gestionable. BSR 4.820 en Kitchen & Dining.',
          },
          costs: {
            alibaba_price: { min: 4.20, max: 6.80, moq: 500 },
            factory_price_1688: { min: 2.80, max: 4.50 },
            zentrada_price: { min: 0, max: 0 },
            estimated_shipping_per_unit: { sea: 0.85, air: 2.30 },
            estimated_fba_fees: 3.5,
            summary: 'Costes competitivos. 1688 ofrece mejor precio de fábrica; Alibaba recomendado para primer pedido con MOQ 500.',
          },
          margins: {
            optimistic:  { selling_price: 35, total_cost: 14, net_margin_pct: 40 },
            realistic:   { selling_price: 30, total_cost: 15, net_margin_pct: 33 },
            pessimistic: { selling_price: 25, total_cost: 16, net_margin_pct: 20 },
          },
          risks: [
            { type: 'competition', severity: 'medium', description: 'Varias marcas consolidadas con 500+ reviews.' },
            { type: 'regulation',  severity: 'low',    description: 'Producto no gated, sin restricciones específicas en ES/EU.' },
          ],
          viability_score: 78,
          recommendation: 'go',
          next_steps: [
            'Solicitar muestras a 2-3 proveedores de Alibaba con rating ≥ 4.5.',
            'Diseñar packaging diferencial (eco-friendly, bambú certificado).',
            'Validar regulación EU para productos de bambú (fitosanitario).',
          ],
          executive_summary: 'Producto viable con margen neto realista del 33%. Competencia moderada pero diferenciable con packaging premium. Recomendado GO con MOQ de 500 unidades en el primer lote.',
        },
        viability_score: 78,
        recommendation: 'go',
        created_by: userId,
      })
      report('research')
    }

    // 6) Decisions pendientes — 3 con texto claro en español ----------------
    const decisionPlan = [
      {
        project: projects.find((p) => p._meta.sku === 'TEST-USB-CABLE-01'),
        title: 'Decidir proveedor para Cable USB-C (3 cotizaciones recibidas)',
        description: 'Shenzhen Yixing €2.80/u MOQ 2000, Ningbo Greenleaf €3.10/u MOQ 1000, Zentrada €4.50/u MOQ 200. Evaluar lead time vs margen antes del 30/Abr.',
      },
      {
        project: projects.find((p) => p._meta.sku === 'TEST-DIFFUSER-01'),
        title: 'Avanzar Difusor Aromaterapia a fase de muestras',
        description: 'Research viability_score 64 (borderline). Pedir muestra física antes de comprometer MOQ 500. Budget €200 para prototipos.',
      },
      {
        project: projects.find((p) => p._meta.sku === 'TEST-STAND-01'),
        title: 'Validar diseño final Soporte Portátil con proveedor',
        description: 'Mockups enviados la semana pasada. Pendiente feedback de Shenzhen Yixing sobre tolerancias. Si no responde antes de Viernes, escalar.',
      },
    ]
    for (const d of decisionPlan) {
      if (!d.project) continue
      await tryInsert('decision_log', {
        entity_type: 'project',
        entity_id: d.project.id,
        status: 'pending',
        title: d.title,
        description: d.description,
        user_id: userId,
      })
      report('decisions')
    }

    return { success: true, counts }
  } catch (err) {
    console.error('[testSeed] generateTestData failed:', err)
    return { success: false, error: err.message, counts }
  }
}

// ---------------- CLEAR ----------------
// No is_test column exists, so we match by TEST- prefix on codes/skus.
export async function clearTestData() {
  const userId = await getCurrentUserId()

  // 1) find projects by prefix
  const { data: projects } = await supabase
    .from('projects')
    .select('id, name')
    .like('project_code', 'TEST-%')
  const projectIds = (projects || []).map((p) => p.id)

  if (projectIds.length > 0) {
    // child rows
    await supabase.from('decision_log').delete().in('entity_id', projectIds).eq('entity_type', 'project')
    await supabase.from('incomes').delete().in('project_id', projectIds)
    await supabase.from('expenses').delete().in('project_id', projectIds)
    await supabase.from('research_reports').delete().in('project_id', projectIds)

    // purchase orders
    const { data: pos } = await supabase
      .from('purchase_orders')
      .select('id').in('project_id', projectIds)
    const poIds = (pos || []).map((p) => p.id)
    if (poIds.length > 0) {
      await supabase.from('po_shipments').delete().in('purchase_order_id', poIds)
      await supabase.from('po_amazon_readiness').delete().in('purchase_order_id', poIds)
      await supabase.from('purchase_orders').delete().in('id', poIds)
    }
    await supabase.from('projects').delete().in('id', projectIds)
  }

  // 2) suppliers — delete by TEST-specific name fragments
  const testSupplierNames = TEST_SUPPLIERS.map((s) => s.name)
  if (testSupplierNames.length > 0) {
    await supabase.from('suppliers').delete().eq('user_id', userId).in('name', testSupplierNames)
  }

  return { success: true }
}
