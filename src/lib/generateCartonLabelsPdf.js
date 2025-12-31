import jsPDF from 'jspdf'

/**
 * Genera PDF d'etiquetes per caixa (Carton Labels)
 * Una o dues etiquetes per pàgina A4
 */
export const generateCartonLabelsPdf = async (poData, project, amazonReadiness, labelsPerPage = 1) => {
  const doc = new jsPDF('p', 'mm', 'a4')
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 15

  const cartonsCount = amazonReadiness?.cartons_count || 1
  const unitsPerCarton = amazonReadiness?.units_per_carton || 0
  const length = amazonReadiness?.carton_length_cm || 0
  const width = amazonReadiness?.carton_width_cm || 0
  const height = amazonReadiness?.carton_height_cm || 0
  const weight = amazonReadiness?.carton_weight_kg || 0

  // Dimensions de l'etiqueta
  const labelWidth = labelsPerPage === 1 ? pageWidth - 2 * margin : (pageWidth - 3 * margin) / 2
  const labelHeight = labelsPerPage === 1 ? pageHeight - 2 * margin : (pageHeight - 3 * margin) / 2

  for (let cartonNum = 1; cartonNum <= cartonsCount; cartonNum++) {
    // Començar nova pàgina si no és el primer
    if (cartonNum > 1) {
      doc.addPage()
    }

    // Calcular posició de l'etiqueta
    let labelX, labelY
    
    if (labelsPerPage === 1) {
      // Una etiqueta centrada
      labelX = margin
      labelY = margin
    } else {
      // Dues etiquetes per pàgina
      const isLeft = (cartonNum - 1) % 2 === 0
      labelX = isLeft ? margin : margin + labelWidth + margin
      labelY = margin + Math.floor((cartonNum - 1) / 2) * (labelHeight + margin)
    }

    // Border de l'etiqueta
    doc.setDrawColor(0, 0, 0)
    doc.setLineWidth(0.5)
    doc.rect(labelX, labelY, labelWidth, labelHeight)

    // Padding intern
    const padding = 5
    let currentY = labelY + padding + 5

    // ============================================
    // HEADER - Company Name
    // ============================================
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('FREEDOLIA', labelX + padding, currentY)
    currentY += 6

    // ============================================
    // PO NUMBER
    // ============================================
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text('PO Number:', labelX + padding, currentY)
    doc.setFont('helvetica', 'normal')
    doc.text(poData.po_number || '', labelX + padding + 30, currentY)
    currentY += 6

    // ============================================
    // PROJECT SKU
    // ============================================
    if (project?.sku || project?.project_code) {
      doc.setFont('helvetica', 'bold')
      doc.text('SKU:', labelX + padding, currentY)
      doc.setFont('helvetica', 'normal')
      doc.text(project.sku || project.project_code || '', labelX + padding + 30, currentY)
      currentY += 6
    }

    // ============================================
    // CARTON NUMBER
    // ============================================
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text(`CARTON ${cartonNum} of ${cartonsCount}`, labelX + padding, currentY)
    currentY += 8

    // ============================================
    // UNITS PER CARTON
    // ============================================
    if (unitsPerCarton > 0) {
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.text(`Units: ${unitsPerCarton}`, labelX + padding, currentY)
      currentY += 5
    }

    // ============================================
    // DIMENSIONS
    // ============================================
    if (length > 0 && width > 0 && height > 0) {
      doc.text(`Dimensions: ${length} x ${width} x ${height} cm`, labelX + padding, currentY)
      currentY += 5
    }

    // ============================================
    // WEIGHT
    // ============================================
    if (weight > 0) {
      doc.text(`Weight: ${weight} kg`, labelX + padding, currentY)
      currentY += 5
    }

    // ============================================
    // SEPARATOR LINE
    // ============================================
    currentY += 3
    doc.setLineWidth(0.3)
    doc.line(labelX + padding, currentY, labelX + labelWidth - padding, currentY)
    currentY += 5

    // ============================================
    // ADDITIONAL INFO (petit)
    // ============================================
    doc.setFontSize(7)
    doc.setTextColor(128, 128, 128)
    doc.text(`Generated: ${new Date().toLocaleDateString('en-GB')}`, labelX + padding, labelY + labelHeight - padding)
  }

  return doc
}
