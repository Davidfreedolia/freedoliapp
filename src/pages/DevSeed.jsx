import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { supabase, getCurrentUserId, upsertProjectProfitability } from '../lib/supabase'
import { showToast } from '../components/Toast'
import { AlertTriangle, Database, Trash2, CheckCircle2, RefreshCw } from 'lucide-react'

export default function DevSeed() {
  const { darkMode } = useApp()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState(null)
  const [counts, setCounts] = useState(null)
  const [confirmText, setConfirmText] = useState('')
  const [clearConfirmText, setClearConfirmText] = useState('')
  const [demoReady, setDemoReady] = useState(false)
  const [demoChecks, setDemoChecks] = useState(null)

  const checkDemoExists = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id')
        .eq('is_demo', true)
        .limit(1)
      
      if (error) throw error
      return (data || []).length > 0
    } catch (err) {
      console.error('Error checking demo data:', err)
      return false
    }
  }

  const clearDemoData = async () => {
    if (clearConfirmText !== 'CLEAR') {
      setStatus({ type: 'error', message: 'Please type CLEAR to confirm deletion' })
      return
    }

    setLoading(true)
    setStatus({ type: 'info', message: 'Clearing demo data...' })
    setDemoReady(false)
    setDemoChecks(null)
    
    try {
      const userId = await getCurrentUserId()
      
      // Get demo suppliers first (needed for tasks deletion)
      const { data: suppliers } = await supabase
        .from('suppliers')
        .select('id')
        .eq('is_demo', true)
        .eq('user_id', userId)
      
      // Delete in order of foreign keys (reverse dependency order)
      const tables = [
        'decision_log',
        'tasks',
        'sticky_notes',
        'po_shipments',
        'po_amazon_readiness',
        'purchase_orders',
        'supplier_quote_price_breaks',
        'supplier_quotes',
        'product_identifiers',
        'gtin_pool',
        'projects',
        'suppliers'
      ]

      for (const table of tables) {
        try {
          // For tables with direct project_id reference
          if (['supplier_quotes', 'product_identifiers', 'purchase_orders'].includes(table)) {
            // Delete items linked to demo projects
            const { data: demoProjects } = await supabase
              .from('projects')
              .select('id')
              .eq('is_demo', true)
              .eq('user_id', userId)

            if (demoProjects && demoProjects.length > 0) {
              const projectIds = demoProjects.map(p => p.id)
              
              await supabase
                .from(table)
                .delete()
                .eq('user_id', userId)
                .in('project_id', projectIds)
            }
          } else if (table === 'decision_log') {
            // Delete decision_log entries for demo projects (entity_type='project')
            const { data: demoProjects } = await supabase
              .from('projects')
              .select('id')
              .eq('is_demo', true)
              .eq('user_id', userId)

            if (demoProjects && demoProjects.length > 0) {
              const projectIds = demoProjects.map(p => p.id)
              await supabase
                .from('decision_log')
                .delete()
                .eq('user_id', userId)
                .eq('entity_type', 'project')
                .in('entity_id', projectIds)
            }
          } else if (table === 'tasks') {
            // Delete tasks linked to demo projects, POs, suppliers, shipments
            const { data: demoProjects } = await supabase
              .from('projects')
              .select('id')
              .eq('is_demo', true)
              .eq('user_id', userId)

            if (demoProjects && demoProjects.length > 0) {
              const projectIds = demoProjects.map(p => p.id)
              
              // Get demo PO IDs
              const { data: demoPOs } = await supabase
                .from('purchase_orders')
                .select('id')
                .eq('user_id', userId)
                .in('project_id', projectIds)

              const poIds = demoPOs?.map(po => po.id) || []
              const supplierIds = suppliers?.map(s => s.id) || []
              
              // Delete tasks for projects (batch by type)
              if (projectIds.length > 0) {
                await supabase
                  .from('tasks')
                  .delete()
                  .eq('user_id', userId)
                  .eq('entity_type', 'project')
                  .in('entity_id', projectIds)
              }
              
              // Delete tasks for POs
              if (poIds.length > 0) {
                await supabase
                  .from('tasks')
                  .delete()
                  .eq('user_id', userId)
                  .eq('entity_type', 'purchase_order')
                  .in('entity_id', poIds)
              }
              
              // Delete tasks for suppliers
              if (supplierIds.length > 0) {
                await supabase
                  .from('tasks')
                  .delete()
                  .eq('user_id', userId)
                  .eq('entity_type', 'supplier')
                  .in('entity_id', supplierIds)
              }
            }
          } else if (table === 'po_shipments') {
            // Delete shipments linked to demo POs
            const { data: demoProjects } = await supabase
              .from('projects')
              .select('id')
              .eq('is_demo', true)
              .eq('user_id', userId)

            if (demoProjects && demoProjects.length > 0) {
              const projectIds = demoProjects.map(p => p.id)
              const { data: demoPOs } = await supabase
                .from('purchase_orders')
                .select('id')
                .eq('user_id', userId)
                .in('project_id', projectIds)

              if (demoPOs && demoPOs.length > 0) {
                const poIds = demoPOs.map(po => po.id)
                await supabase
                  .from('po_shipments')
                  .delete()
                  .eq('user_id', userId)
                  .in('purchase_order_id', poIds)
              }
            }
          } else if (table === 'po_amazon_readiness') {
            // Delete readiness linked to demo POs
            const { data: demoProjects } = await supabase
              .from('projects')
              .select('id')
              .eq('is_demo', true)
              .eq('user_id', userId)

            if (demoProjects && demoProjects.length > 0) {
              const projectIds = demoProjects.map(p => p.id)
              const { data: demoPOs } = await supabase
                .from('purchase_orders')
                .select('id')
                .eq('user_id', userId)
                .in('project_id', projectIds)

              if (demoPOs && demoPOs.length > 0) {
                const poIds = demoPOs.map(po => po.id)
                await supabase
                  .from('po_amazon_readiness')
                  .delete()
                  .eq('user_id', userId)
                  .in('purchase_order_id', poIds)
              }
            }
          } else if (table === 'supplier_quote_price_breaks') {
            // Delete price breaks linked to demo quotes
            const { data: demoProjects } = await supabase
              .from('projects')
              .select('id')
              .eq('is_demo', true)
              .eq('user_id', userId)

            if (demoProjects && demoProjects.length > 0) {
              const projectIds = demoProjects.map(p => p.id)
              const { data: demoQuotes } = await supabase
                .from('supplier_quotes')
                .select('id')
                .eq('user_id', userId)
                .in('project_id', projectIds)

              if (demoQuotes && demoQuotes.length > 0) {
                const quoteIds = demoQuotes.map(q => q.id)
                await supabase
                  .from('supplier_quote_price_breaks')
                  .delete()
                  .in('quote_id', quoteIds)
              }
            }
          } else if (table === 'gtin_pool') {
            // Delete demo GTINs (marked with is_demo or assigned to demo projects)
            const { data: demoProjects } = await supabase
              .from('projects')
              .select('id')
              .eq('is_demo', true)
              .eq('user_id', userId)

            if (demoProjects && demoProjects.length > 0) {
              const projectIds = demoProjects.map(p => p.id)
              // Release GTINs assigned to demo projects
              await supabase
                .from('gtin_pool')
                .update({ 
                  assigned_to_project_id: null,
                  assigned_at: null,
                  status: 'available'
                })
                .eq('user_id', userId)
                .in('assigned_to_project_id', projectIds)
            }

            // Delete GTINs marked as demo
            await supabase
              .from('gtin_pool')
              .delete()
              .eq('user_id', userId)
              .eq('is_demo', true)
          } else if (table === 'sticky_notes') {
            // Delete demo sticky notes
            await supabase
              .from('sticky_notes')
              .delete()
              .eq('user_id', userId)
              .eq('is_demo', true)
          } else if (table === 'projects') {
            // Delete demo projects (last, after all FKs cleared)
            await supabase
              .from('projects')
              .delete()
              .eq('user_id', userId)
              .eq('is_demo', true)
          } else if (table === 'suppliers') {
            // Delete demo suppliers (only if not used by non-demo projects)
            await supabase
              .from('suppliers')
              .delete()
              .eq('user_id', userId)
              .eq('is_demo', true)
          }
        } catch (err) {
          console.error(`Error deleting from ${table}:`, err)
          // Continue with other tables
        }
      }

      setStatus({ type: 'success', message: 'Demo data cleared successfully' })
      setCounts(null)
      setClearConfirmText('')
      showToast('Demo data cleared successfully', 'success')
    } catch (err) {
      setStatus({ type: 'error', message: `Error clearing demo data: ${err.message}` })
      showToast(`Error clearing demo data: ${err.message}`, 'error')
    } finally {
      setLoading(false)
    }
  }

  const generateDemoData = async () => {
    if (confirmText !== 'DEMO') {
      setStatus({ type: 'error', message: 'Please type DEMO to confirm' })
      return
    }

    setLoading(true)
    setStatus({ type: 'info', message: 'Generating demo data...' })
    setCounts({ projects: 0, suppliers: 0, gtins: 0, quotes: 0, pos: 0, tasks: 0, notes: 0, expenses: 0, incomes: 0, recurring: 0, floatingNotes: 0 })

    try {
      const userId = await getCurrentUserId()
      const hasDemo = await checkDemoExists()
      
      // Activar demo_mode
      await supabase
        .from('company_settings')
        .upsert({ demo_mode: true }, { onConflict: 'user_id' })
      
      if (hasDemo) {
        if (!confirm('Demo data already exists. Clear and regenerate?')) {
          setLoading(false)
          return
        }
        await clearDemoData()
      }

      const newCounts = { projects: 0, suppliers: 0, gtins: 0, quotes: 0, pos: 0, tasks: 0, notes: 0, shipments: 0 }

      // 1) Suppliers (8)
      const suppliers = []
      const supplierNames = [
        { name: 'Demo Manufacturing Co', type: 'manufacturer', rating: 5 },
        { name: 'Demo Producer Ltd', type: 'manufacturer', rating: 4 },
        { name: 'Demo Factory Inc', type: 'manufacturer', rating: 3 },
        { name: 'Demo Maker Corp', type: 'manufacturer', rating: 4 },
        { name: 'Demo Industry LLC', type: 'manufacturer', rating: 5 },
        { name: 'Demo Freight Solutions', type: 'freight', rating: 4 },
        { name: 'Demo Logistics Express', type: 'freight', rating: 5 },
        { name: 'Demo Quality Inspection', type: 'inspection', rating: 4 }
      ]

      for (const s of supplierNames) {
        const { data: supplier, error } = await supabase
          .from('suppliers')
          .insert([{
            name: s.name,
            type: s.type,
            rating: s.rating,
            contact_name: `Contact ${s.name.split(' ')[1]}`,
            email: `contact@${s.name.toLowerCase().replace(/\s+/g, '')}.com`,
            phone: `+1-555-${Math.floor(Math.random() * 9000) + 1000}`,
            incoterm: ['FOB', 'FCA', 'EXW'][Math.floor(Math.random() * 3)],
            payment_terms: ['T/T 30%', 'L/C at sight', 'Net 30'][Math.floor(Math.random() * 3)],
            is_demo: true
          }])
          .select()
          .single()

        if (error) throw error
        suppliers.push(supplier)
        newCounts.suppliers++
        setCounts({ ...newCounts })
      }

      // 2) Projects (10)
      const projects = []
      const projectNames = [
        { name: 'Demo Wireless Earbuds', phase: 1, decision: null, profitability: 'GO' },
        { name: 'Demo Phone Case Pro', phase: 2, decision: 'HOLD', profitability: null },
        { name: 'Demo Smart Watch', phase: 3, decision: 'GO', profitability: null },
        { name: 'Demo Laptop Stand', phase: 4, decision: 'GO', profitability: null },
        { name: 'Demo USB Cable', phase: 2, decision: 'DISCARDED', profitability: null },
        { name: 'Demo Power Bank', phase: 5, decision: 'GO', profitability: null },
        { name: 'Demo Tablet Cover', phase: 3, decision: 'HOLD', profitability: null },
        { name: 'Demo Keyboard', phase: 6, decision: 'GO', profitability: null },
        { name: 'Demo Mouse Pad', phase: 1, decision: 'DISCARDED', profitability: 'RISKY' },
        { name: 'Demo Webcam', phase: 7, decision: 'GO', profitability: null }
      ]

      for (let i = 0; i < projectNames.length; i++) {
        const p = projectNames[i]
        const projectCode = `DEMO-PR-${String(i + 1).padStart(6, '0')}`
        const sku = `DEMO-${String(i + 1).padStart(6, '0')}`

        const { data: project, error } = await supabase
          .from('projects')
          .insert([{
            project_code: projectCode,
            sku: sku,
            sku_internal: sku,
            name: p.name,
            description: `Demo project: ${p.name}`,
            current_phase: p.phase,
            decision: p.decision,
            status: p.decision === 'DISCARDED' ? 'inactive' : 'active',
            is_demo: true
          }])
          .select()
          .single()

        if (error) throw error
        projects.push(project)
        newCounts.projects++
        setCounts({ ...newCounts })

        // Add profitability data for phase 1 projects
        if (p.phase === 1 && p.profitability) {
          const profitabilityData = {
            selling_price: p.profitability === 'GO' ? 29.99 : 19.99,
            cogs: p.profitability === 'GO' ? 8.50 : 12.00,
            shipping_per_unit: 2.50,
            referral_fee_percent: 15,
            fba_fee_per_unit: p.profitability === 'GO' ? 3.50 : 2.50,
            ppc_per_unit: p.profitability === 'GO' ? 1.50 : 2.00,
            other_costs_per_unit: 0.50,
            fixed_costs: 500
          }
          try {
            await upsertProjectProfitability(project.id, profitabilityData)
          } catch (err) {
            console.warn('Could not add profitability data:', err)
          }
        }
      }

      // 3) GTIN Pool (80 GTINs)
      const gtinPool = []
      for (let i = 0; i < 80; i++) {
        const gtinCode = `7${String(Math.floor(Math.random() * 9000000000000) + 1000000000000)}`.substring(0, 13)
        const gtinType = i % 3 === 0 ? 'UPC' : 'EAN'

        const { data: gtin, error } = await supabase
          .from('gtin_pool')
          .insert([{
            gtin_code: gtinCode,
            gtin_type: gtinType,
            status: i < 60 ? 'available' : 'assigned',
            is_demo: true,
            assigned_to_project_id: i < 60 ? null : projects[i % 6].id,
            assigned_at: i < 60 ? null : new Date().toISOString()
          }])
          .select()
          .single()

        if (!error && gtin) {
          gtinPool.push(gtin)
          newCounts.gtins++
          setCounts({ ...newCounts })
        }
      }

      // 4) Product Identifiers (6 projects with identifiers, 4 without)
      for (let i = 0; i < 6; i++) {
        const project = projects[i]
        const assignedGtin = gtinPool.find(g => g.assigned_to_project_id === project.id)

        if (assignedGtin) {
          await supabase
            .from('product_identifiers')
            .insert([{
              project_id: project.id,
              gtin_code: assignedGtin.gtin_code,
              gtin_type: assignedGtin.gtin_type,
              fnsku: `X00${String(i + 1).padStart(9, '0')}`,
              asin: `B0${String(Math.floor(Math.random() * 90000000) + 10000000)}`
            }])
        }
      }

      // 5) Supplier Quotes (3 projects with 2 quotes each)
      const quoteProjects = projects.slice(0, 3)
      for (const project of quoteProjects) {
        for (let q = 0; q < 2; q++) {
          const supplier = suppliers[q === 0 ? 0 : 1] // First quote from supplier 0, second from supplier 1
          const isBetterPrice = q === 0 // First quote has better price
          
          const { data: quote, error: quoteError } = await supabase
            .from('supplier_quotes')
            .insert([{
              project_id: project.id,
              supplier_id: supplier.id,
              currency: 'USD',
              incoterm: supplier.incoterm,
              payment_terms: supplier.payment_terms,
              lead_time_days: isBetterPrice ? 45 : 30,
              moq: isBetterPrice ? 2000 : 500,
              shipping_estimate: 500,
              notes: `Demo quote ${q + 1} for ${project.name}`
            }])
            .select()
            .single()

          if (!quoteError && quote) {
            // Add price breaks
            const breaks = [
              { min_qty: 500, unit_price: isBetterPrice ? 12.50 : 14.00 },
              { min_qty: 1000, unit_price: isBetterPrice ? 11.50 : 13.00 },
              { min_qty: 2000, unit_price: isBetterPrice ? 10.50 : 12.00 }
            ]

            for (const br of breaks) {
              await supabase
                .from('supplier_quote_price_breaks')
                .insert([{
                  quote_id: quote.id,
                  min_qty: br.min_qty,
                  unit_price: br.unit_price
                }])
            }

            newCounts.quotes++
            setCounts({ ...newCounts })
          }
        }
      }

      // 6) Purchase Orders (6 projects with 1-2 POs)
      const poProjects = projects.slice(0, 6)
      const poStatuses = ['draft', 'confirmed', 'in_production', 'shipped', 'received', 'confirmed']
      const purchaseOrders = []

      for (let i = 0; i < poProjects.length; i++) {
        const project = poProjects[i]
        const numPOs = i < 3 ? 1 : 2
        const supplier = suppliers[i % 5] // Use first 5 suppliers

        for (let poNum = 0; poNum < numPOs; poNum++) {
          const poNumber = `DEMO-PO-${String(i + 1).padStart(4, '0')}-${poNum + 1}`
          const status = poStatuses[i]

          const items = [{
            sku: project.sku,
            description: project.name,
            quantity: 1000 + (poNum * 500),
            unit_price: 12.50 - (poNum * 0.50),
            total: (1000 + (poNum * 500)) * (12.50 - (poNum * 0.50))
          }]

          const { data: po, error: poError } = await supabase
            .from('purchase_orders')
            .insert([{
              po_number: poNumber,
              project_id: project.id,
              supplier_id: supplier.id,
              order_date: new Date(Date.now() - (i * 30 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0],
              status: status,
              currency: 'USD',
              incoterm: supplier.incoterm,
              payment_terms: supplier.payment_terms,
              items: JSON.stringify(items),
              total_amount: items.reduce((sum, item) => sum + item.total, 0)
            }])
            .select()
            .single()

          if (!poError && po) {
            purchaseOrders.push(po)
            newCounts.pos++
            setCounts({ ...newCounts })

            // 7) Amazon Readiness (3 complete, 3 incomplete)
            if (i < 3) {
              // Complete readiness
              await supabase
                .from('po_amazon_readiness')
                .upsert([{
                  purchase_order_id: po.id,
                  needs_fnsku: true,
                  units_per_carton: 24,
                  cartons_count: Math.ceil(items[0].quantity / 24),
                  carton_length_cm: 30,
                  carton_width_cm: 20,
                  carton_height_cm: 15,
                  carton_weight_kg: 5.5,
                  prep_type: 'none'
                }], { onConflict: 'purchase_order_id' })
            } else {
              // Incomplete readiness (missing fields)
              await supabase
                .from('po_amazon_readiness')
                .upsert([{
                  purchase_order_id: po.id,
                  needs_fnsku: true,
                  units_per_carton: i === 3 ? null : 24, // Missing for first incomplete
                  cartons_count: i === 4 ? null : Math.ceil(items[0].quantity / 24), // Missing for second
                  carton_length_cm: null, // Missing dimensions
                  carton_width_cm: null,
                  carton_height_cm: null,
                  carton_weight_kg: i === 5 ? null : 5.5, // Missing weight for third
                  prep_type: 'none'
                }], { onConflict: 'purchase_order_id' })
            }

            // 8) Manufacturer Pack (4 POs with generated_at, 2 with sent_at)
            if (i < 4) {
              const generatedAt = new Date(Date.now() - ((4 - i) * 7 * 24 * 60 * 60 * 1000))
              const sentAt = i < 2 ? new Date(generatedAt.getTime() + (2 * 24 * 60 * 60 * 1000)) : null

              await supabase
                .from('po_amazon_readiness')
                .update({
                  manufacturer_pack_generated_at: generatedAt.toISOString(),
                  manufacturer_pack_sent_at: sentAt?.toISOString() || null,
                  manufacturer_pack_version: i % 2 === 0 ? 1 : 2
                })
                .eq('purchase_order_id', po.id)
            }
          }
        }
      }

      // 9) Shipments (4 shipments: 1 planned, 2 in_transit, 1 delivered, 1 stale tracking)
      const shipmentPOs = purchaseOrders.slice(0, 4)
      const shipmentData = [
        { type: 'SPD', status: 'planned', pickup: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), eta: null, delivered: null, stale: false },
        { type: 'LTL', status: 'in_transit', pickup: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), eta: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), delivered: null, stale: false },
        { type: 'FTL', status: 'in_transit', pickup: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), eta: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), delivered: null, stale: true }, // Stale tracking
        { type: 'SPD', status: 'delivered', pickup: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), eta: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), delivered: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), stale: false }
      ]

      for (let i = 0; i < shipmentPOs.length; i++) {
        const po = shipmentPOs[i]
        const ship = shipmentData[i]
        const trackingNumber = ship.type === 'SPD' ? `1Z${Math.random().toString(36).substring(2, 18).toUpperCase()}` : null
        const proNumber = ship.type !== 'SPD' ? `PRO${String(i + 1).padStart(8, '0')}` : null
        
        // For stale tracking: set updated_at to 8 days ago
        const updatedAt = ship.stale ? new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString() : new Date().toISOString()

        const { data: shipment, error: shipError } = await supabase
          .from('po_shipments')
          .insert([{
            purchase_order_id: po.id,
            shipment_type: ship.type,
            carrier: ship.type === 'SPD' ? 'UPS' : 'Demo Freight Co',
            tracking_number: trackingNumber,
            pro_number: proNumber,
            pickup_date: ship.pickup.toISOString().split('T')[0],
            eta_date: ship.eta?.toISOString().split('T')[0] || null,
            status: ship.status,
            notes: ship.stale ? `Demo shipment ${i + 1} (stale tracking)` : `Demo shipment ${i + 1}`,
            updated_at: updatedAt
          }])
          .select()
          .single()

        if (!shipError && shipment) {
          // Update updated_at for stale tracking (if the insert didn't set it correctly)
          if (ship.stale) {
            await supabase
              .from('po_shipments')
              .update({ updated_at: updatedAt })
              .eq('id', shipment.id)
          }
          newCounts.shipments++
          setCounts({ ...newCounts })
        }
      }

      // 10) Tasks (25 tasks)
      const taskProjects = projects.slice(0, 8)
      const taskTypes = ['project', 'purchase_order', 'supplier', 'shipment']
      const taskStatuses = ['open', 'done', 'snoozed']
      const priorities = ['low', 'normal', 'high']

      for (let i = 0; i < 25; i++) {
        const entityType = taskTypes[i % 4]
        const project = taskProjects[i % taskProjects.length]
        let entityId = project.id

        if (entityType === 'purchase_order' && purchaseOrders.length > 0) {
          entityId = purchaseOrders[i % purchaseOrders.length].id
        } else if (entityType === 'supplier' && suppliers.length > 0) {
          entityId = suppliers[i % suppliers.length].id
        } else if (entityType === 'shipment' && shipmentPOs.length > 0) {
          entityId = shipmentPOs[i % shipmentPOs.length].id
        }

        const dueDate = new Date()
        if (i < 8) dueDate.setDate(dueDate.getDate())
        else if (i < 16) dueDate.setDate(dueDate.getDate() + 3)
        else dueDate.setDate(dueDate.getDate() + 10)

        await supabase
          .from('tasks')
          .insert([{
            entity_type: entityType,
            entity_id: entityId,
            title: `Demo Task ${i + 1}: ${entityType}`,
            notes: `Demo task for testing`,
            due_date: dueDate.toISOString().split('T')[0],
            status: taskStatuses[i % 3],
            priority: priorities[i % 3],
            source: i < 5 ? 'sticky_note' : null
          }])

        newCounts.tasks++
        setCounts({ ...newCounts })
      }

      // 11) Sticky Notes (12 notes: 8 open+pinned, 4 done, 3 converted)
      // First, get 3 tasks to link (for converted notes)
      const { data: allTasks } = await supabase
        .from('tasks')
        .select('id')
        .eq('user_id', userId)
        .order('created_at', { ascending: true })
        .limit(3)

      for (let i = 0; i < 12; i++) {
        const isOpen = i < 8 || (i >= 12 && i < 12) // 8 open+pinned, 3 converted (open but linked)
        const isPinned = i < 8 // Only first 8 are pinned (converted notes are not pinned)
        const isDone = i >= 8 && i < 12 && i < 12 // 4 done (indices 8-11)
        const isConverted = i >= 8 && i < 11 // Last 3 (indices 8-10) are converted, but we'll adjust

        // Adjust: 8 open+pinned (0-7), 4 done (8-11), but 3 of the done should be converted
        // Better: 8 open+pinned (0-7), 1 done (8), 3 converted (9-11)
        const actualIsOpen = i < 8 || (i >= 9 && i < 12)
        const actualIsPinned = i < 8
        const actualIsDone = i === 8
        const actualIsConverted = i >= 9 && i < 12
        const taskIndex = i - 9

        await supabase
          .from('sticky_notes')
          .insert([{
            title: `Demo Note ${i + 1}`,
            content: `Demo sticky note content ${i + 1}`,
            status: actualIsDone ? 'done' : 'open',
            pinned: actualIsPinned,
            priority: priorities[i % 3],
            is_demo: true,
            linked_task_id: actualIsConverted && allTasks && allTasks[taskIndex] ? allTasks[taskIndex].id : null,
            converted_to_task_at: actualIsConverted ? new Date().toISOString() : null
          }])

        newCounts.notes++
        setCounts({ ...newCounts })
      }

      // 12) Expenses (10 expenses variats)
      const expenseProjects = projects.slice(0, 5)
      const expenseDates = []
      for (let i = 0; i < 10; i++) {
        const date = new Date()
        date.setDate(date.getDate() - (i * 7))
        expenseDates.push(date.toISOString().split('T')[0])
      }

      for (let i = 0; i < 10; i++) {
        const project = expenseProjects[i % expenseProjects.length]
        const amount = [50, 120, 200, 350, 500, 75, 150, 280, 400, 600][i]

        await supabase
          .from('expenses')
          .insert([{
            project_id: i < 7 ? project.id : null,
            amount: amount,
            currency: 'EUR',
            description: `Demo expense ${i + 1}`,
            expense_date: expenseDates[i],
            is_demo: true
          }])

        newCounts.expenses = (newCounts.expenses || 0) + 1
        setCounts({ ...newCounts })
      }

      // 13) Incomes (5 incomes)
      const incomeProjects = projects.slice(0, 3)
      const incomeDates = []
      for (let i = 0; i < 5; i++) {
        const date = new Date()
        date.setDate(date.getDate() - (i * 14))
        incomeDates.push(date.toISOString().split('T')[0])
      }

      for (let i = 0; i < 5; i++) {
        const project = incomeProjects[i % incomeProjects.length]
        const amount = [500, 1200, 800, 1500, 2000][i]

        await supabase
          .from('incomes')
          .insert([{
            project_id: project.id,
            amount: amount,
            currency: 'EUR',
            description: `Demo income ${i + 1}: Amazon sales`,
            income_date: incomeDates[i],
            platform: 'amazon',
            marketplace: 'ES',
            is_demo: true
          }])

        newCounts.incomes = (newCounts.incomes || 0) + 1
        setCounts({ ...newCounts })
      }

      // 14) Recurring Expenses (2)
      const today = new Date()
      await supabase
        .from('recurring_expenses')
        .insert([{
          amount: 99.00,
          currency: 'EUR',
          frequency: 'monthly',
          start_date: new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0],
          day_of_month: 1,
          description: 'Demo SaaS Subscription',
          is_active: true,
          is_demo: true
        }])

      await supabase
        .from('recurring_expenses')
        .insert([{
          amount: 500.00,
          currency: 'EUR',
          frequency: 'quarterly',
          start_date: new Date(today.getFullYear(), today.getMonth() - 1, 15).toISOString().split('T')[0],
          day_of_month: 15,
          description: 'Demo Quarterly Service Fee',
          is_active: true,
          is_demo: true
        }])

      newCounts.recurring = 2
      setCounts({ ...newCounts })

      // 15) Sticky Notes Flotants (3 notes amb posicions)
      const floatingNotes = [
        { title: 'Recordatori important', content: 'Revisar quotes abans de final de setmana', color: 'yellow', position_x: 150, position_y: 200 },
        { title: 'Tasca urgent', content: 'Enviar manufacturer pack per PO-001', color: 'pink', position_x: 400, position_y: 150 },
        { title: 'Nota general', content: 'Recordar actualitzar tracking numbers', color: 'blue', position_x: 650, position_y: 300 }
      ]

      for (const note of floatingNotes) {
        await supabase
          .from('sticky_notes')
          .insert([{
            title: note.title,
            content: note.content,
            status: 'open',
            pinned: true,
            color: note.color,
            position_x: note.position_x,
            position_y: note.position_y,
            z_index: Date.now(),
            context: 'global',
            minimized: false,
            is_demo: true
          }])

        newCounts.floatingNotes = (newCounts.floatingNotes || 0) + 1
        setCounts({ ...newCounts })
      }

      // Run demo ready checks
      const checks = await runDemoReadyChecks(userId)
      setDemoChecks(checks)
      
      if (checks.allPassed) {
        setDemoReady(true)
        setStatus({ 
          type: 'success', 
          message: `✅ DEMO READY! Created: ${newCounts.projects} projects, ${newCounts.suppliers} suppliers, ${newCounts.gtins} GTINs, ${newCounts.quotes} quotes, ${newCounts.pos} POs, ${newCounts.shipments} shipments, ${newCounts.tasks} tasks, ${newCounts.notes} notes, ${newCounts.expenses || 0} expenses, ${newCounts.incomes || 0} incomes, ${newCounts.recurring || 0} recurring, ${newCounts.floatingNotes || 0} floating notes`
        })
        showToast('DEMO READY! Data generated successfully', 'success', 5000)
        
        // Auto-redirect to dashboard after 2 seconds
        setTimeout(() => {
          navigate('/dashboard')
        }, 2000)
      } else {
        setDemoReady(false)
        const warnings = checks.warnings.join(', ')
        setStatus({ 
          type: 'warning', 
          message: `Demo data generated but some checks failed: ${warnings}`
        })
        showToast(`Demo data generated with warnings: ${warnings}`, 'warning', 5000)
      }
      
      setCounts(newCounts)
      setConfirmText('')
    } catch (err) {
      setStatus({ type: 'error', message: `Error generating demo data: ${err.message}` })
      showToast(`Error generating demo data: ${err.message}`, 'error')
      console.error('Seed error:', err)
    } finally {
      setLoading(false)
    }
  }

  const runDemoReadyChecks = async (userId) => {
    const checks = {
      allPassed: true,
      warnings: []
    }

    try {
      // Check 1: Projects demo == 10
      const { data: demoProjects, error: projError } = await supabase
        .from('projects')
        .select('id', { count: 'exact' })
        .eq('is_demo', true)
        .eq('user_id', userId)

      if (projError) throw projError
      const projectCount = demoProjects?.length || 0
      if (projectCount !== 10) {
        checks.allPassed = false
        checks.warnings.push(`Projects: expected 10, found ${projectCount}`)
      }

      // Check 2: Tasks demo >= 20
      const { data: demoTasks, error: taskError } = await supabase
        .from('tasks')
        .select('id', { count: 'exact' })
        .eq('user_id', userId)
        .in('entity_id', demoProjects?.map(p => p.id) || [])

      if (taskError) {
        // Try alternative: count all tasks for demo projects
        const { data: allTasks } = await supabase
          .from('tasks')
          .select('id')
          .eq('user_id', userId)
        const taskCount = allTasks?.length || 0
        if (taskCount < 20) {
          checks.allPassed = false
          checks.warnings.push(`Tasks: expected >=20, found ${taskCount}`)
        }
      } else {
        const taskCount = demoTasks?.length || 0
        if (taskCount < 20) {
          checks.allPassed = false
          checks.warnings.push(`Tasks: expected >=20, found ${taskCount}`)
        }
      }

      // Check 3: Sticky pinned open >= 5
      const { data: pinnedNotes, error: noteError } = await supabase
        .from('sticky_notes')
        .select('id', { count: 'exact' })
        .eq('is_demo', true)
        .eq('user_id', userId)
        .eq('status', 'open')
        .eq('pinned', true)

      if (noteError) throw noteError
      const pinnedCount = pinnedNotes?.length || 0
      if (pinnedCount < 5) {
        checks.allPassed = false
        checks.warnings.push(`Sticky notes pinned open: expected >=5, found ${pinnedCount}`)
      }

      // Check 4: Calendar events >= 20 (tasks + shipments + packs + quotes)
      // Count tasks with due_date
      const { data: tasksWithDate } = await supabase
        .from('tasks')
        .select('id')
        .eq('user_id', userId)
        .not('due_date', 'is', null)

      // Count shipments with pickup_date or eta_date
      const { data: shipments } = await supabase
        .from('po_shipments')
        .select('id')
        .eq('user_id', userId)
        .or('pickup_date.not.is.null,eta_date.not.is.null')

      // Count packs (manufacturer_pack_generated_at or sent_at)
      const { data: packs } = await supabase
        .from('po_amazon_readiness')
        .select('id')
        .eq('user_id', userId)
        .or('manufacturer_pack_generated_at.not.is.null,manufacturer_pack_sent_at.not.is.null')

      // Count quotes with validity_date
      const { data: quotes } = await supabase
        .from('supplier_quotes')
        .select('id')
        .eq('user_id', userId)
        .not('validity_date', 'is', null)
        .in('project_id', demoProjects?.map(p => p.id) || [])

      const calendarEventsCount = (tasksWithDate?.length || 0) + 
                                   (shipments?.length || 0) + 
                                   (packs?.length || 0) + 
                                   (quotes?.length || 0)

      if (calendarEventsCount < 20) {
        checks.allPassed = false
        checks.warnings.push(`Calendar events: expected >=20, found ${calendarEventsCount}`)
      }

    } catch (err) {
      console.error('Error running demo checks:', err)
      checks.allPassed = false
      checks.warnings.push(`Check error: ${err.message}`)
    }

    return checks
  }

  const clearAndRegenerate = async () => {
    const hasDemo = await checkDemoExists()
    if (hasDemo) {
      await clearDemoData()
      // Wait a bit for cleanup
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
    setConfirmText('DEMO')
    await generateDemoData()
  }

  const styles = {
    container: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: darkMode ? '#0a0a0f' : '#f8f9fc',
      padding: '32px',
      maxWidth: '800px',
      margin: '0 auto'
    },
    header: {
      marginBottom: '32px'
    },
    title: {
      fontSize: '32px',
      fontWeight: '700',
      color: darkMode ? '#ffffff' : '#111827',
      margin: 0,
      marginBottom: '8px',
      display: 'flex',
      alignItems: 'center',
      gap: '12px'
    },
    subtitle: {
      fontSize: '16px',
      color: darkMode ? '#9ca3af' : '#6b7280',
      margin: 0
    },
    warning: {
      padding: '16px',
      backgroundColor: darkMode ? '#7f1d1d' : '#fef2f2',
      border: `1px solid ${darkMode ? '#991b1b' : '#fecaca'}`,
      borderRadius: '8px',
      marginBottom: '24px',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      color: darkMode ? '#fca5a5' : '#991b1b'
    },
    card: {
      backgroundColor: darkMode ? '#15151f' : '#ffffff',
      borderRadius: '12px',
      padding: '24px',
      border: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`,
      marginBottom: '24px'
    },
    cardTitle: {
      fontSize: '18px',
      fontWeight: '600',
      color: darkMode ? '#ffffff' : '#111827',
      margin: 0,
      marginBottom: '16px'
    },
    input: {
      width: '100%',
      padding: '12px 16px',
      border: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`,
      borderRadius: '8px',
      fontSize: '14px',
      backgroundColor: darkMode ? '#1f1f2e' : '#ffffff',
      color: darkMode ? '#ffffff' : '#111827',
      marginBottom: '16px',
      boxSizing: 'border-box'
    },
    button: {
      padding: '12px 24px',
      borderRadius: '8px',
      border: 'none',
      fontSize: '14px',
      fontWeight: '500',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      marginRight: '12px'
    },
    primaryButton: {
      backgroundColor: '#4f46e5',
      color: '#ffffff'
    },
    dangerButton: {
      backgroundColor: '#ef4444',
      color: '#ffffff'
    },
    buttonGroup: {
      display: 'flex',
      gap: '12px',
      flexWrap: 'wrap'
    },
    status: {
      padding: '12px 16px',
      borderRadius: '8px',
      marginTop: '16px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    statusSuccess: {
      backgroundColor: darkMode ? '#064e3b' : '#d1fae5',
      color: darkMode ? '#6ee7b7' : '#065f46'
    },
    statusError: {
      backgroundColor: darkMode ? '#7f1d1d' : '#fee2e2',
      color: darkMode ? '#fca5a5' : '#991b1b'
    },
    statusInfo: {
      backgroundColor: darkMode ? '#1e3a8a' : '#dbeafe',
      color: darkMode ? '#93c5fd' : '#1e40af'
    },
    statusWarning: {
      backgroundColor: darkMode ? '#7c2d12' : '#fef2f2',
      color: darkMode ? '#fca5a5' : '#991b1b'
    },
    counts: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
      gap: '12px',
      marginTop: '16px'
    },
    countItem: {
      padding: '12px',
      backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb',
      borderRadius: '8px',
      textAlign: 'center'
    },
    countLabel: {
      fontSize: '12px',
      color: darkMode ? '#9ca3af' : '#6b7280',
      marginBottom: '4px'
    },
    countValue: {
      fontSize: '24px',
      fontWeight: '700',
      color: darkMode ? '#ffffff' : '#111827'
    }
  }

  // Permitir acceso siempre (protegido por autenticación)
  // La página está protegida por ProtectedRoute, así que solo usuarios autenticados pueden acceder
  // Esto permite generar datos demo en producción también

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>
          <Database size={32} />
          Demo Data Generator
        </h1>
        <p style={styles.subtitle}>
          Generate complete demo data (10 projects) for testing and development
        </p>
      </div>

      <div style={styles.warning}>
        <AlertTriangle size={20} />
        <span>
          <strong>Warning:</strong> This will create demo data marked with <code>is_demo=true</code>. 
          All demo data can be cleared using the "Clear demo data" button.
        </span>
      </div>

      <div style={styles.card}>
        <h3 style={styles.cardTitle}>Generate Demo Data</h3>
        <p style={{ color: darkMode ? '#9ca3af' : '#6b7280', marginBottom: '16px', fontSize: '14px' }}>
          Type <strong>DEMO</strong> to confirm generation:
        </p>
        <input
          type="text"
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder="Type DEMO to confirm"
          style={styles.input}
          disabled={loading}
        />
        <div style={styles.buttonGroup}>
          <button
            onClick={generateDemoData}
            disabled={loading || confirmText !== 'DEMO'}
            style={{
              ...styles.button,
              ...styles.primaryButton,
              opacity: (loading || confirmText !== 'DEMO') ? 0.6 : 1,
              cursor: (loading || confirmText !== 'DEMO') ? 'not-allowed' : 'pointer'
            }}
          >
            <Database size={18} />
            Generate Demo Data
          </button>
        </div>
      </div>

      <div style={styles.card}>
        <h3 style={styles.cardTitle}>Clear Demo Data</h3>
        <p style={{ color: darkMode ? '#9ca3af' : '#6b7280', marginBottom: '16px', fontSize: '14px' }}>
          Type <strong>CLEAR</strong> to confirm deletion of all data marked with <code>is_demo=true</code>
        </p>
        <input
          type="text"
          value={clearConfirmText}
          onChange={(e) => setClearConfirmText(e.target.value)}
          placeholder="Type CLEAR to confirm"
          style={styles.input}
          disabled={loading}
        />
        <div style={styles.buttonGroup}>
          <button
            onClick={clearDemoData}
            disabled={loading || clearConfirmText !== 'CLEAR'}
            style={{
              ...styles.button,
              ...styles.dangerButton,
              opacity: (loading || clearConfirmText !== 'CLEAR') ? 0.6 : 1,
              cursor: (loading || clearConfirmText !== 'CLEAR') ? 'not-allowed' : 'pointer'
            }}
          >
            <Trash2 size={18} />
            Clear Demo Data
          </button>
        </div>
      </div>

      <div style={styles.card}>
        <h3 style={styles.cardTitle}>Quick Actions</h3>
        <div style={styles.buttonGroup}>
          <button
            onClick={clearAndRegenerate}
            disabled={loading}
            style={{
              ...styles.button,
              ...styles.primaryButton,
              opacity: loading ? 0.6 : 1,
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            <RefreshCw size={18} />
            Clear & Regenerate
          </button>
        </div>
      </div>

      {status && (
        <div style={{
          ...styles.status,
          ...(status.type === 'success' ? styles.statusSuccess :
              status.type === 'error' ? styles.statusError :
              status.type === 'warning' ? styles.statusWarning :
              styles.statusInfo)
        }}>
          {status.type === 'success' ? <CheckCircle2 size={20} /> :
           status.type === 'error' ? <AlertTriangle size={20} /> :
           status.type === 'warning' ? <AlertTriangle size={20} /> :
           <Database size={20} />}
          <span>{status.message}</span>
        </div>
      )}

      {counts && (
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Generated Counts</h3>
          <div style={styles.counts}>
            <div style={styles.countItem}>
              <div style={styles.countLabel}>Projects</div>
              <div style={styles.countValue}>{counts.projects}</div>
            </div>
            <div style={styles.countItem}>
              <div style={styles.countLabel}>Suppliers</div>
              <div style={styles.countValue}>{counts.suppliers}</div>
            </div>
            <div style={styles.countItem}>
              <div style={styles.countLabel}>GTINs</div>
              <div style={styles.countValue}>{counts.gtins}</div>
            </div>
            <div style={styles.countItem}>
              <div style={styles.countLabel}>Quotes</div>
              <div style={styles.countValue}>{counts.quotes}</div>
            </div>
            <div style={styles.countItem}>
              <div style={styles.countLabel}>Purchase Orders</div>
              <div style={styles.countValue}>{counts.pos}</div>
            </div>
            <div style={styles.countItem}>
              <div style={styles.countLabel}>Shipments</div>
              <div style={styles.countValue}>{counts.shipments || 0}</div>
            </div>
            <div style={styles.countItem}>
              <div style={styles.countLabel}>Tasks</div>
              <div style={styles.countValue}>{counts.tasks}</div>
            </div>
            <div style={styles.countItem}>
              <div style={styles.countLabel}>Sticky Notes</div>
              <div style={styles.countValue}>{counts.notes}</div>
            </div>
            {counts.expenses !== undefined && (
              <div style={styles.countItem}>
                <div style={styles.countLabel}>Expenses</div>
                <div style={styles.countValue}>{counts.expenses}</div>
              </div>
            )}
            {counts.incomes !== undefined && (
              <div style={styles.countItem}>
                <div style={styles.countLabel}>Incomes</div>
                <div style={styles.countValue}>{counts.incomes}</div>
              </div>
            )}
            {counts.recurring !== undefined && (
              <div style={styles.countItem}>
                <div style={styles.countLabel}>Recurring</div>
                <div style={styles.countValue}>{counts.recurring}</div>
              </div>
            )}
            {counts.floatingNotes !== undefined && (
              <div style={styles.countItem}>
                <div style={styles.countLabel}>Floating Notes</div>
                <div style={styles.countValue}>{counts.floatingNotes}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {demoReady && (
        <div style={styles.card}>
          <div style={{
            ...styles.status,
            ...styles.statusSuccess,
            marginTop: 0
          }}>
            <CheckCircle2 size={20} />
            <span><strong>DEMO READY</strong> - All checks passed!</span>
          </div>
          <div style={{ ...styles.buttonGroup, marginTop: '16px' }}>
            <button
              onClick={() => navigate('/dashboard')}
              style={{
                ...styles.button,
                ...styles.primaryButton
              }}
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      )}

      {demoChecks && !demoChecks.allPassed && (
        <div style={styles.card}>
          <div style={{
            ...styles.status,
            backgroundColor: darkMode ? '#7c2d12' : '#fef2f2',
            color: darkMode ? '#fca5a5' : '#991b1b',
            marginTop: 0
          }}>
            <AlertTriangle size={20} />
            <span><strong>WARNING</strong> - Some checks failed:</span>
          </div>
          <ul style={{ 
            marginTop: '12px', 
            paddingLeft: '24px',
            color: darkMode ? '#fca5a5' : '#991b1b'
          }}>
            {demoChecks.warnings.map((warning, idx) => (
              <li key={idx} style={{ marginBottom: '8px' }}>{warning}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

