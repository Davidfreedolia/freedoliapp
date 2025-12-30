import jsPDF from 'jspdf'
import JsBarcode from 'jsbarcode'

/**
 * Genera un codi de barres Code128 com a imatge base64
 * @param {string} text - Text a codificar (normalment FNSKU)
 * @param {Object} options - Opcions del barcode (width, height, etc)
 * @returns {Promise<string>} Base64 image data URL
 */
const generateBarcodeImage = (text, options = {}) => {
  return new Promise((resolve, reject) => {
    try {
      // Crear canvas temporal
      const canvas = document.createElement('canvas')
      const { width = 1.5, height = 20, format = 'CODE128', displayValue = true } = options
      
      // Generar barcode amb jsbarcode
      JsBarcode(canvas, text, {
        format: format,
        width: width,
        height: height,
        displayValue: displayValue,
        fontSize: 10,
        margin: 0,
        background: '#ffffff',
        lineColor: '#000000'
      })
      
      // Convertir a data URL
      const dataURL = canvas.toDataURL('image/png')
      resolve(dataURL)
    } catch (error) {
      console.error('Error generant barcode:', error)
      reject(error)
    }
  })
}

/**
 * Genera PDF d'etiquetes FNSKU per imprimir
 * Suporta 2 plantilles:
 * - AVERY_5160: Full A4 amb 30 etiquetes Avery 5160 (3 columnes x 10 files)
 * - LABEL_40x30: Una etiqueta per pàgina (40mm x 30mm)
 */
