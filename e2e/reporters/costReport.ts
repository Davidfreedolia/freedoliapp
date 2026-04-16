/**
 * costReport.ts — Playwright custom reporter
 *
 * Prints a summary table after every test run:
 *  - Test name, status, duration
 *  - Totals: passed / failed / skipped / total time
 *
 * Used as a local reporter in playwright.config.ts (no extra deps needed).
 */
import type {
  Reporter,
  TestCase,
  TestResult,
  FullResult,
} from '@playwright/test/reporter'

interface TestEntry {
  title: string
  fullTitle: string
  status: string
  durationMs: number
  retries: number
  errors: string[]
}

const STATUS_ICON: Record<string, string> = {
  passed: '✅',
  failed: '❌',
  skipped: '⏭️ ',
  timedOut: '⏱️ ',
  interrupted: '🛑',
}

function formatMs(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

function padEnd(s: string, n: number): string {
  return s.length >= n ? s.slice(0, n - 1) + '…' : s.padEnd(n)
}

class CostReporter implements Reporter {
  private entries: TestEntry[] = []
  private runStart = Date.now()

  onTestEnd(test: TestCase, result: TestResult): void {
    this.entries.push({
      title: test.title,
      fullTitle: test.titlePath().join(' › '),
      status: result.status,
      durationMs: result.duration,
      retries: result.retry,
      errors: result.errors.map((e) => e.message ?? String(e)).slice(0, 2),
    })
  }

  onEnd(result: FullResult): void {
    const totalMs = Date.now() - this.runStart
    const passed   = this.entries.filter((e) => e.status === 'passed').length
    const failed   = this.entries.filter((e) => e.status === 'failed').length
    const skipped  = this.entries.filter((e) => e.status === 'skipped').length
    const timedOut = this.entries.filter((e) => e.status === 'timedOut').length

    console.log('\n' + '─'.repeat(80))
    console.log('📊  E2E COST REPORT')
    console.log('─'.repeat(80))

    if (this.entries.length === 0) {
      console.log('  No tests ran.')
    } else {
      console.log(
        `  ${'TEST'.padEnd(55)} ${'STATUS'.padEnd(10)} ${'TIME'.padStart(8)}`
      )
      console.log('  ' + '─'.repeat(76))
      for (const e of this.entries) {
        const icon = STATUS_ICON[e.status] ?? '❓'
        const retryLabel = e.retries > 0 ? ` (retry ${e.retries})` : ''
        const label = `${icon} ${padEnd(e.fullTitle + retryLabel, 53)}`
        const statusLabel = e.status.padEnd(10)
        const timeLabel = formatMs(e.durationMs).padStart(8)
        console.log(`  ${label} ${statusLabel} ${timeLabel}`)
        if (e.errors.length > 0) {
          for (const err of e.errors) {
            const firstLine = err.split('\n')[0].slice(0, 76)
            console.log(`      ↳ ${firstLine}`)
          }
        }
      }
    }

    console.log('─'.repeat(80))
    console.log(
      `  Total: ${this.entries.length} tests` +
      ` · ✅ ${passed} passed` +
      ` · ❌ ${failed} failed` +
      (skipped  > 0 ? ` · ⏭️  ${skipped} skipped`  : '') +
      (timedOut > 0 ? ` · ⏱️  ${timedOut} timed out` : '') +
      `  ·  ⏱ ${formatMs(totalMs)} total`
    )
    console.log(`  Run status: ${result.status.toUpperCase()}`)
    console.log('─'.repeat(80) + '\n')
  }
}

export default CostReporter
