import { defineConfig, devices } from "@playwright/test";
import { existsSync } from "node:fs";

if (existsSync(".env.local")) {
  process.loadEnvFile(".env.local");
}

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:3100",
    trace: "on-first-retry",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    {
      name: "mobile",
      grep: /@mobile/,
      use: { ...devices["Pixel 7"], viewport: { width: 320, height: 720 } },
    },
  ],
  webServer: [
    {
      command: "node tests/e2e/support/hibp-stub-server.ts",
      url: "http://127.0.0.1:3101/health",
      reuseExistingServer: !process.env.CI,
    },
    {
      command:
        "npm run build && npm run start -- --hostname 127.0.0.1 --port 3100",
      url: "http://127.0.0.1:3100",
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: { HIBP_RANGE_URL: "http://127.0.0.1:3101/range/" },
    },
  ],
});
