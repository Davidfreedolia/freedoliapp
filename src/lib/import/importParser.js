/**
 * Universal parser for CSV / TSV / XLSX / JSON import files.
 *
 * Returns: { columns: string[], rows: Record<string, any>[], sheetNames?: string[] }
 */
import Papa from 'papaparse'
import * as XLSX from 'xlsx'

const CSV_MIME = ['text/csv', 'text/x-csv', 'application/csv', 'application/vnd.ms-excel']
const XLSX_MIME = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
]
const JSON_MIME = ['application/json', 'text/json']

function detectKind(file) {
  const name = (file?.name || '').toLowerCase()
  const type = (file?.type || '').toLowerCase()
  if (name.endsWith('.xlsx') || name.endsWith('.xls') || name.endsWith('.xlsm')) return 'xlsx'
  if (name.endsWith('.json')) return 'json'
  if (name.endsWith('.tsv')) return 'tsv'
  if (name.endsWith('.csv')) return 'csv'
  if (XLSX_MIME.includes(type)) return 'xlsx'
  if (JSON_MIME.includes(type)) return 'json'
  if (CSV_MIME.includes(type)) return 'csv'
  return 'csv' // fallback
}

async function readAsText(file) {
  if (typeof file.text === 'function') return file.text()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(reader.error || new Error('read_failed'))
    reader.readAsText(file)
  })
}

async function readAsArrayBuffer(file) {
  if (typeof file.arrayBuffer === 'function') return file.arrayBuffer()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(reader.error || new Error('read_failed'))
    reader.readAsArrayBuffer(file)
  })
}

function parseCSVString(text, { delimiter } = {}) {
  return new Promise((resolve, reject) => {
    Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false,
      delimiter: delimiter || '', // auto-detect
      transformHeader: (h) => (h || '').trim(),
      complete: (res) => {
        const rows = (res.data || []).filter((r) => r && Object.values(r).some((v) => v !== '' && v != null))
        const columns = res.meta?.fields || (rows[0] ? Object.keys(rows[0]) : [])
        resolve({ columns, rows })
      },
      error: (err) => reject(err),
    })
  })
}

function sheetToRows(workbook, sheetName) {
  const sheet = workbook.Sheets[sheetName]
  if (!sheet) return { columns: [], rows: [] }
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false })
  const columns = rows.length ? Object.keys(rows[0]).map((c) => c.trim()) : []
  // Normalize column names on rows (trim keys)
  const normalizedRows = rows.map((r) => {
    const o = {}
    Object.keys(r).forEach((k) => { o[k.trim()] = r[k] })
    return o
  }).filter((r) => Object.values(r).some((v) => v !== '' && v != null))
  return { columns, rows: normalizedRows }
}

/**
 * Parse a user-supplied file.
 *
 * @param {File|Blob} file
 * @param {object} [opts]
 * @param {string} [opts.sheet] — XLSX only: sheet name. Defaults to first.
 * @returns {Promise<{columns: string[], rows: Record<string, any>[], sheetNames?: string[], kind: string}>}
 */
export async function parseImportFile(file, opts = {}) {
  if (!file) throw new Error('no_file')
  const kind = detectKind(file)

  if (kind === 'json') {
    const text = await readAsText(file)
    let parsed
    try { parsed = JSON.parse(text) } catch (e) { throw new Error('invalid_json') }
    const rows = Array.isArray(parsed) ? parsed : (Array.isArray(parsed?.data) ? parsed.data : [])
    const columns = rows.length ? Array.from(new Set(rows.flatMap((r) => Object.keys(r || {})))) : []
    return { kind, columns, rows }
  }

  if (kind === 'csv' || kind === 'tsv') {
    const text = await readAsText(file)
    const delimiter = kind === 'tsv' ? '\t' : undefined
    const { columns, rows } = await parseCSVString(text, { delimiter })
    return { kind, columns, rows }
  }

  if (kind === 'xlsx') {
    const buf = await readAsArrayBuffer(file)
    const workbook = XLSX.read(buf, { type: 'array' })
    const sheetNames = workbook.SheetNames || []
    const target = opts.sheet && sheetNames.includes(opts.sheet) ? opts.sheet : sheetNames[0]
    if (!target) return { kind, columns: [], rows: [], sheetNames }
    const { columns, rows } = sheetToRows(workbook, target)
    return { kind, columns, rows, sheetNames, sheet: target }
  }

  throw new Error('unsupported_format')
}
