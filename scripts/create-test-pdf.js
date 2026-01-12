// Script para crear un PDF de prueba grande para tests E2E
import { jsPDF } from 'jspdf'
import { writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const projectRoot = join(__dirname, '..')
const outputPath = join(projectRoot, 'e2e', 'fixtures', 'big.pdf')

// Crear PDF grande (para probar límite de tamaño ~10MB)
const doc = new jsPDF()

// Agregar muchas páginas con contenido para hacer el archivo grande
const baseText = 'Este es un archivo PDF de prueba para tests E2E. Contenido repetido para aumentar el tamaño. '

// Crear ~200 páginas para hacer el archivo grande
for (let page = 0; page < 200; page++) {
  if (page > 0) {
    doc.addPage()
  }
  
  let y = 20
  doc.setFontSize(12)
  
  // Agregar texto repetido en cada página
  for (let line = 0; line < 40; line++) {
    const text = `${baseText}${baseText}${baseText}${baseText}${baseText}${baseText}${baseText}${baseText}`
    doc.text(text, 10, y, { maxWidth: 180 })
    y += 7
  }
  
  // Agregar número de página
  doc.setFontSize(10)
  doc.text(`Página ${page + 1}`, 10, 285)
}

// Guardar el PDF
const pdfOutput = doc.output('arraybuffer')
writeFileSync(outputPath, Buffer.from(pdfOutput))

console.log(`✅ PDF de prueba creado: ${outputPath}`)
console.log(`   Tamaño: ${(pdfOutput.byteLength / 1024 / 1024).toFixed(2)} MB`)
