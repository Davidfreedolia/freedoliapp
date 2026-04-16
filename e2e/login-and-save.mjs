/**
 * login-and-save.mjs
 * Fa login a freedoliapp.vercel.app amb les credencials donades,
 * espera el token Supabase al localStorage i guarda el storageState.
 * 
 * Ús: node e2e/login-and-save.mjs
 */
import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const BASE_URL = 'https://freedoliapp.vercel.app';
const EMAIL = 'david@freedolia.com';
const PASSWORD = 'D1ablo_666';
const OUT = path.join(process.cwd(), 'e2e', '.auth', 'storageState.json');

(async () => {
  console.log('🚀 Obrint navegador...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('🌐 Navigant al login...');
  await page.goto(`${BASE_URL}/login`);
  await page.waitForLoadState('networkidle');

  // Omplir email
  const emailInput = page.locator('input[type="email"], input[placeholder*="mail" i]').first();
  await emailInput.waitFor({ timeout: 10000 });
  await emailInput.fill(EMAIL);

  // Omplir password
  const passInput = page.locator('input[type="password"]').first();
  await passInput.fill(PASSWORD);

  // Clicar submit
  const submitBtn = page.locator('button[type="submit"], button:has-text("Iniciar"), button:has-text("Sign in"), button:has-text("Iniciar sessió")').first();
  await submitBtn.click();

  console.log('⏳ Esperant autenticació Supabase...');

  // Espera que el token Supabase aparegui al localStorage
  try {
    await page.waitForFunction(() => {
      return Object.keys(localStorage).some(k => k.startsWith('sb-') && k.includes('auth-token'));
    }, { timeout: 15000 });
    console.log('✅ Token Supabase detectat!');
  } catch {
    // Intenta esperar la redirecció a /app
    await page.waitForURL(/\/app/, { timeout: 15000 }).catch(() => {});
    console.log('ℹ️  Redirecció a /app detectada, guardant estat...');
  }

  // Debug: mostra les claus de localStorage
  const keys = await page.evaluate(() => Object.keys(localStorage));
  console.log('📦 localStorage keys:', keys.filter(k => k.includes('sb-') || k.includes('auth') || k.includes('supabase')).join(', ') || keys.slice(0, 5).join(', '));

  // Guarda storageState
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  await context.storageState({ path: OUT });
  console.log(`✅ storageState guardat a: ${OUT}`);

  // Verifica contingut
  const saved = JSON.parse(fs.readFileSync(OUT, 'utf8'));
  const authKeys = (saved.origins || []).flatMap(o => (o.localStorage || []).map(e => e.name)).filter(k => k.includes('sb-') || k.includes('auth'));
  console.log('🔑 Claus auth guardades:', authKeys.length > 0 ? authKeys.join(', ') : '⚠️  CAP TOKEN AUTH TROBAT');

  await browser.close();
  process.exit(authKeys.length > 0 ? 0 : 1);
})();
