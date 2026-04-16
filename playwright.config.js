import { defineConfig } from "@playwright/test";
import { existsSync } from "fs";
import path from "path";

// Secure env loading: reads .env.test (git-ignored) for API keys and secrets.
// Required vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (for admin helpers).
// Optional:      E2E_BASE_URL (default: https://freedoliapp.vercel.app)
// See e2e/.env.example for a documented template.
try {
  const { createRequire } = await import("module");
  const require = createRequire(import.meta.url);
  const dotenv = require("dotenv");
  dotenv.config({ path: ".env.test" });
} catch {
  // dotenv not installed — env vars must be set externally (CI, PowerShell, etc.)
}

const storageStatePath = path.join(process.cwd(), "e2e", ".auth", "storageState.json");

export default defineConfig({
  testDir: "./e2e",
  testMatch: /.*\.(spec|test|setup)\.(js|ts|mjs)/,
  timeout: 60_000,
  retries: 1,
  reporter: [
    ["list"],
    ["./e2e/reporters/costReport.ts"],
  ],
  use: {
    baseURL: process.env.E2E_BASE_URL || "https://freedoliapp.vercel.app",
    headless: false,
    viewport: { width: 1440, height: 900 },
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "setup",
      testMatch: /.*\.setup\.(js|ts|mjs)/,
      // Setup no necesita storageState
    },
    {
      name: "smoke",
      testMatch: /smoke\.(spec|test)\.(js|ts|mjs)/,
      // Smoke tests never require auth storageState
    },
    {
      name: "default",
      testMatch: /(?<!smoke)\.(spec|test)\.(js|ts|mjs)/,
      use: {
        // Los tests normales usan el storageState si existe
        ...(existsSync(storageStatePath) && { storageState: storageStatePath }),
      },
    },
  ],
});
