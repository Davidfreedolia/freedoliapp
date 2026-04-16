import { test } from "@playwright/test";
import fs from "fs";
import path from "path";

const storageStatePath = path.join(process.cwd(), "e2e", ".auth", "storageState.json");

function hasValidAuthToken() {
  try {
    if (!fs.existsSync(storageStatePath)) return false;
    const saved = JSON.parse(fs.readFileSync(storageStatePath, "utf8"));
    const allKeys = (saved.origins || []).flatMap(o =>
      (o.localStorage || []).map(e => e.name)
    );
    const hasToken = allKeys.some(k =>
      k.includes("auth-token") || k.startsWith("sb-") || k === "freedoliapp-auth"
    );
    if (!hasToken) return false;
    const stat = fs.statSync(storageStatePath);
    return (Date.now() - stat.mtimeMs) < 60 * 60 * 1000;
  } catch {
    return false;
  }
}

test("auth: capture storageState", async ({ page }) => {
  if (hasValidAuthToken()) {
    console.log("✅ storageState existent i vàlid — no es sobreescriu.");
    return;
  }

  await page.goto("/");

  console.log("⏳ Esperant que facis login manualment...");
  console.log("   Buscant indicadors d'autenticació: sidebar, dashboard, finances...");
  console.log("   (o executa: node e2e/login-and-save.mjs per fer-ho automàtic)");

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

  const authDir = path.join(process.cwd(), "e2e", ".auth");
  fs.mkdirSync(authDir, { recursive: true });

  await page.context().storageState({ path: storageStatePath });

  console.log("✅ Storage state guardat correctament a:");
  console.log(`   ${storageStatePath}`);
  console.log("\n📝 Ara pots executar altres tests i reutilitzaran aquesta autenticació.");
});