export const generateFnskuLabelsPdf = async (options) => {
  const {
    fnsku,
    sku,
    productName,
    quantity = 1,
    template = 'AVERY_5160',
    includeSku = true,
    includeName = true,
    offsetXmm = 0, // Calibratge X (mm)
    offsetYmm = 0, // Calibratge Y (mm)
    testPrint = false // Mode test print amb guies
  } = options

  if (!fnsku) {
    throw new Error('FNSKU és obligatori per generar etiquetes')
  }

  const doc = new jsPDF('p', 'mm', 'a4')
  const pageWidth = doc.internal.pageSize.getWidth() // 210mm
  const pageHeight = doc.internal.pageSize.getHeight() // 297mm

  // Generar imatge del barcode Code128
  let barcodeImage = null
  try {
    barcodeImage = await generateBarcodeImage(fnsku, {
      width: 1.5,
      height: 15,
      format: 'CODE128',
      displayValue: true
    })
  } catch (error) {
    console.error('Error generant barcode:', error)
    throw new Error('Error generant codi de barres: ' + error.message)
  }

  if (template === 'AVERY_5160') {
    // Plantilla Avery 5160 (30 etiquetes per full A4)
    // Dimensions reals: 63.5mm x 38.1mm per etiqueta
    // Marges: 4.76mm (top), 3.18mm (left), 3.18mm (right), 4.76mm (bottom)
    // Espai entre etiquetes: 2.54mm (vertical), 2.54mm (horizontal)
    
    const labelWidth = 63.5 // mm
    const labelHeight = 38.1 // mm
    const marginTop = 4.76 // mm
    const marginLeft = 3.18 // mm
    const spacingX = 2.54 // mm entre columnes
    const spacingY = 2.54 // mm entre files
    const cols = 3
    const rows = 10

    let labelIndex = 0
    for (let row = 0; row < rows && labelIndex < quantity; row++) {
      for (let col = 0; col < cols && labelIndex < quantity; col++) {
        const x = marginLeft + col * (labelWidth + spacingX) + offsetXmm
        const y = marginTop + row * (labelHeight + spacingY) + offsetYmm

        // Si és mode test print, dibuixar contorns i guies
        if (testPrint) {
          // Contorn exterior de l'etiqueta
          doc.setDrawColor(255, 0, 0) // Vermell
          doc.setLineWidth(0.3)
          doc.rect(x, y, labelWidth, labelHeight)
          
          // Línies de guia al centre
          doc.setDrawColor(0, 0, 255) // Blau
          doc.setLineWidth(0.1)
          // Línia vertical central
          doc.line(x + labelWidth / 2, y, x + labelWidth / 2, y + labelHeight)
          // Línia horitzontal central
          doc.line(x, y + labelHeight / 2, x + labelWidth, y + labelHeight / 2)
          
          // Text de test
          doc.setFontSize(6)
          doc.setTextColor(255, 0, 0)
          doc.text(`TEST ${row + 1}-${col + 1}`, x + 2, y + 5)
        }

        // Rectangle de l'etiqueta (només si no és test print, o dibuixat més clar)
        if (!testPrint) {
          doc.setDrawColor(200, 200, 200)
          doc.setLineWidth(0.1)
          doc.rect(x, y, labelWidth, labelHeight)
        }

        // FNSKU text (a dalt)
        doc.setFontSize(8)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(0, 0, 0)
        const fnskuY = y + 5
        doc.text(`FNSKU: ${fnsku}`, x + 2, fnskuY)

        // SKU (si s'inclou)
        if (includeSku && sku) {
          doc.setFontSize(7)
          doc.setFont('helvetica', 'normal')
          doc.setTextColor(100, 100, 100)
          doc.text(`SKU: ${sku}`, x + 2, fnskuY + 5)
        }

        // Nom del producte (si s'inclou)
        if (includeName && productName) {
          doc.setFontSize(6)
          doc.setFont('helvetica', 'normal')
          doc.setTextColor(80, 80, 80)
          const maxWidth = labelWidth - 4
          const truncatedName = doc.splitTextToSize(productName, maxWidth)
          const nameY = fnskuY + (includeSku && sku ? 9 : 7)
          doc.text(truncatedName, x + 2, nameY)
        }

        // Codi de barres Code128 real (a baix)
        if (barcodeImage) {
          const barcodeY = y + labelHeight - 18
          const barcodeWidth = labelWidth - 4
          const barcodeHeight = 15
          try {
            doc.addImage(barcodeImage, 'PNG', x + 2, barcodeY, barcodeWidth, barcodeHeight)
          } catch (error) {
            console.error('Error afegint barcode al PDF:', error)
            // Fallback: text si falla la imatge
            doc.setFontSize(6)
            doc.setTextColor(0, 0, 0)
            doc.text(`BARCODE: ${fnsku}`, x + 2, barcodeY + 8)
          }
        }

        labelIndex++
      }
    }

    // Si és mode test print, afegir instruccions a la primera pàgina
    if (testPrint && doc.internal.getNumberOfPages() === 1) {
      doc.setFontSize(8)
      doc.setTextColor(0, 0, 0)
      doc.setFont('helvetica', 'normal')
      doc.text('MODE TEST PRINT - Instruccions:', 10, pageHeight - 30)
      doc.text('1. Imprimeix aquesta pàgina', 10, pageHeight - 25)
      doc.text('2. Comprova que els contorns vermells coincideixen amb les etiquetes', 10, pageHeight - 20)
      doc.text('3. Si no coincideixen, ajusta offsetXmm i offsetYmm', 10, pageHeight - 15)
      doc.text('4. Les línies blaves indiquen el centre de cada etiqueta', 10, pageHeight - 10)
    }
  } else if (template === 'LABEL_40x30') {
    // Plantilla: Una etiqueta per pàgina (40mm x 30mm)
    const labelWidth = 40
    const labelHeight = 30
    const startX = (pageWidth - labelWidth) / 2 + offsetXmm
    const startY = (pageHeight - labelHeight) / 2 + offsetYmm

    for (let i = 0; i < quantity; i++) {
      if (i > 0) {
        doc.addPage()
      }

      const x = startX
      const y = startY

      // Si és mode test print, dibuixar contorns i guies
      if (testPrint) {
        // Contorn exterior
        doc.setDrawColor(255, 0, 0) // Vermell
        doc.setLineWidth(0.5)
        doc.rect(x, y, labelWidth, labelHeight)
        
        // Línies de guia
        doc.setDrawColor(0, 0, 255) // Blau
        doc.setLineWidth(0.2)
        doc.line(x + labelWidth / 2, y, x + labelWidth / 2, y + labelHeight)
        doc.line(x, y + labelHeight / 2, x + labelWidth, y + labelHeight / 2)
        
        // Text de test
        doc.setFontSize(8)
        doc.setTextColor(255, 0, 0)
        doc.text('TEST PRINT', x + 2, y + 5)
      } else {
        // Rectangle de l'etiqueta
        doc.setDrawColor(0, 0, 0)
        doc.setLineWidth(0.5)
        doc.rect(x, y, labelWidth, labelHeight)
      }

      // FNSKU
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(0, 0, 0)
      doc.text(`FNSKU: ${fnsku}`, x + 2, y + 8)

      // SKU (si s'inclou)
      if (includeSku && sku) {
        doc.setFontSize(9)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(100, 100, 100)
        doc.text(`SKU: ${sku}`, x + 2, y + 13)
      }

      // Nom del producte (si s'inclou)
      if (includeName && productName) {
        doc.setFontSize(7)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(80, 80, 80)
        const maxWidth = labelWidth - 4
        const truncatedName = doc.splitTextToSize(productName, maxWidth)
        doc.text(truncatedName, x + 2, y + (includeSku && sku ? 19 : 17))
      }

      // Codi de barres Code128 real (a baix)
      if (barcodeImage) {
        const barcodeY = y + labelHeight - 12
        const barcodeWidth = labelWidth - 4
        const barcodeHeight = 10
        try {
          doc.addImage(barcodeImage, 'PNG', x + 2, barcodeY, barcodeWidth, barcodeHeight)
        } catch (error) {
          console.error('Error afegint barcode al PDF:', error)
          // Fallback: text si falla la imatge
          doc.setFontSize(6)
          doc.setTextColor(0, 0, 0)
          doc.text(`BARCODE: ${fnsku}`, x + 2, barcodeY + 5)
        }
      }

      // Si és mode test print, afegir instruccions a cada pàgina
      if (testPrint) {
        doc.setFontSize(7)
        doc.setTextColor(0, 0, 0)
        doc.setFont('helvetica', 'normal')
        doc.text('MODE TEST PRINT - Imprimeix i comprova alineació', 10, pageHeight - 10)
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
