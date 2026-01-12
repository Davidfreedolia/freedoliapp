// Script para crear archivos de prueba pequeños para tests E2E
import { jsPDF } from 'jspdf'
import { writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const projectRoot = join(__dirname, '..')
const fixturesDir = join(projectRoot, 'e2e', 'fixtures')

// Crear ok.pdf (pequeño ~50KB)
const doc = new jsPDF()
doc.setFontSize(16)
doc.text('Test PDF para E2E', 10, 20)
doc.setFontSize(12)
doc.text('Este es un archivo PDF de prueba pequeño para tests de upload de receipts.', 10, 30)
doc.text('Contenido mínimo para validar la funcionalidad de upload.', 10, 40)
const pdfOutput = doc.output('arraybuffer')
writeFileSync(join(fixturesDir, 'ok.pdf'), Buffer.from(pdfOutput))
console.log(`✅ ok.pdf creado: ${(pdfOutput.byteLength / 1024).toFixed(2)} KB`)

// Crear ok.jpg (simulado como pequeño archivo binario)
// Nota: Para crear un JPG real necesitaríamos una librería de imágenes
// Por ahora crearemos un archivo placeholder que simule ser un JPG
// En un entorno real, podrías usar una imagen real pequeña
const jpgPlaceholder = Buffer.from([
  0xFF, 0xD8, 0xFF, 0xE0, // JPEG header
  0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01, // JFIF
  // ... más datos JPEG mínimos
])
// Para tests, un archivo más pequeño es mejor
const minimalJpg = Buffer.alloc(1024) // 1KB placeholder
writeFileSync(join(fixturesDir, 'ok.jpg'), minimalJpg)
console.log(`✅ ok.jpg creado: ${(minimalJpg.length / 1024).toFixed(2)} KB`)

// Crear bad.zip (archivo no permitido)
const zipContent = Buffer.from('PK\x03\x04') // ZIP header mínimo
writeFileSync(join(fixturesDir, 'bad.zip'), zipContent)
console.log(`✅ bad.zip creado: ${(zipContent.length / 1024).toFixed(2)} KB`)

console.log(`\n✅ Todos los archivos de prueba creados en: ${fixturesDir}`)
