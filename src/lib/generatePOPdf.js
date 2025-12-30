import jsPDF from 'jspdf'
import 'jspdf-autotable'

/**
 * Genera un PDF professional de Purchase Order
 * Format basat en l'Excel de Freedolia
 */
export const generatePOPdf = async (poData, supplier, companySettings) => {
  const doc = new jsPDF('p', 'mm', 'a4')
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 15
  let y = 15

  // Colors
  const primaryColor = [79, 70, 229] // Indigo
  const headerBg = [249, 250, 251]
  const borderColor = [229, 231, 235]

  // ============================================
  // HEADER - Logo i Títol
  // ============================================
  
  // Títol principal
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(0, 0, 0)
  doc.text('FREEDOLIA — PURCHASE ORDER / ORDRE DE COMPRA', pageWidth / 2, y, { align: 'center' })
  
  y += 12

  // ============================================
  // INFORMACIÓ BÀSICA (Buyer + PO Reference)
  // ============================================
  
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  
  // Columna esquerra - Buyer
  const col1X = margin
  const col2X = margin + 35
  const col3X = pageWidth - margin - 60
  const col4X = pageWidth - margin - 25

  // Buyer info
  doc.setFont('helvetica', 'bold')
  doc.text('Buyer / Comprador:', col1X, y)
  doc.setFont('helvetica', 'normal')
  doc.text(companySettings?.legal_name || 'David Castellà Gil', col2X, y)
  
  doc.setFont('helvetica', 'bold')
  doc.text('P.O. Ref:', col3X, y)
  doc.setFont('helvetica', 'normal')
  doc.text(poData.po_number || '', col4X, y)
  
  y += 5
  
  // Address
  doc.setFont('helvetica', 'bold')
  doc.text('HQ Address:', col1X, y)
  doc.setFont('helvetica', 'normal')
  const address = companySettings 
    ? `${companySettings.address}, ${companySettings.postal_code} ${companySettings.city}, ${companySettings.province}, ${companySettings.country}`
    : 'c/ Josep Camprecios, 1, 1-2, 08950 Esplugues de Llobregat, Barcelona, Spain'
  doc.text(address.substring(0, 80), col2X, y, { maxWidth: 90 })
  
  doc.setFont('helvetica', 'bold')
  doc.text('Date / Data:', col3X, y)
  doc.setFont('helvetica', 'normal')
  doc.text(formatDate(poData.order_date), col4X, y)
  
  y += 5
  
  // Mail
  doc.setFont('helvetica', 'bold')
  doc.text('Mail:', col1X, y)
  doc.setFont('helvetica', 'normal')
  doc.text(companySettings?.email || 'david@freedolia.com', col2X, y)
  
  doc.setFont('helvetica', 'bold')
  doc.text('Quote Ref:', col3X, y)
  doc.setFont('helvetica', 'normal')
  doc.text(poData.quote_ref || '', col4X, y)
  
  y += 5
  
  // NIF
  doc.setFont('helvetica', 'bold')
  doc.text('NIF:', col1X, y)
  doc.setFont('helvetica', 'normal')
  doc.text(companySettings?.tax_id || '52626358N', col2X, y)
  
  y += 10

  // ============================================
  // SUPPLIER + BUYER DETAILS (2 columnes)
  // ============================================
  
  // Header Supplier
  doc.setFillColor(...headerBg)
  doc.rect(margin, y, (pageWidth - margin * 2) / 2 - 2, 7, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.text('SUPPLIER DETAILS / DADES DEL PROVEÏDOR', margin + 2, y + 5)
  
  // Header Buyer
  doc.rect(pageWidth / 2 + 2, y, (pageWidth - margin * 2) / 2 - 2, 7, 'F')
  doc.text('BUYER DETAILS / DADES DEL COMPRADOR', pageWidth / 2 + 4, y + 5)
  
  y += 10
  
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  
  // Supplier details
  const supplierCol1 = margin
  const supplierCol2 = margin + 25
  const buyerCol1 = pageWidth / 2 + 2
  const buyerCol2 = pageWidth / 2 + 32
  
  // Name
  doc.setFont('helvetica', 'bold')
  doc.text('Name / Nom', supplierCol1, y)
  doc.setFont('helvetica', 'normal')
  doc.text(supplier?.name || '', supplierCol2, y, { maxWidth: 55 })
  
  doc.setFont('helvetica', 'bold')
  doc.text('Company / Empresa', buyerCol1, y)
  doc.setFont('helvetica', 'normal')
  doc.text(companySettings?.company_name || 'Freedolia', buyerCol2, y)
  
  y += 5
  
  // Address / Responsible
  doc.setFont('helvetica', 'bold')
  doc.text('Address / Adreça', supplierCol1, y)
  doc.setFont('helvetica', 'normal')
  doc.text(supplier?.address || '', supplierCol2, y, { maxWidth: 55 })
  
  doc.setFont('helvetica', 'bold')
  doc.text('Responsible', buyerCol1, y)
  doc.setFont('helvetica', 'normal')
  doc.text(companySettings?.legal_name || 'David Castellà Gil', buyerCol2, y)
  
  y += 5
  
  // Contact / Tax ID
  doc.setFont('helvetica', 'bold')
  doc.text('Contact / Contacte', supplierCol1, y)
  doc.setFont('helvetica', 'normal')
  doc.text(supplier?.contact_name || '', supplierCol2, y)
  
  doc.setFont('helvetica', 'bold')
  doc.text('Tax ID / NIF', buyerCol1, y)
  doc.setFont('helvetica', 'normal')
  doc.text(companySettings?.tax_id || '52626358N', buyerCol2, y)
  
  y += 5
  
  // Phone
  doc.setFont('helvetica', 'bold')
  doc.text('Phone / Tel', supplierCol1, y)
  doc.setFont('helvetica', 'normal')
  doc.text(supplier?.phone || '', supplierCol2, y)
  
  doc.setFont('helvetica', 'bold')
  doc.text('Phone / Tel', buyerCol1, y)
  doc.setFont('helvetica', 'normal')
  doc.text(companySettings?.phone || '+34 630 576 066', buyerCol2, y)
  
  y += 5
  
  // Email
  doc.setFont('helvetica', 'bold')
  doc.text('Email', supplierCol1, y)
  doc.setFont('helvetica', 'normal')
  doc.text(supplier?.email || '', supplierCol2, y)
  
  doc.setFont('helvetica', 'bold')
  doc.text('Email', buyerCol1, y)
  doc.setFont('helvetica', 'normal')
  doc.text(companySettings?.email || 'david@freedolia.com', buyerCol2, y)
  
  y += 10

  // ============================================
  // DELIVERY ADDRESS
  // ============================================
  
  doc.setFillColor(...headerBg)
  doc.rect(margin, y, pageWidth - margin * 2, 7, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.text('DELIVERY ADDRESS / ADREÇA D\'ENTREGA', margin + 2, y + 5)
  
  y += 10
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  
  doc.setFont('helvetica', 'bold')
  doc.text('Address / Adreça', margin, y)
  doc.setFont('helvetica', 'normal')
  doc.text(poData.delivery_address || '', margin + 28, y, { maxWidth: 140 })
  
  y += 5
  
  doc.setFont('helvetica', 'bold')
  doc.text('Contact', margin, y)
  doc.setFont('helvetica', 'normal')
  doc.text(poData.delivery_contact || '', margin + 28, y)
  
  y += 5
  
  doc.setFont('helvetica', 'bold')
  doc.text('Phone / Tel', margin, y)
  doc.setFont('helvetica', 'normal')
  doc.text(poData.delivery_phone || '', margin + 28, y)
  
  doc.setFont('helvetica', 'bold')
  doc.text('Email', margin + 70, y)
  doc.setFont('helvetica', 'normal')
  doc.text(poData.delivery_email || '', margin + 85, y)
  
  y += 10

  // ============================================
  // COMMERCIAL TERMS
  // ============================================
  
  doc.setFillColor(...headerBg)
  doc.rect(margin, y, pageWidth - margin * 2, 7, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.text('COMMERCIAL TERMS / TERMES COMERCIALS', margin + 2, y + 5)
  
  y += 10
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  
  // Payment terms
  doc.setFont('helvetica', 'bold')
  doc.text('Payment terms / Pagament', margin, y)
  doc.setFont('helvetica', 'normal')
  doc.text(poData.payment_terms || '', margin + 45, y, { maxWidth: 120 })
  
  y += 5
  
  // Incoterm
  doc.setFont('helvetica', 'bold')
  doc.text('Incoterm', margin, y)
  doc.setFont('helvetica', 'normal')
  doc.text(`${poData.incoterm || 'FCA'} ${poData.incoterm_location || ''}`, margin + 45, y)
  
  y += 5
  
  // Lead times
  if (poData.sample_lead_time) {
    doc.setFont('helvetica', 'bold')
    doc.text('Sample lead time', margin, y)
    doc.setFont('helvetica', 'normal')
    doc.text(poData.sample_lead_time, margin + 45, y)
    y += 5
  }
  
  doc.setFont('helvetica', 'bold')
  doc.text('Production lead time', margin, y)
  doc.setFont('helvetica', 'normal')
  doc.text(poData.production_lead_time || '', margin + 45, y)
  
  y += 5
  
  doc.setFont('helvetica', 'bold')
  doc.text('Quote validity', margin, y)
  doc.setFont('helvetica', 'normal')
  doc.text(poData.quote_validity || '', margin + 45, y)
  
  y += 10

  // ============================================
  // PRODUCT DETAILS (TABLE)
  // ============================================
  
  doc.setFillColor(...headerBg)
  doc.rect(margin, y, pageWidth - margin * 2, 7, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.text('PRODUCT DETAILS / DETALL DE PRODUCTES', margin + 2, y + 5)
  
  y += 10
  
  // Parse items
  let items = []
  try {
    items = typeof poData.items === 'string' ? JSON.parse(poData.items) : (poData.items || [])
  } catch (e) {
    items = []
  }
  
  // Preparar dades per la taula
  const tableData = items.map((item, index) => {
    const qty = parseFloat(item.qty) || 0
    const price = parseFloat(item.unit_price) || 0
    const total = qty * price
    return [
      item.ref || (index + 1).toString(),
      item.description || '',
      qty.toString(),
      item.unit || 'pcs',
      price.toFixed(3),
      total.toFixed(2),
      item.notes || ''
    ]
  })
  
  // Calcular total
  const totalAmount = items.reduce((sum, item) => {
    const qty = parseFloat(item.qty) || 0
    const price = parseFloat(item.unit_price) || 0
    return sum + (qty * price)
  }, 0)
  
  // Afegir fila de total
  tableData.push(['', '', '', '', '', '', ''])
  tableData.push(['', 'TOTAL (' + (poData.currency || 'USD') + ')', '', '', '', totalAmount.toFixed(2), ''])
  
  // Generar taula
  doc.autoTable({
    startY: y,
    head: [['Ref.', 'Description / Descripció', 'Qty', 'UOM', 'Unit Price', 'Line Total', 'Notes']],
    body: tableData,
    margin: { left: margin, right: margin },
    styles: {
      fontSize: 8,
      cellPadding: 2
    },
    headStyles: {
      fillColor: [79, 70, 229],
      textColor: [255, 255, 255],
      fontStyle: 'bold'
    },
    columnStyles: {
      0: { cellWidth: 12 },
      1: { cellWidth: 60 },
      2: { cellWidth: 15, halign: 'right' },
      3: { cellWidth: 15 },
      4: { cellWidth: 22, halign: 'right' },
      5: { cellWidth: 22, halign: 'right' },
      6: { cellWidth: 30 }
    },
    didParseCell: function(data) {
      // Destacar fila total
      if (data.row.index === tableData.length - 1) {
        data.cell.styles.fontStyle = 'bold'
        data.cell.styles.fillColor = [249, 250, 251]
      }
    }
  })
  
  y = doc.lastAutoTable.finalY + 10

  // ============================================
  // SHIPPING SPECS
  // ============================================
  
  if (y > 240) {
    doc.addPage()
    y = 20
  }
  
  doc.setFillColor(...headerBg)
  doc.rect(margin, y, pageWidth - margin * 2, 7, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.text('SHIPPING SPECS & NOTES / ESPECIFICACIONS D\'ENVIAMENT I NOTES', margin + 2, y + 5)
  
  y += 10
  doc.setFontSize(8)
  
  const specCol1 = margin
  const specCol2 = margin + 45
  
  if (poData.total_cartons) {
    doc.setFont('helvetica', 'bold')
    doc.text('Total cartons / Total caixes', specCol1, y)
    doc.setFont('helvetica', 'normal')
    doc.text(poData.total_cartons, specCol2, y)
    y += 5
  }
  
  if (poData.net_weight) {
    doc.setFont('helvetica', 'bold')
    doc.text('Net weight (kg) / Pes net', specCol1, y)
    doc.setFont('helvetica', 'normal')
    doc.text(poData.net_weight, specCol2, y)
    y += 5
  }
  
  if (poData.gross_weight) {
    doc.setFont('helvetica', 'bold')
    doc.text('Gross weight (kg) / Pes brut', specCol1, y)
    doc.setFont('helvetica', 'normal')
    doc.text(poData.gross_weight, specCol2, y)
    y += 5
  }
  
  if (poData.total_volume) {
    doc.setFont('helvetica', 'bold')
    doc.text('Total volume (CBM)', specCol1, y)
    doc.setFont('helvetica', 'normal')
    doc.text(poData.total_volume, specCol2, y)
    y += 5
  }
  
  if (poData.carton_size) {
    doc.setFont('helvetica', 'bold')
    doc.text('Carton size / Mida caixa', specCol1, y)
    doc.setFont('helvetica', 'normal')
    doc.text(poData.carton_size, specCol2, y)
    y += 5
  }
  
  if (poData.shipping_mark) {
    doc.setFont('helvetica', 'bold')
    doc.text('Shipping mark', specCol1, y)
    doc.setFont('helvetica', 'normal')
    doc.text(poData.shipping_mark, specCol2, y)
    y += 5
  }
  
  // Notes
  if (poData.notes) {
    y += 5
    doc.setFont('helvetica', 'bold')
    doc.text('Notes:', specCol1, y)
    doc.setFont('helvetica', 'normal')
    y += 5
    doc.text(poData.notes, specCol1, y, { maxWidth: pageWidth - margin * 2 })
  }

  // ============================================
  // FOOTER - Signatures
  // ============================================
  
  y = 260
  
  doc.setDrawColor(...borderColor)
  doc.line(margin, y, margin + 60, y)
  doc.line(pageWidth - margin - 60, y, pageWidth - margin, y)
  
  y += 5
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text('Buyer Signature / Signatura Comprador', margin, y)
  doc.text('Supplier Signature / Signatura Proveïdor', pageWidth - margin - 60, y)
  
  // Data generació
  y += 15
  doc.setFontSize(7)
  doc.setTextColor(150, 150, 150)
  doc.text(`Generated by Freedoliapp - ${new Date().toLocaleString('ca-ES')}`, pageWidth / 2, y, { align: 'center' })

  // Guardar
  doc.save(`${poData.po_number || 'PO'}.pdf`)
  
  return doc
}

// Format data
const formatDate = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleDateString('ca-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

export default generatePOPdf
