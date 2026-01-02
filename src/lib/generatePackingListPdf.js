import jsPDF from 'jspdf'
import 'jspdf-autotable'

/**
 * Genera un PDF de Packing List per enviar al fabricant
 * Inclou informació de la PO, items i packaging details
 */
export const generatePackingListPdf = async (poData, supplier, project, companySettings, amazonReadiness) => {
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
  
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(0, 0, 0)
  doc.text('FREEDOLIA — PACKING LIST', pageWidth / 2, y, { align: 'center' })
  
  y += 12

  // Company info
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  if (companySettings?.legal_name) {
    doc.text(companySettings.legal_name, pageWidth / 2, y, { align: 'center' })
    y += 5
  }
  if (companySettings?.address) {
    doc.text(companySettings.address, pageWidth / 2, y, { align: 'center' })
    y += 5
  }
  if (companySettings?.tax_id) {
    doc.text(`Tax ID: ${companySettings.tax_id}`, pageWidth / 2, y, { align: 'center' })
    y += 5
  }
  
  // Date
  doc.text(`Date: ${new Date().toLocaleDateString('en-GB')}`, pageWidth - margin, y, { align: 'right' })
  y += 10

  // ============================================
  // INFORMACIÓ BÀSICA
  // ============================================
  
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  
  // PO Number
  doc.text('PO Number:', margin, y)
  doc.setFont('helvetica', 'normal')
  doc.text(poData.po_number || '', margin + 35, y)
  
  // Project
  y += 7
  doc.setFont('helvetica', 'bold')
  doc.text('Project:', margin, y)
  doc.setFont('helvetica', 'normal')
  const projectInfo = project ? `${project.name || ''} (${project.sku || project.project_code || ''})` : ''
  doc.text(projectInfo, margin + 35, y)
  
  // Supplier
  y += 7
  doc.setFont('helvetica', 'bold')
  doc.text('Supplier:', margin, y)
  doc.setFont('helvetica', 'normal')
  doc.text(supplier?.name || '', margin + 35, y)
  
  y += 10

  // ============================================
  // TAULA D'ITEMS
  // ============================================
  
  const items = safeJsonArray(poData.items)

  if (items.length > 0) {
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('Items:', margin, y)
    y += 5

    const tableData = items.map(item => [
      item.description || item.name || '',
      (item.quantity || 0).toString(),
      item.unit || 'pcs',
      typeof item.unit_price === 'number' ? `€${item.unit_price.toFixed(2)}` : '',
      typeof item.total === 'number' ? `€${item.total.toFixed(2)}` : ''
    ])

    doc.autoTable({
      startY: y,
      head: [['Description', 'Quantity', 'Unit', 'Unit Price', 'Total']],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: primaryColor,
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 9
      },
      bodyStyles: {
        fontSize: 9
      },
      columnStyles: {
        0: { cellWidth: 80 },
        1: { cellWidth: 25, halign: 'center' },
        2: { cellWidth: 20, halign: 'center' },
        3: { cellWidth: 30, halign: 'right' },
        4: { cellWidth: 30, halign: 'right' }
      },
      margin: { left: margin, right: margin }
    })

    y = doc.lastAutoTable.finalY + 10
  }

  // ============================================
  // PACKAGING INFORMATION
  // ============================================
  
  if (amazonReadiness) {
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('Packaging Information:', margin, y)
    y += 7

    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    
    const packagingInfo = []
    
    if (amazonReadiness.cartons_count) {
      packagingInfo.push(['Cartons:', amazonReadiness.cartons_count.toString()])
    }
    
    if (amazonReadiness.units_per_carton) {
      packagingInfo.push(['Units per carton:', amazonReadiness.units_per_carton.toString()])
    }
    
    const totalUnits = amazonReadiness.cartons_count && amazonReadiness.units_per_carton
      ? amazonReadiness.cartons_count * amazonReadiness.units_per_carton
      : null
    
    if (totalUnits) {
      packagingInfo.push(['Total units:', totalUnits.toString()])
    }
    
    if (amazonReadiness.carton_length_cm && amazonReadiness.carton_width_cm && amazonReadiness.carton_height_cm) {
      packagingInfo.push([
        'Dimensions (L x W x H):',
        `${amazonReadiness.carton_length_cm} x ${amazonReadiness.carton_width_cm} x ${amazonReadiness.carton_height_cm} cm`
      ])
    }
    
    if (amazonReadiness.carton_weight_kg) {
      packagingInfo.push(['Weight per carton:', `${amazonReadiness.carton_weight_kg} kg`])
    }
    
    const totalWeight = amazonReadiness.cartons_count && amazonReadiness.carton_weight_kg
      ? (amazonReadiness.cartons_count * amazonReadiness.carton_weight_kg).toFixed(2)
      : null
    
    if (totalWeight) {
      packagingInfo.push(['Total weight:', `${totalWeight} kg`])
    }

    if (packagingInfo.length > 0) {
      doc.autoTable({
        startY: y,
        body: packagingInfo,
        theme: 'plain',
        bodyStyles: {
          fontSize: 9
        },
        columnStyles: {
          0: { cellWidth: 60, fontStyle: 'bold' },
          1: { cellWidth: 'auto' }
        },
        margin: { left: margin, right: margin }
      })

      y = doc.lastAutoTable.finalY + 10
    }
  }

  // ============================================
  // NOTES
  // ============================================
  
  if (amazonReadiness?.notes) {
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('Notes:', margin, y)
    y += 7
    
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    const notesLines = doc.splitTextToSize(amazonReadiness.notes, pageWidth - 2 * margin)
    doc.text(notesLines, margin, y)
  }

  // ============================================
  // FOOTER
  // ============================================
  
  const pageHeight = doc.internal.pageSize.getHeight()
  doc.setFontSize(8)
  doc.setTextColor(128, 128, 128)
  doc.text(
    `Generated by Freedolia App - ${new Date().toLocaleString()}`,
    pageWidth / 2,
    pageHeight - 10,
    { align: 'center' }
  )

  return doc
}
