import jsPDF from 'jspdf'
import 'jspdf-autotable'

/**
 * Genera un PDF professional del Briefing del producte
 * Inclou imatges redimensionades automàticament
 */
export const generateBriefingPdf = async (briefing, project, companySettings) => {
  const doc = new jsPDF('p', 'mm', 'a4')
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 15
  let y = 15

  // Colors
  const headerBg = [79, 70, 229]
  const sectionBg = [249, 250, 251]

  // ============================================
  // PÀGINA 1: INFO BÀSICA + PRODUCTE
  // ============================================
  
  // Títol principal
  doc.setFillColor(...headerBg)
  doc.rect(0, 0, pageWidth, 25, 'F')
  
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 255, 255)
  doc.text('FREEDOLIA — TECHNICAL SHEET FOR THE PRODUCT', pageWidth / 2, 12, { align: 'center' })
  doc.setFontSize(10)
  doc.text(project?.sku || 'FRDL-XXXXXX', pageWidth / 2, 19, { align: 'center' })
  
  y = 35
  doc.setTextColor(0, 0, 0)

  // Info header (Buyer, PO Ref, Date)
  doc.setFontSize(8)
  const col1 = margin
  const col2 = margin + 40
  const col3 = pageWidth - margin - 55
  const col4 = pageWidth - margin - 20
  
  doc.setFont('helvetica', 'bold')
  doc.text('Buyer / Comprador:', col1, y)
  doc.setFont('helvetica', 'normal')
  doc.text(companySettings?.legal_name || 'David Castellà Gil', col2, y)
  
  doc.setFont('helvetica', 'bold')
  doc.text('P.O. Ref:', col3, y)
  doc.setFont('helvetica', 'normal')
  doc.text(briefing.po_ref || '', col4, y)
  
  y += 5
  
  doc.setFont('helvetica', 'bold')
  doc.text('HQ Address:', col1, y)
  doc.setFont('helvetica', 'normal')
  const address = companySettings 
    ? `${companySettings.address}, ${companySettings.postal_code} ${companySettings.city}, ${companySettings.province}, ${companySettings.country}`
    : 'c/ Josep Camprecios, 1, 1-2, 08950 Esplugues de Llobregat, Barcelona, Spain'
  doc.text(address.substring(0, 70), col2, y, { maxWidth: 80 })
  
  doc.setFont('helvetica', 'bold')
  doc.text('Date / Data:', col3, y)
  doc.setFont('helvetica', 'normal')
  doc.text(formatDate(briefing.date), col4, y)
  
  y += 5
  
  doc.setFont('helvetica', 'bold')
  doc.text('Mail:', col1, y)
  doc.setFont('helvetica', 'normal')
  doc.text(companySettings?.email || 'david@freedolia.com', col2, y)
  
  doc.setFont('helvetica', 'bold')
  doc.text('Quote Ref:', col3, y)
  doc.setFont('helvetica', 'normal')
  doc.text(briefing.quote_ref || '', col4, y)
  
  y += 5
  
  doc.setFont('helvetica', 'bold')
  doc.text('NIF:', col1, y)
  doc.setFont('helvetica', 'normal')
  doc.text(companySettings?.tax_id || '52626358N', col2, y)
  
  y += 10

  // ============================================
  // SECCIÓ: PRODUCT DESCRIPTION
  // ============================================
  
  y = drawSectionHeader(doc, 'PRODUCT DESCRIPTION / DESCRIPCIÓ DEL PRODUCTE', y, margin, pageWidth)
  
  const productFields = [
    ['Name Product / Nom del producte:', briefing.product_name],
    ['Model Number / Model:', briefing.model_number],
    ['Main material / Material principal:', briefing.main_material],
    ['Clips Material / Material dels clips:', briefing.clips_material],
    ['Hook Type / Tipus de ganxo:', briefing.hook_type],
    ['Color:', briefing.color],
    ['Product Dimensions / Dimensions:', briefing.product_dimensions],
    ['Net Weight per Set / Pes net:', briefing.net_weight_per_set],
  ]
  
  y = drawFieldsTable(doc, productFields, y, margin, pageWidth)
  y += 5

  // ============================================
  // SECCIÓ: PACKAGING SIZE
  // ============================================
  
  y = drawSectionHeader(doc, 'PACKAGING SIZE / MIDA DE L\'EMBALATGE', y, margin, pageWidth)
  
  const packagingFields = [
    ['Individual Packaging:', briefing.individual_packaging],
    ['Packaging Size / Mida:', briefing.packaging_size],
    ['Units per Set:', briefing.units_per_set],
  ]
  
  y = drawFieldsTable(doc, packagingFields, y, margin, pageWidth)
  
  // Carton Info
  y += 3
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.text('Carton Info / Informació de caixes:', margin, y)
  y += 5
  
  doc.setFont('helvetica', 'normal')
  const cartonInfo = `${briefing.total_sets || ''} | ${briefing.total_cartons || ''} | ${briefing.sets_per_carton || ''}`
  doc.text(cartonInfo, margin, y)
  y += 8

  // ============================================
  // SECCIÓ: QUALITY REQUIREMENTS
  // ============================================
  
  if (y > 200) { doc.addPage(); y = 20 }
  
  y = drawSectionHeader(doc, 'QUALITY REQUIREMENTS / REQUISITS DE QUALITAT', y, margin, pageWidth)
  
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.text('Quality Standards / Estàndards de qualitat:', margin, y)
  y += 4
  doc.setFont('helvetica', 'normal')
  const qualityLines = doc.splitTextToSize(briefing.quality_standards || '', pageWidth - margin * 2)
  doc.text(qualityLines, margin, y)
  y += qualityLines.length * 3.5 + 5

  // ============================================
  // SECCIÓ: LABELING & COMPLIANCE
  // ============================================
  
  y = drawSectionHeader(doc, 'LABELING & COMPLIANCE / ETIQUETATGE I COMPLIMENT NORMATIU', y, margin, pageWidth)
  
  doc.setFontSize(8)
  const labelingLines = doc.splitTextToSize(briefing.labeling_requirements || '', pageWidth - margin * 2)
  doc.text(labelingLines, margin, y)
  y += labelingLines.length * 3.5 + 5

  // ============================================
  // SECCIÓ: LOGISTICS & DELIVERY
  // ============================================
  
  if (y > 230) { doc.addPage(); y = 20 }
  
  y = drawSectionHeader(doc, 'LOGISTICS & DELIVERY / LOGÍSTICA I ENTREGA', y, margin, pageWidth)
  
  const logisticsFields = [
    ['Delivery Address / Adreça d\'entrega:', briefing.delivery_address],
    ['Shipping Mark / Marcatge:', briefing.shipping_mark],
    ['Important Notes / Notes importants:', briefing.important_notes],
  ]
  
  y = drawFieldsTable(doc, logisticsFields, y, margin, pageWidth)
  y += 5

  // ============================================
  // SECCIÓ: QUALITY SPECIFICATIONS (pàgina nova)
  // ============================================
  
  doc.addPage()
  y = 20
  
  y = drawSectionHeader(doc, 'PRODUCT QUALITY SPECIFICATIONS / ESPECIFICACIONS DE QUALITAT DEL PRODUCTE', y, margin, pageWidth)
  
  // English
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text('🇬🇧 English', margin, y)
  y += 5
  
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  const specEnLines = doc.splitTextToSize(briefing.quality_specs_en || '', pageWidth - margin * 2)
  doc.text(specEnLines, margin, y)
  y += specEnLines.length * 3.5 + 8
  
  // Català
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text('🇨🇦 Català', margin, y)
  y += 5
  
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  const specCaLines = doc.splitTextToSize(briefing.quality_specs_ca || '', pageWidth - margin * 2)
  doc.text(specCaLines, margin, y)
  y += specCaLines.length * 3.5 + 10

  // ============================================
  // SECCIÓ: IMATGES (si n'hi ha)
  // ============================================
  
  const images = briefing.images || []
  
  if (images.length > 0) {
    // Repetir header de specs amb nota sobre imatges
    y = drawSectionHeader(doc, 'PRODUCT QUALITY SPECIFICATIONS / ESPECIFICACIONS DE QUALITAT DEL PRODUCTE', y, margin, pageWidth)
    
    // Processar imatges en grups de 6 (2 files x 3 columnes)
    const imagesPerPage = 6
    const imgWidth = (pageWidth - margin * 2 - 20) / 3  // 3 columnes amb espai
    const imgHeight = imgWidth * 0.75  // Aspect ratio 4:3
    
    for (let i = 0; i < images.length; i++) {
      const img = images[i]
      
      // Nova pàgina cada 6 imatges o si no hi cap
      if (i % imagesPerPage === 0 && i > 0) {
        doc.addPage()
        y = 20
      }
      
      // Calcular posició (grid 3x2)
      const posInPage = i % imagesPerPage
      const col = posInPage % 3
      const row = Math.floor(posInPage / 3)
      
      const x = margin + col * (imgWidth + 10)
      const imgY = y + row * (imgHeight + 25)
      
      try {
        // Obtenir dades de la imatge
        const imgData = img.base64 || img.preview
        
        if (imgData) {
          // Afegir imatge
          doc.addImage(imgData, 'JPEG', x, imgY, imgWidth, imgHeight)
          
          // Títol de la imatge (si n'hi ha)
          if (img.title) {
            doc.setFontSize(7)
            doc.setFont('helvetica', 'italic')
            doc.text(img.title, x + imgWidth / 2, imgY + imgHeight + 4, { align: 'center', maxWidth: imgWidth })
          }
        }
      } catch (err) {
        console.error('Error afegint imatge:', err)
      }
      
      // Actualitzar Y després de cada fila completa
      if (posInPage === 5 || i === images.length - 1) {
        const rowsUsed = Math.ceil((posInPage + 1) / 3)
        y = y + rowsUsed * (imgHeight + 25) + 10
      }
    }
  }

  // ============================================
  // FOOTER a totes les pàgines
  // ============================================
  
  const totalPages = doc.internal.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    doc.setFontSize(7)
    doc.setTextColor(150, 150, 150)
    doc.text(
      `Generated by Freedoliapp - ${new Date().toLocaleString('ca-ES')} - Page ${i}/${totalPages}`,
      pageWidth / 2, pageHeight - 8, { align: 'center' }
    )
  }

  // Guardar
  const filename = `FREEDOLIA_Product_Briefing_${project?.sku || 'BRIEFING'}.pdf`
  doc.save(filename)
  
  return doc
}

// Helper: Dibuixar header de secció
const drawSectionHeader = (doc, title, y, margin, pageWidth) => {
  doc.setFillColor(79, 70, 229)
  doc.rect(margin, y, pageWidth - margin * 2, 7, 'F')
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 255, 255)
  doc.text(title, margin + 3, y + 5)
  doc.setTextColor(0, 0, 0)
  return y + 12
}

// Helper: Dibuixar taula de camps
const drawFieldsTable = (doc, fields, y, margin, pageWidth) => {
  const labelWidth = 55
  const valueWidth = pageWidth - margin * 2 - labelWidth
  
  doc.setFontSize(8)
  
  for (const [label, value] of fields) {
    if (!value) continue
    
    doc.setFont('helvetica', 'bold')
    doc.text(label, margin, y)
    doc.setFont('helvetica', 'normal')
    
    // Multilínia si cal
    const lines = doc.splitTextToSize(value || '', valueWidth - 5)
    doc.text(lines, margin + labelWidth, y)
    
    y += Math.max(lines.length * 4, 5)
  }
  
  return y
}

// Helper: Format data
const formatDate = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleDateString('ca-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

export default generateBriefingPdf
