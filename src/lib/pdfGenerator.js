// PDF Generator for Freedoliapp
// Genera PDFs corporatius per PO, Invoices, etc.

// Dades legals de Freedolia (marca comercial)
const COMPANY_INFO = {
  name: 'Freedolia',
  appName: 'Freedoliapp',
  legalName: 'David Castellà Gil',
  nif: '52626358N',
  address: 'C/Josep Camprecios, 1, 1º-2ª',
  city: '08950 Esplugues de Llobregat',
  region: 'Barcelona',
  country: 'España',
  email: 'info@freedolia.com', // Actualitzar amb email real
  phone: '', // Afegir si cal
  logo: '/logo.png' // Path al logo
}

// Funció per generar HTML del PO
export const generatePOHtml = (order, project, supplier, items) => {
  const today = new Date().toLocaleDateString('es-ES')
  
  const itemsHtml = items.map((item, idx) => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${idx + 1}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${item.sku_internal || '-'}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${item.description}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">${Number(item.unit_price).toFixed(2)} ${order.currency}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 600;">${(item.quantity * item.unit_price).toFixed(2)} ${order.currency}</td>
    </tr>
  `).join('')

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Purchase Order ${order.po_number}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Helvetica Neue', Arial, sans-serif;
      font-size: 12px;
      line-height: 1.5;
      color: #1f2937;
      padding: 40px;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 40px;
      padding-bottom: 20px;
      border-bottom: 2px solid #4f46e5;
    }
    .logo-section {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .logo {
      width: 60px;
      height: 60px;
      background: linear-gradient(135deg, #4f46e5, #6366f1);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 28px;
      font-weight: bold;
    }
    .company-name {
      font-size: 28px;
      font-weight: 700;
      color: #1f2937;
      letter-spacing: -0.5px;
    }
    .document-title {
      text-align: right;
    }
    .document-title h1 {
      font-size: 24px;
      color: #4f46e5;
      margin-bottom: 8px;
    }
    .po-number {
      font-size: 18px;
      font-weight: 600;
      color: #1f2937;
    }
    .date {
      color: #6b7280;
      margin-top: 4px;
    }
    .parties {
      display: flex;
      justify-content: space-between;
      margin-bottom: 40px;
    }
    .party {
      width: 45%;
    }
    .party h3 {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #6b7280;
      margin-bottom: 12px;
      padding-bottom: 8px;
      border-bottom: 1px solid #e5e7eb;
    }
    .party-name {
      font-size: 16px;
      font-weight: 600;
      color: #1f2937;
      margin-bottom: 8px;
    }
    .party-details {
      color: #4b5563;
      font-size: 12px;
    }
    .order-info {
      display: flex;
      gap: 40px;
      margin-bottom: 30px;
      padding: 20px;
      background: #f9fafb;
      border-radius: 8px;
    }
    .info-item {
      display: flex;
      flex-direction: column;
    }
    .info-label {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #6b7280;
      margin-bottom: 4px;
    }
    .info-value {
      font-size: 14px;
      font-weight: 600;
      color: #1f2937;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
    }
    thead {
      background: #f3f4f6;
    }
    th {
      padding: 12px;
      text-align: left;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #6b7280;
      font-weight: 600;
    }
    th:nth-child(4), th:nth-child(5), th:nth-child(6) {
      text-align: right;
    }
    .totals {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 40px;
    }
    .totals-table {
      width: 300px;
    }
    .totals-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #e5e7eb;
    }
    .totals-row.grand-total {
      border-bottom: none;
      border-top: 2px solid #4f46e5;
      margin-top: 8px;
      padding-top: 16px;
    }
    .totals-label {
      color: #6b7280;
    }
    .totals-value {
      font-weight: 600;
    }
    .grand-total .totals-label,
    .grand-total .totals-value {
      font-size: 16px;
      color: #1f2937;
    }
    .terms {
      margin-bottom: 40px;
      padding: 20px;
      background: #f9fafb;
      border-radius: 8px;
    }
    .terms h3 {
      font-size: 12px;
      font-weight: 600;
      margin-bottom: 12px;
      color: #1f2937;
    }
    .terms p {
      color: #4b5563;
      font-size: 11px;
      margin-bottom: 8px;
    }
    .footer {
      display: flex;
      justify-content: space-between;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
    }
    .signature {
      width: 200px;
    }
    .signature-line {
      border-bottom: 1px solid #1f2937;
      height: 60px;
      margin-bottom: 8px;
    }
    .signature-label {
      font-size: 11px;
      color: #6b7280;
    }
    .legal-footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      text-align: center;
      color: #9ca3af;
      font-size: 10px;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo-section">
      <div class="logo">F</div>
      <div class="company-name">Freedolia</div>
    </div>
    <div class="document-title">
      <h1>PURCHASE ORDER</h1>
      <div class="po-number">${order.po_number}</div>
      <div class="date">Date: ${order.issue_date || today}</div>
    </div>
  </div>

  <div class="parties">
    <div class="party">
      <h3>From (Buyer)</h3>
      <div class="party-name">${COMPANY_INFO.legalName}</div>
      <div class="party-details">
        NIF: ${COMPANY_INFO.nif}<br>
        ${COMPANY_INFO.address}<br>
        ${COMPANY_INFO.city}<br>
        ${COMPANY_INFO.region}, ${COMPANY_INFO.country}
      </div>
    </div>
    <div class="party">
      <h3>To (Supplier)</h3>
      <div class="party-name">${supplier?.name || 'N/A'}</div>
      <div class="party-details">
        ${supplier?.address || ''}<br>
        ${supplier?.country || ''}<br>
        Contact: ${supplier?.contact_name || ''}<br>
        Email: ${supplier?.email || ''}
      </div>
    </div>
  </div>

  <div class="order-info">
    <div class="info-item">
      <span class="info-label">Project</span>
      <span class="info-value">${project?.name || 'N/A'}</span>
    </div>
    <div class="info-item">
      <span class="info-label">Currency</span>
      <span class="info-value">${order.currency || 'EUR'}</span>
    </div>
    <div class="info-item">
      <span class="info-label">Incoterm</span>
      <span class="info-value">${order.incoterm || 'FOB'}</span>
    </div>
    <div class="info-item">
      <span class="info-label">Payment Terms</span>
      <span class="info-value">${order.payment_terms || '30% deposit, 70% before shipment'}</span>
    </div>
    <div class="info-item">
      <span class="info-label">Expected Delivery</span>
      <span class="info-value">${order.expected_date || 'TBD'}</span>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width: 40px;">#</th>
        <th style="width: 100px;">SKU</th>
        <th>Description</th>
        <th style="width: 80px; text-align: center;">Qty</th>
        <th style="width: 100px; text-align: right;">Unit Price</th>
        <th style="width: 120px; text-align: right;">Total</th>
      </tr>
    </thead>
    <tbody>
      ${itemsHtml}
    </tbody>
  </table>

  <div class="totals">
    <div class="totals-table">
      <div class="totals-row">
        <span class="totals-label">Subtotal</span>
        <span class="totals-value">${Number(order.subtotal || 0).toFixed(2)} ${order.currency}</span>
      </div>
      <div class="totals-row">
        <span class="totals-label">Shipping</span>
        <span class="totals-value">${Number(order.shipping_cost || 0).toFixed(2)} ${order.currency}</span>
      </div>
      <div class="totals-row">
        <span class="totals-label">Tax</span>
        <span class="totals-value">${Number(order.tax || 0).toFixed(2)} ${order.currency}</span>
      </div>
      <div class="totals-row grand-total">
        <span class="totals-label">TOTAL</span>
        <span class="totals-value">${Number(order.total || 0).toFixed(2)} ${order.currency}</span>
      </div>
    </div>
  </div>

  ${order.notes ? `
  <div class="terms">
    <h3>Notes / Special Instructions</h3>
    <p>${order.notes}</p>
  </div>
  ` : ''}

  <div class="terms">
    <h3>Terms & Conditions</h3>
    <p>1. This Purchase Order is subject to the terms and conditions stated herein.</p>
    <p>2. Quality must conform to approved samples and specifications.</p>
    <p>3. Supplier must provide all required certifications and documentation.</p>
    <p>4. Any changes to this order must be approved in writing by the buyer.</p>
  </div>

  <div class="footer">
    <div class="signature">
      <div class="signature-line"></div>
      <div class="signature-label">Buyer Signature</div>
    </div>
    <div class="signature">
      <div class="signature-line"></div>
      <div class="signature-label">Date</div>
    </div>
  </div>

  <div class="legal-footer">
    ${COMPANY_INFO.legalName} | NIF: ${COMPANY_INFO.nif} | ${COMPANY_INFO.address}, ${COMPANY_INFO.city}, ${COMPANY_INFO.country}
  </div>
</body>
</html>
`
}

// Funció per convertir HTML a PDF (utilitza el navegador)
export const htmlToPdfBlob = async (html) => {
  // Crear iframe ocult
  const iframe = document.createElement('iframe')
  iframe.style.position = 'absolute'
  iframe.style.top = '-10000px'
  iframe.style.left = '-10000px'
  document.body.appendChild(iframe)

  // Escriure HTML a l'iframe
  const doc = iframe.contentDocument || iframe.contentWindow.document
  doc.open()
  doc.write(html)
  doc.close()

  // Esperar que carregui
  await new Promise(resolve => setTimeout(resolve, 500))

  // Imprimir a PDF
  return new Promise((resolve, reject) => {
    try {
      iframe.contentWindow.print()
      // Nota: Això obrirà el diàleg d'impressió del navegador
      // Per generar PDF automàticament caldria una llibreria com html2pdf.js o jsPDF
      document.body.removeChild(iframe)
      resolve(null) // En aquest cas retornem null perquè l'usuari ha d'imprimir manualment
    } catch (error) {
      document.body.removeChild(iframe)
      reject(error)
    }
  })
}

// Versió alternativa amb html2pdf (si s'instal·la)
export const generatePdfWithLibrary = async (html, filename) => {
  // Necessita: npm install html2pdf.js
  // Importar: import html2pdf from 'html2pdf.js'
  
  /*
  const element = document.createElement('div')
  element.innerHTML = html
  
  const opt = {
    margin: 0,
    filename: filename,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  }
  
  const pdfBlob = await html2pdf().set(opt).from(element).outputPdf('blob')
  return pdfBlob
  */
  
  console.log('Per generar PDFs automàticament, instal·la html2pdf.js')
  return null
}

// Funció principal per generar i descarregar PO
export const generateAndDownloadPO = async (order, project, supplier, items) => {
  const html = generatePOHtml(order, project, supplier, items)
  
  // Opció 1: Obrir en nova finestra per imprimir
  const printWindow = window.open('', '_blank')
  printWindow.document.write(html)
  printWindow.document.close()
  printWindow.onload = () => {
    printWindow.print()
  }
  
  return html
}

// Funció per previsualitzar PO
export const previewPO = (order, project, supplier, items) => {
  const html = generatePOHtml(order, project, supplier, items)
  const blob = new Blob([html], { type: 'text/html' })
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank')
}

export default {
  generatePOHtml,
  generateAndDownloadPO,
  previewPO,
  COMPANY_INFO
}
