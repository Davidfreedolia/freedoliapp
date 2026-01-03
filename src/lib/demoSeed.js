import { supabase, getCurrentUserId, upsertProjectProfitability } from './supabase'
import { showToast } from '../components/Toast'

/**
 * Check if demo data exists
 */
export const checkDemoExists = async () => {
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

/**
 * Check if real (non-demo) data exists
 */
export const checkRealDataExists = async () => {
  try {
    const userId = await getCurrentUserId()
    const { data, error } = await supabase
      .from('projects')
      .select('id')
      .eq('user_id', userId)
      .or('is_demo.is.null,is_demo.eq.false')
      .limit(1)
    
    if (error) throw error
    return (data || []).length > 0
  } catch (err) {
    console.error('Error checking real data:', err)
    return false
  }
}

/**
 * Generate demo data (10 complete projects)
 * Returns { success: boolean, message: string, counts?: object }
 */
export const generateDemoData = async (onProgress = null) => {
  try {
    const userId = await getCurrentUserId()
    const hasDemo = await checkDemoExists()
    
    // If demo already exists, skip
    if (hasDemo) {
      return { success: true, message: 'Demo data already exists', skipped: true }
    }

    const newCounts = { projects: 0, suppliers: 0, gtins: 0, quotes: 0, pos: 0, tasks: 0, notes: 0, shipments: 0, expenses: 0, incomes: 0, recurring: 0, floatingNotes: 0 }

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
          user_id: userId, // Always set user_id explicitly
          is_demo: true // Always true for demo data
        }])
        .select()
        .single()

      if (error) throw error
      suppliers.push(supplier)
      newCounts.suppliers++
      if (onProgress) onProgress({ ...newCounts })
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
      if (onProgress) onProgress({ ...newCounts })

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
          user_id: userId, // Always set user_id explicitly
          is_demo: true, // Always true for demo data
          assigned_to_project_id: i < 60 ? null : projects[i % 6].id,
          assigned_at: i < 60 ? null : new Date().toISOString()
        }])
        .select()
        .single()

      if (!error && gtin) {
        gtinPool.push(gtin)
        newCounts.gtins++
        if (onProgress) onProgress({ ...newCounts })
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
            asin: `B0${String(Math.floor(Math.random() * 90000000) + 10000000)}`,
            user_id: userId, // Always set user_id explicitly
            is_demo: true // Always true for demo data
          }])
      }
    }

    // 5) Supplier Quotes (3 projects with 2 quotes each)
    const quoteProjects = projects.slice(0, 3)
    for (const project of quoteProjects) {
      for (let q = 0; q < 2; q++) {
        const supplier = suppliers[q === 0 ? 0 : 1]
        const isBetterPrice = q === 0
        
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
            notes: `Demo quote ${q + 1} for ${project.name}`,
            user_id: userId, // Always set user_id explicitly
            is_demo: true // Always true for demo data
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
                unit_price: br.unit_price,
                user_id: userId, // Always set user_id explicitly
                is_demo: true // Always true for demo data
              }])
          }

          newCounts.quotes++
          if (onProgress) onProgress({ ...newCounts })
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
      const supplier = suppliers[i % 5]

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
            total_amount: items.reduce((sum, item) => sum + item.total, 0),
            user_id: userId, // Always set user_id explicitly
            is_demo: true // Always true for demo data
          }])
          .select()
          .single()

        if (!poError && po) {
          purchaseOrders.push(po)
          newCounts.pos++
          if (onProgress) onProgress({ ...newCounts })

          // 7) Amazon Readiness (3 complete, 3 incomplete)
          if (i < 3) {
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
                prep_type: 'none',
                is_demo: true
              }], { onConflict: 'purchase_order_id' })
          } else {
            await supabase
              .from('po_amazon_readiness')
              .upsert([{
                purchase_order_id: po.id,
                needs_fnsku: true,
                units_per_carton: i === 3 ? null : 24,
                cartons_count: i === 4 ? null : Math.ceil(items[0].quantity / 24),
                carton_length_cm: null,
                carton_width_cm: null,
                carton_height_cm: null,
                carton_weight_kg: i === 5 ? null : 5.5,
                prep_type: 'none',
                user_id: userId, // Always set user_id explicitly
                is_demo: true // Always true for demo data
              }], { onConflict: 'user_id,purchase_order_id' })
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
      { type: 'SPD', status: 'planned', pickup: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), eta: null, delivered: null, stale: false },
      { type: 'LTL', status: 'in_transit', pickup: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), eta: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), delivered: null, stale: false },
      { type: 'FTL', status: 'in_transit', pickup: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), eta: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), delivered: null, stale: true },
      { type: 'SPD', status: 'delivered', pickup: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), eta: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), delivered: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), stale: false }
    ]

    for (let i = 0; i < shipmentPOs.length; i++) {
      const po = shipmentPOs[i]
      const ship = shipmentData[i]
      const trackingNumber = ship.type === 'SPD' ? `1Z${Math.random().toString(36).substring(2, 18).toUpperCase()}` : null
      const proNumber = ship.type !== 'SPD' ? `PRO${String(i + 1).padStart(8, '0')}` : null
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
          updated_at: updatedAt,
          user_id: userId, // Always set user_id explicitly
          is_demo: true // Always true for demo data
        }])
        .select()
        .single()

      if (!shipError && shipment) {
        if (ship.stale) {
          await supabase
            .from('po_shipments')
            .update({ updated_at: updatedAt })
            .eq('id', shipment.id)
        }
        newCounts.shipments++
        if (onProgress) onProgress({ ...newCounts })
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
          source: i < 5 ? 'sticky_note' : null,
          user_id: userId, // Always set user_id explicitly
          is_demo: true // Always true for demo data
        }])

      newCounts.tasks++
      if (onProgress) onProgress({ ...newCounts })
    }

    // 11) Sticky Notes (12 notes: 8 open+pinned, 1 done, 3 converted)
    const { data: allTasks } = await supabase
      .from('tasks')
      .select('id')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
      .limit(3)

    for (let i = 0; i < 12; i++) {
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
          user_id: userId, // Always set user_id explicitly
          is_demo: true, // Always true for demo data
          linked_task_id: actualIsConverted && allTasks && allTasks[taskIndex] ? allTasks[taskIndex].id : null,
          converted_to_task_at: actualIsConverted ? new Date().toISOString() : null
        }])

      newCounts.notes++
      if (onProgress) onProgress({ ...newCounts })
    }

    // 12) Expenses (10 expenses variats)
    const expenseProjects = projects.slice(0, 5)
    const expenseCategories = ['Marketing', 'Shipping', 'Packaging', 'Tools', 'Software']
    const expenseDates = []
    for (let i = 0; i < 10; i++) {
      const date = new Date()
      date.setDate(date.getDate() - (i * 7)) // Últims 70 dies
      expenseDates.push(date.toISOString().split('T')[0])
    }

    for (let i = 0; i < 10; i++) {
      const project = expenseProjects[i % expenseProjects.length]
      const amount = [50, 120, 200, 350, 500, 75, 150, 280, 400, 600][i]
      const category = expenseCategories[i % expenseCategories.length]

      await supabase
        .from('expenses')
        .insert([{
          project_id: i < 7 ? project.id : null, // 7 amb projecte, 3 sense
          amount: amount,
          currency: 'EUR',
          description: `Demo expense ${i + 1}: ${category}`,
          expense_date: expenseDates[i],
          notes: `Demo expense for testing`,
          user_id: userId, // Always set user_id explicitly
          is_demo: true // Always true for demo data
        }])

      newCounts.expenses = (newCounts.expenses || 0) + 1
      if (onProgress) onProgress({ ...newCounts })
    }

    // 13) Incomes (5 incomes)
    const incomeProjects = projects.slice(0, 3)
    const incomeDates = []
    for (let i = 0; i < 5; i++) {
      const date = new Date()
      date.setDate(date.getDate() - (i * 14)) // Últims 70 dies
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
          notes: `Demo income for testing`,
          user_id: userId, // Always set user_id explicitly
          is_demo: true // Always true for demo data
        }])

      newCounts.incomes = (newCounts.incomes || 0) + 1
      if (onProgress) onProgress({ ...newCounts })
    }

    // 14) Recurring Expenses (2)
    const today = new Date()
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1)
    
    // Recurring 1: Monthly subscription
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
        user_id: userId, // Always set user_id explicitly
        is_demo: true // Always true for demo data
      }])

    // Recurring 2: Quarterly service
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
        user_id: userId, // Always set user_id explicitly
        is_demo: true // Always true for demo data
      }])

    newCounts.recurring = 2
    if (onProgress) onProgress({ ...newCounts })

    // 15) Sticky Notes Flotants (3 notes amb posicions)
    const floatingNotes = [
      { 
        title: 'Recordatori important', 
        content: 'Revisar quotes abans de final de setmana',
        color: 'yellow',
        position_x: 150,
        position_y: 200,
        z_index: Date.now()
      },
      { 
        title: 'Tasca urgent', 
        content: 'Enviar manufacturer pack per PO-001',
        color: 'pink',
        position_x: 400,
        position_y: 150,
        z_index: Date.now() + 1
      },
      { 
        title: 'Nota general', 
        content: 'Recordar actualitzar tracking numbers',
        color: 'blue',
        position_x: 650,
        position_y: 300,
        z_index: Date.now() + 2
      }
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
          z_index: note.z_index,
          context: 'global',
          minimized: false,
          user_id: userId, // Always set user_id explicitly
          is_demo: true // Always true for demo data
        }])

      newCounts.floatingNotes = (newCounts.floatingNotes || 0) + 1
      if (onProgress) onProgress({ ...newCounts })
    }

    return {
      success: true,
      message: `Demo data generated successfully! Created: ${newCounts.projects} projects, ${newCounts.suppliers} suppliers, ${newCounts.gtins} GTINs, ${newCounts.quotes} quotes, ${newCounts.pos} POs, ${newCounts.shipments} shipments, ${newCounts.tasks} tasks, ${newCounts.notes} notes, ${newCounts.expenses || 0} expenses, ${newCounts.incomes || 0} incomes, ${newCounts.recurring || 0} recurring, ${newCounts.floatingNotes || 0} floating notes`,
      counts: newCounts
    }
  } catch (err) {
    console.error('Error generating demo data:', err)
    return {
      success: false,
      message: `Error generating demo data: ${err.message}`
    }
  }
}

