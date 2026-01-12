import { defineConfig } from "@playwright/test";
import { existsSync } from "fs";
import path from "path";

const storageStatePath = path.join(process.cwd(), "e2e", ".auth", "storageState.json");

export default defineConfig({
  testDir: "./e2e",
  testMatch: /.*\.(spec|test|setup)\.(js|ts|mjs)/,
  timeout: 60_000,
  retries: 1,
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
      name: "default",
      testMatch: /.*\.(spec|test)\.(js|ts|mjs)/,
      use: {
        // Los tests normales usan el storageState si existe
        ...(existsSync(storageStatePath) && { storageState: storageStatePath }),
      },
    },
  ],
});
