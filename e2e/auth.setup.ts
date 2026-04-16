import { test as setup } from "@playwright/test";
import fs from "fs";
import path from "path";

setup("auth: capture storageState", async ({ page }) => {
  await page.goto("/");

  console.log("⏳ Esperant que facis login manualment...");
  console.log("   Buscant indicadors d'autenticació: sidebar, dashboard, finances...");

  await Promise.race([
    page.getByText(/Finances|Despeses|Expenses/i).first().waitFor({ timeout: 120_000 }),
    page.getByText(/Dashboard|Tauler/i).first().waitFor({ timeout: 120_000 }),
    page.getByText(/Projectes|Projects/i).first().waitFor({ timeout: 120_000 }),
    page.getByText(/Comandes|Orders/i).first().waitFor({ timeout: 120_000 }),
    page.locator('nav, [role="navigation"], aside').first().waitFor({ timeout: 120_000 })
  ]).catch(() => {
    throw new Error("No s'ha pogut detectar l'autenticació després de 2 minuts.");
  });

  console.log("✅ Autenticació detectada! Guardant storage state...");

  // Espera explícita que el token Supabase sigui al localStorage
  // (el token és sb-<projectref>-auth-token)
  await page.waitForFunction(() => {
    return Object.keys(localStorage).some(k =>
      k.includes('auth-token') || k.startsWith('sb-')
    );
  }, { timeout: 15_000 }).catch(() => {
    console.log("⚠️  Token Supabase no trobat al localStorage — la sessió pot no funcionar per als tests");
  });

  // Debug: mostra quines claus de localStorage s'han guardat
  const lsKeys = await page.evaluate(() => Object.keys(localStorage));
  console.log("   localStorage keys:", lsKeys.filter(k => k.includes('sb-') || k.includes('auth')).join(', ') || '(cap token trobat)');

  const authDir = path.join(process.cwd(), "e2e", ".auth");
  fs.mkdirSync(authDir, { recursive: true });

  const storageStatePath = path.join(authDir, "storageState.json");
  await page.context().storageState({ path: storageStatePath });

  console.log("✅ Storage state guardat correctament a:");
  console.log(`   ${storageStatePath}`);
  console.log("\n📝 Ara pots executar altres tests i reutilitzaran aquesta autenticació.");
});