/**
 * Clear all demo data
 * Returns { success: boolean, message: string }
 */
export const clearDemoData = async () => {
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
      'expenses',
      'incomes',
      'recurring_expenses',
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
            
            // Special handling for po_amazon_readiness and po_shipments which link to purchase_orders
            if (table === 'purchase_orders') {
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

                await supabase
                  .from('po_shipments')
                  .delete()
                  .eq('user_id', userId)
                  .in('purchase_order_id', poIds)
              }
            }
            
            await supabase
              .from(table)
              .delete()
              .eq('user_id', userId)
              .in('project_id', projectIds)
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
        } else if (table === 'expenses') {
          // Delete demo expenses
          await supabase
            .from('expenses')
            .delete()
            .eq('user_id', userId)
            .eq('is_demo', true)
        } else if (table === 'incomes') {
          // Delete demo incomes
          await supabase
            .from('incomes')
            .delete()
            .eq('user_id', userId)
            .eq('is_demo', true)
        } else if (table === 'recurring_expenses') {
          // Delete demo recurring expenses
          await supabase
            .from('recurring_expenses')
            .delete()
            .eq('user_id', userId)
            .eq('is_demo', true)
        } else if (table === 'tasks') {
          // Delete demo tasks
          await supabase
            .from('tasks')
            .delete()
            .eq('user_id', userId)
            .eq('is_demo', true)
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
              .in('entity_id', projectIds)
          }
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
    
    return {
      success: true,
      message: 'Demo data cleared successfully'
    }
  } catch (err) {
    console.error('Error clearing demo data:', err)
    return {
      success: false,
      message: `Error clearing demo data: ${err.message}`
    }
  }
}

