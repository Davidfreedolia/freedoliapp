// D8.3.1 — UI lint (lightweight, no ESLint plugin)
// Fails on (only for staged files under src/):
//  - inline styles: style={{ ...
//  - hex colors in JSX/TSX: #RGB/#RRGGBB/#RRGGBBAA
//  - bare <button> labels (heuristic)
+
import fs from 'node:fs'
import path from 'node:path'
import { execSync } from 'node:child_process'
+
const exts = new Set(['.js', '.jsx', '.ts', '.tsx'])
+
function getStagedFiles() {
  try {
    const out = execSync('git diff --cached --name-only --diff-filter=ACM -- \"src\"', {
      encoding: 'utf8',
    })
    return out
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l && exts.has(path.extname(l)))
  } catch {
    return []
  }
}
+
const files = getStagedFiles()
+
if (!files.length) {
  console.log('ui-lint: no staged UI files, skipping')
  process.exit(0)
}
+
const styleRe = /style=\{\{/ // inline style
const hexRe = /#[0-9a-fA-F]{3,8}/
const bareButtonRe = /<button[^>]*>([^<{]*[A-Za-z][^<{]*)<\/button>/
+
const problems = []
+
for (const rel of files) {
  const full = path.resolve(process.cwd(), rel)
  const content = fs.readFileSync(full, 'utf8')
  const lines = content.split(/\r?\n/)
  lines.forEach((line, idx) => {
    if (styleRe.test(line)) {
      problems.push(`${rel}:${idx + 1}: inline style detected (style={{ ... }})`)
    }
    if (hexRe.test(line)) {
      problems.push(`${rel}:${idx + 1}: hex color detected (use tokens instead)`)
    }
    if (bareButtonRe.test(line) && !line.includes('t(')) {
      problems.push(`${rel}:${idx + 1}: bare <button> label (wrap in i18n / canonical Button)`)
    }
  })
}
+
if (problems.length) {
  console.error('UI lint failed:\n' + problems.join('\n'))
  process.exit(1)
}
+
console.log('ui-lint: OK')

