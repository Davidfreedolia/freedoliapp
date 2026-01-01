#!/usr/bin/env node
/* eslint-env node */

/**
 * Production Smoke Test
 * 
 * Valida que el build está listo para producción:
 * - Build exitoso
 * - Variables de entorno presentes
 * - Chunks generados correctamente
 */

import { existsSync, readFileSync, statSync, readdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const rootDir = join(__dirname, '..')

// Colores para output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
}

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

function error(message) {
  log(`❌ ${message}`, 'red')
}

function success(message) {
  log(`✅ ${message}`, 'green')
}

function info(message) {
  log(`ℹ️  ${message}`, 'cyan')
}

function warning(message) {
  log(`⚠️  ${message}`, 'yellow')
}

// Verificar variables de entorno
function checkEnvVars() {
  info('Verificando variables de entorno...')
  
  const requiredVars = [
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY'
  ]
  
  const missing = []
  const present = []
  
  // Leer .env si existe
  const envPath = join(rootDir, '.env')
  let envContent = ''
  
  if (existsSync(envPath)) {
    envContent = readFileSync(envPath, 'utf-8')
  }
  
  // También verificar .env.local
  const envLocalPath = join(rootDir, '.env.local')
  if (existsSync(envLocalPath)) {
    envContent += '\n' + readFileSync(envLocalPath, 'utf-8')
  }
  
  for (const varName of requiredVars) {
    // Verificar en process.env (puede estar en CI/CD)
    if (process.env[varName]) {
      present.push(varName)
      continue
    }
    
    // Verificar en archivos .env
    const regex = new RegExp(`^${varName}=(.+)$`, 'm')
    if (regex.test(envContent)) {
      present.push(varName)
      continue
    }
    
    missing.push(varName)
  }
  
  if (missing.length > 0) {
    error(`Faltan variables de entorno requeridas: ${missing.join(', ')}`)
    warning('Asegúrate de tener un archivo .env con:')
    missing.forEach(v => {
      console.log(`  ${v}=...`)
    })
    return false
  }
  
  success(`Todas las variables de entorno están presentes (${present.length}/${requiredVars.length})`)
  return true
}

// Verificar que el build existe y tiene los chunks esperados
function checkBuildOutput() {
  info('Verificando output del build...')
  
  const distDir = join(rootDir, 'dist')
  
  if (!existsSync(distDir)) {
    error('El directorio dist/ no existe. Ejecuta "npm run build" primero.')
    return false
  }
  
  // Verificar index.html
  const indexPath = join(distDir, 'index.html')
  if (!existsSync(indexPath)) {
    error('dist/index.html no existe')
    return false
  }
  
  const indexContent = readFileSync(indexPath, 'utf-8')
  
  // Verificar que index.html referencia los chunks principales
  const expectedChunks = [
    'assets/index-',  // Chunk principal
    'assets/react-vendor-',  // React vendor chunk
    'assets/supabase-'  // Supabase chunk
  ]
  
  const missingChunks = []
  for (const chunk of expectedChunks) {
    if (!indexContent.includes(chunk)) {
      missingChunks.push(chunk)
    }
  }
  
  if (missingChunks.length > 0) {
    warning(`Algunos chunks esperados no se encontraron: ${missingChunks.join(', ')}`)
    warning('Esto puede ser normal si el build ha cambiado. Verifica manualmente.')
  } else {
    success('Chunks principales encontrados en index.html')
  }
  
  // Verificar que hay archivos JS en assets
  const assetsDir = join(distDir, 'assets')
  if (!existsSync(assetsDir)) {
    error('dist/assets/ no existe')
    return false
  }
  
  // Contar archivos JS
  const files = readdirSync(assetsDir)
  const jsFiles = files.filter(f => f.endsWith('.js'))
  const cssFiles = files.filter(f => f.endsWith('.css'))
  
  if (jsFiles.length === 0) {
    error('No se encontraron archivos JS en dist/assets/')
    return false
  }
  
  success(`Build output válido: ${jsFiles.length} archivos JS, ${cssFiles.length} archivos CSS`)
  
  // Verificar tamaño de chunks (advertencia si son muy grandes)
  let totalSize = 0
  for (const file of jsFiles) {
    const filePath = join(assetsDir, file)
    const stats = statSync(filePath)
    totalSize += stats.size
  }
  
  const totalSizeMB = (totalSize / 1024 / 1024).toFixed(2)
  info(`Tamaño total de JS: ${totalSizeMB} MB`)
  
  if (totalSize > 5 * 1024 * 1024) { // > 5MB
    warning('El tamaño total de JS es grande (>5MB). Considera optimizar.')
  }
  
  return true
}

// Verificar que los imports en index.html son válidos
function checkImports() {
  info('Verificando imports en index.html...')
  
  const indexPath = join(rootDir, 'dist', 'index.html')
  if (!existsSync(indexPath)) {
    return false
  }
  
  const indexContent = readFileSync(indexPath, 'utf-8')
  const distDir = join(rootDir, 'dist')
  
  // Extraer todos los src y href de scripts y links
  const scriptRegex = /<script[^>]+src=["']([^"']+)["']/g
  const linkRegex = /<link[^>]+href=["']([^"']+)["']/g
  
  const imports = []
  let match
  
  while ((match = scriptRegex.exec(indexContent)) !== null) {
    imports.push(match[1])
  }
  
  while ((match = linkRegex.exec(indexContent)) !== null) {
    imports.push(match[1])
  }
  
  const missing = []
  for (const imp of imports) {
    // Resolver ruta relativa
    const importPath = imp.startsWith('/') 
      ? join(distDir, imp.slice(1))
      : join(distDir, imp)
    
    if (!existsSync(importPath)) {
      missing.push(imp)
    }
  }
  
  if (missing.length > 0) {
    error(`Imports rotos encontrados: ${missing.join(', ')}`)
    return false
  }
  
  success(`Todos los imports son válidos (${imports.length} archivos)`)
  return true
}

// Función principal
function runSmokeTest() {
  log('\n🚀 Ejecutando Production Smoke Test...\n', 'blue')
  
  let allPassed = true
  
  // 1. Verificar variables de entorno
  if (!checkEnvVars()) {
    allPassed = false
  }
  
  console.log()
  
  // 2. Verificar build output
  if (!checkBuildOutput()) {
    allPassed = false
  }
  
  console.log()
  
  // 3. Verificar imports
  if (!checkImports()) {
    allPassed = false
  }
  
  console.log()
  
  // Resumen
  if (allPassed) {
    success('✅ Smoke test completado: Todo OK')
    log('\n📋 Próximos pasos:', 'cyan')
    log('   1. Revisa SMOKE_TEST.md para el checklist manual', 'cyan')
    log('   2. Despliega a producción', 'cyan')
    log('   3. Ejecuta el checklist manual después del deploy\n', 'cyan')
    process.exit(0)
  } else {
    error('❌ Smoke test falló: Corrige los errores antes de desplegar')
    log('\n💡 Tips:', 'yellow')
    log('   - Ejecuta "npm run build" para generar el build', 'yellow')
    log('   - Verifica que .env tiene todas las variables requeridas', 'yellow')
    log('   - Revisa los errores arriba para más detalles\n', 'yellow')
    process.exit(1)
  }
}

// Ejecutar
try {
  runSmokeTest()
} catch (err) {
  error(`Error inesperado: ${err.message}`)
  console.error(err)
  process.exit(1)
}

