import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useApp } from '../context/AppContext'
import { supabase, getCurrentUserId } from '../lib/supabase'
import { AlertTriangle, Database, Trash2, CheckCircle2 } from 'lucide-react'

export default function DevSeed() {
  const { darkMode } = useApp()
  const { t } = useTranslation()
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState(null)
  const [counts, setCounts] = useState(null)
  const [confirmText, setConfirmText] = useState('')

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
    setLoading(true)
    setStatus({ type: 'info', message: 'Clearing demo data...' })
    
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
    } catch (err) {
      setStatus({ type: 'error', message: `Error clearing demo data: ${err.message}` })
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
    setCounts({ projects: 0, suppliers: 0, gtins: 0, quotes: 0, pos: 0, tasks: 0, notes: 0 })

    try {
      const userId = await getCurrentUserId()
      const hasDemo = await checkDemoExists()
      
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
        { name: 'Demo Wireless Earbuds', phase: 1, decision: null },
        { name: 'Demo Phone Case Pro', phase: 2, decision: 'HOLD' },
        { name: 'Demo Smart Watch', phase: 3, decision: 'GO' },
        { name: 'Demo Laptop Stand', phase: 4, decision: 'GO' },
        { name: 'Demo USB Cable', phase: 2, decision: 'DISCARDED' },
        { name: 'Demo Power Bank', phase: 5, decision: 'GO' },
        { name: 'Demo Tablet Cover', phase: 3, decision: 'HOLD' },
        { name: 'Demo Keyboard', phase: 6, decision: 'GO' },
        { name: 'Demo Mouse Pad', phase: 1, decision: 'DISCARDED' },
        { name: 'Demo Webcam', phase: 7, decision: 'GO' }
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

      // 9) Shipments (4 shipments)
      const shipmentPOs = purchaseOrders.slice(0, 4)
      const shipmentData = [
        { type: 'SPD', status: 'planned', pickup: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), eta: null, delivered: null },
        { type: 'LTL', status: 'in_transit', pickup: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), eta: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), delivered: null },
        { type: 'FTL', status: 'in_transit', pickup: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), eta: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), delivered: null },
        { type: 'SPD', status: 'delivered', pickup: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), eta: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), delivered: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
      ]

      for (let i = 0; i < shipmentPOs.length; i++) {
        const po = shipmentPOs[i]
        const ship = shipmentData[i]

        await supabase
          .from('po_shipments')
          .insert([{
            purchase_order_id: po.id,
            shipment_type: ship.type,
            carrier: ship.type === 'SPD' ? 'UPS' : 'Demo Freight Co',
            tracking_number: ship.type === 'SPD' ? `1Z${Math.random().toString(36).substring(2, 18).toUpperCase()}` : null,
            pro_number: ship.type !== 'SPD' ? `PRO${String(i + 1).padStart(8, '0')}` : null,
            pickup_date: ship.pickup.toISOString().split('T')[0],
            eta_date: ship.eta?.toISOString().split('T')[0] || null,
            status: ship.status,
            notes: `Demo shipment ${i + 1}`
          }])

        newCounts.shipments++
        setCounts({ ...newCounts })
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

      // 11) Sticky Notes (15 notes: 8 open+pinned, 4 done, 3 converted)
      const convertedTasks = [] // Will store first 3 tasks for linking
      
      // First, get 3 tasks to link
      const { data: allTasks } = await supabase
        .from('tasks')
        .select('id')
        .eq('user_id', userId)
        .limit(3)

      for (let i = 0; i < 15; i++) {
        const isOpen = i < 8 || (i >= 12 && i < 15) // 8 open+pinned, 3 converted (open but linked)
        const isPinned = i < 8 || (i >= 12 && i < 15) // Pinned unless done
        const isDone = i >= 8 && i < 12
        const isConverted = i >= 12 && i < 15

        await supabase
          .from('sticky_notes')
          .insert([{
            title: `Demo Note ${i + 1}`,
            content: `Demo sticky note content ${i + 1}`,
            status: isDone ? 'done' : 'open',
            pinned: isPinned,
            priority: priorities[i % 3],
            is_demo: true,
            linked_task_id: isConverted && allTasks && allTasks[i - 12] ? allTasks[i - 12].id : null,
            converted_to_task_at: isConverted ? new Date().toISOString() : null
          }])

        newCounts.notes++
        setCounts({ ...newCounts })
      }

      setStatus({ 
        type: 'success', 
        message: `Demo data generated successfully! Created: ${newCounts.projects} projects, ${newCounts.suppliers} suppliers, ${newCounts.gtins} GTINs, ${newCounts.quotes} quotes, ${newCounts.pos} POs, ${newCounts.shipments} shipments, ${newCounts.tasks} tasks, ${newCounts.notes} notes`
      })
      setCounts(newCounts)
      setConfirmText('')
    } catch (err) {
      setStatus({ type: 'error', message: `Error generating demo data: ${err.message}` })
      console.error('Seed error:', err)
    } finally {
      setLoading(false)
    }
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

  // Check if in development mode
  const isDev = import.meta.env.VITE_APP_ENV === 'development' || import.meta.env.MODE === 'development'

  if (!isDev) {
    return (
      <div style={styles.container}>
        <div style={styles.warning}>
          <AlertTriangle size={20} />
          <span>This page is only available in development mode.</span>
        </div>
      </div>
    )
  }

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
          Remove all data marked with <code>is_demo=true</code>
        </p>
        <div style={styles.buttonGroup}>
          <button
            onClick={clearDemoData}
            disabled={loading}
            style={{
              ...styles.button,
              ...styles.dangerButton,
              opacity: loading ? 0.6 : 1,
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            <Trash2 size={18} />
            Clear Demo Data
          </button>
        </div>
      </div>

      {status && (
        <div style={{
          ...styles.status,
          ...(status.type === 'success' ? styles.statusSuccess :
              status.type === 'error' ? styles.statusError :
              styles.statusInfo)
        }}>
          {status.type === 'success' ? <CheckCircle2 size={20} /> :
           status.type === 'error' ? <AlertTriangle size={20} /> :
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
          </div>
        </div>
      )}
    </div>
  )
}

