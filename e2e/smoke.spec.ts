/**
 * smoke.spec.ts — Smoke tests (no auth required)
 *
 * These tests run against the public-facing pages to assert that
 * critical UI elements are present and functional.
 *
 * Run in isolation: npx playwright test e2e/smoke.spec.ts
 */
import { test, expect } from '@playwright/test'

test.describe('Smoke: Landing page', () => {
  test('renders hero title and CTA', async ({ page }) => {
    await page.goto('/')
    // Title
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 10_000 })
    // At least one call-to-action link/button
    const cta = page.locator('a[href="/register"], button').filter({
      hasText: /prova|trial|Comença|Start|Registre/i,
    })
    await expect(cta.first()).toBeVisible({ timeout: 10_000 })
  })

  test('navbar is visible and contains login link', async ({ page }) => {
    await page.goto('/')
    const nav = page.locator('nav').first()
    await expect(nav).toBeVisible({ timeout: 10_000 })
    const loginBtn = nav.locator('button, a').filter({ hasText: /inicia|iniciar|log\s*in/i })
    await expect(loginBtn.first()).toBeVisible({ timeout: 10_000 })
  })

  test('no JS error on page load', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    // Filter known third-party noise
    const fatal = errors.filter(
      (e) => !e.includes('Script error') && !e.includes('ResizeObserver')
    )
    expect(fatal, `Unexpected JS errors: ${fatal.join('\n')}`).toHaveLength(0)
  })
})

test.describe('Smoke: Login page', () => {
  test('renders email and password inputs', async ({ page }) => {
    await page.goto('/login')
    await expect(page.locator('input[type="email"], input[name="email"]').first()).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('input[type="password"]').first()).toBeVisible({ timeout: 10_000 })
  })

  test('shows validation error for empty submit', async ({ page }) => {
    await page.goto('/login')
    const submitBtn = page.locator('button[type="submit"]').first()
    await expect(submitBtn).toBeVisible({ timeout: 10_000 })
    await submitBtn.click()
    // Either browser native validation or an error message appears
    const hasNativeValid = await page.evaluate(() => {
      const input = document.querySelector<HTMLInputElement>('input[type="email"]')
      return input ? !input.validity.valid : false
    })
    const errorEl = page.locator('[role="alert"], .error, [data-testid="error"]')
    const hasErrorEl = await errorEl.count() > 0
    expect(hasNativeValid || hasErrorEl, 'Expected native validation or error element').toBeTruthy()
  })
})

test.describe('Smoke: Trial / Register page', () => {
  test('renders sign-up form or redirect', async ({ page }) => {
    const response = await page.goto('/trial')
    // Accept both 200 (form) and any redirect
    expect(response?.status() ?? 200).toBeLessThan(500)
    // Page should have loaded something meaningful
    await expect(page.locator('body')).not.toBeEmpty()
  })
})
