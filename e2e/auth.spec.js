import { test } from "@playwright/test";
import fs from "fs";
import path from "path";

test("auth: capture storageState", async ({ page }) => {
  await page.goto("/");

  // IMPORTANT:
  // 1) aquí no automatitzem login
  // 2) tu fas login manualment a la finestra del navegador que s'obrirà
  // 3) quan estiguis dins l'app (veus el sidebar amb Finances/Dashboard/etc), el test detectarà que estàs logat
  // 4) el test guardarà automàticament el storageState per reutilitzar-lo en altres tests

  console.log("⏳ Esperant que facis login manualment...");
  console.log("   Buscant indicadors d'autenticació: sidebar, dashboard, finances...");

  // Espera fins que detectem que estàs logat buscant múltiples indicadors:
  // - Sidebar amb navegació (Finances, Dashboard, Projectes, etc.)
  // - Quan qualsevol d'aquests apareix, assumim que estem autenticats
  await Promise.race([
    page.getByText(/Finances|Despeses|Expenses/i).first().waitFor({ timeout: 120_000 }),
    page.getByText(/Dashboard|Tauler/i).first().waitFor({ timeout: 120_000 }),
    page.getByText(/Projectes|Projects/i).first().waitFor({ timeout: 120_000 }),
    page.getByText(/Comandes|Orders/i).first().waitFor({ timeout: 120_000 }),
    // Buscar sidebar o container principal de l'app
    page.locator('nav, [role="navigation"], aside').first().waitFor({ timeout: 120_000 })
  ]).catch(() => {
    throw new Error("No s'ha pogut detectar l'autenticació després de 2 minuts. Assegura't que has fet login correctament.");
  });

  console.log("✅ Autenticació detectada! Guardant storage state...");

  const authDir = path.join(process.cwd(), "e2e", ".auth");
  fs.mkdirSync(authDir, { recursive: true });

  const storageStatePath = path.join(authDir, "storageState.json");
  await page.context().storageState({ path: storageStatePath });
  
  console.log("✅ Storage state guardat correctament a:");
  console.log(`   ${storageStatePath}`);
  console.log("\n📝 Ara pots executar altres tests i reutilitzaran aquesta autenticació.");
});
