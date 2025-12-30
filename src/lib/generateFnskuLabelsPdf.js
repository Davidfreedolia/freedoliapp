import jsPDF from 'jspdf'

/**
 * Genera PDF d'etiquetes FNSKU per imprimir
 * Suporta 2 plantilles:
 * - A4_30UP: Full A4 amb 30 etiquetes (3 columnes x 10 files)
 * - LABEL_40x30: Una etiqueta per pàgina (40mm x 30mm)
 */
export const generateFnskuLabelsPdf = (options) => {
  const {
    fnsku,
    sku,
    productName,
    quantity = 1,
    template = 'A4_30UP',
    includeSku = true,
    includeName = true
  } = options

  if (!fnsku) {
    throw new Error('FNSKU és obligatori per generar etiquetes')
  }

  const doc = new jsPDF('p', 'mm', 'a4')
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 10

  if (template === 'A4_30UP') {
    // Plantilla A4 amb 30 etiquetes (3 columnes x 10 files)
    const labelWidth = (pageWidth - 2 * margin) / 3
    const labelHeight = (pageHeight - 2 * margin) / 10
    const cols = 3
    const rows = 10

    let labelIndex = 0
    for (let row = 0; row < rows && labelIndex < quantity; row++) {
      for (let col = 0; col < cols && labelIndex < quantity; col++) {
        const x = margin + col * labelWidth
        const y = margin + row * labelHeight

        // Rectangle de l'etiqueta
        doc.setDrawColor(200, 200, 200)
        doc.setLineWidth(0.1)
        doc.rect(x, y, labelWidth - 1, labelHeight - 1)

        // FNSKU (barcode simulation - text per ara)
        doc.setFontSize(10)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(0, 0, 0)
        const fnskuY = y + 8
        doc.text(`FNSKU: ${fnsku}`, x + 2, fnskuY)

        // SKU (si s'inclou)
        if (includeSku && sku) {
          doc.setFontSize(8)
          doc.setFont('helvetica', 'normal')
          doc.setTextColor(100, 100, 100)
          doc.text(`SKU: ${sku}`, x + 2, fnskuY + 6)
        }

        // Nom del producte (si s'inclou)
        if (includeName && productName) {
          doc.setFontSize(7)
          doc.setFont('helvetica', 'normal')
          doc.setTextColor(80, 80, 80)
          // Truncar nom si és massa llarg
          const maxWidth = labelWidth - 4
          const truncatedName = doc.splitTextToSize(productName, maxWidth)
          doc.text(truncatedName, x + 2, fnskuY + (includeSku && sku ? 12 : 10))
        }

        // Codi de barres simulació (línies verticals)
        doc.setLineWidth(0.5)
        doc.setDrawColor(0, 0, 0)
        const barcodeY = y + labelHeight - 12
        const barcodeWidth = labelWidth - 4
        const barcodeX = x + 2
        // Dibuixar línies verticals per simular barcode
        for (let i = 0; i < 30; i++) {
          const barX = barcodeX + (i * barcodeWidth / 30)
          const barHeight = Math.random() * 8 + 4
          doc.line(barX, barcodeY, barX, barcodeY + barHeight)
        }

        labelIndex++
      }
    }
  } else if (template === 'LABEL_40x30') {
    // Plantilla: Una etiqueta per pàgina (40mm x 30mm)
    const labelWidth = 40
    const labelHeight = 30
    const startX = (pageWidth - labelWidth) / 2
    const startY = (pageHeight - labelHeight) / 2

    for (let i = 0; i < quantity; i++) {
      if (i > 0) {
        doc.addPage()
      }

      const x = startX
      const y = startY

      // Rectangle de l'etiqueta
      doc.setDrawColor(0, 0, 0)
      doc.setLineWidth(0.5)
      doc.rect(x, y, labelWidth, labelHeight)

      // FNSKU
      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(0, 0, 0)
      doc.text(`FNSKU: ${fnsku}`, x + 2, y + 10)

      // SKU (si s'inclou)
      if (includeSku && sku) {
        doc.setFontSize(10)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(100, 100, 100)
        doc.text(`SKU: ${sku}`, x + 2, y + 16)
      }

      // Nom del producte (si s'inclou)
      if (includeName && productName) {
        doc.setFontSize(8)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(80, 80, 80)
        const maxWidth = labelWidth - 4
        const truncatedName = doc.splitTextToSize(productName, maxWidth)
        doc.text(truncatedName, x + 2, y + (includeSku && sku ? 22 : 20))
      }

      // Codi de barres simulació
      doc.setLineWidth(0.5)
      doc.setDrawColor(0, 0, 0)
      const barcodeY = y + labelHeight - 8
      const barcodeWidth = labelWidth - 4
      const barcodeX = x + 2
      for (let j = 0; j < 40; j++) {
        const barX = barcodeX + (j * barcodeWidth / 40)
        const barHeight = Math.random() * 6 + 4
        doc.line(barX, barcodeY, barX, barcodeY + barHeight)
      }
    }
  }

  return doc
}

/**
 * Genera ZPL (Zebra Programming Language) per imprimir etiquetes FNSKU a impresores Zebra
 * @param {Object} options - Opcions de generació
 * @param {string} options.fnsku - FNSKU (obligatori)
 * @param {string} [options.sku] - SKU del producte
 * @param {string} [options.productName] - Nom del producte
 * @param {number} [options.quantity=1] - Quantitat d'etiquetes
 * @param {boolean} [options.includeSku=true] - Incloure SKU
 * @param {boolean} [options.includeName=true] - Incloure nom
 * @param {number} [options.dpi=203] - DPI de la impressora (203, 300, 600)
 * @returns {string} Codi ZPL
 */
export const generateFnskuLabelsZpl = (options) => {
  const {
    fnsku,
    sku,
    productName,
    quantity = 1,
    includeSku = true,
    includeName = true,
    dpi = 203 // DPI per defecte (203, 300, o 600)
  } = options

  if (!fnsku) {
    throw new Error('FNSKU és obligatori per generar ZPL')
  }

  // Escalar coordenades segons DPI (203 DPI = base, 300 DPI = 1.48x, 600 DPI = 2.96x)
  const dpiScale = dpi / 203
  const scale = (val) => Math.round(val * dpiScale)

  let zpl = ''
  
  // Repetir per cada etiqueta
  for (let i = 0; i < quantity; i++) {
    zpl += '^XA\n' // Start of label
    
    // Configurar DPI (opcional, algunes impressores ho requereixen)
    if (dpi !== 203) {
      // ^PR = Print Rate (velocitat), algunes impressores utilitzen això per DPI
      // La majoria d'impressores Zebra detecten DPI automàticament
    }
    
    // Border (opcional)
    zpl += `^FO${scale(50)},${scale(50)}^GB${scale(700)},${scale(400)},3^FS\n`
    
    // FNSKU text (negreta, mida gran)
    zpl += `^FO${scale(70)},${scale(80)}^A0N,${scale(50)},${scale(50)}^FD${fnsku}^FS\n`
    
    // SKU (si s'inclou)
    if (includeSku && sku) {
      zpl += `^FO${scale(70)},${scale(140)}^A0N,${scale(30)},${scale(30)}^FDSKU: ${sku}^FS\n`
    }
    
    // Nom del producte (si s'inclou)
    if (includeName && productName) {
      // Truncar nom si és massa llarg
      const maxLength = 40
      const truncatedName = productName.length > maxLength 
        ? productName.substring(0, maxLength) + '...'
        : productName
      zpl += `^FO${scale(70)},${scale(180)}^A0N,${scale(25)},${scale(25)}^FD${truncatedName}^FS\n`
    }
    
    // Code 128 barcode
    // Format: ^BC = Barcode Code128, N = normal, height, Y = readable text, orientation
    zpl += `^FO${scale(70)},${scale(250)}^BCN,${scale(100)},Y,N,N^FD${fnsku}^FS\n`
    
    zpl += '^XZ\n' // End of label
  }

  return zpl
}

