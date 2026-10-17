import { existsSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

const installedEdge = existsSync(
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
);

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:3100",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        channel: installedEdge ? "msedge" : undefined,
      },
    },
  ],
  webServer: [{
    command: "node tests/support/auth-server.mjs",
    url: "http://127.0.0.1:54321/health",
    reuseExistingServer: false,
  }, {
    command: "node tests/support/start-e2e.mjs",
    env: {
      NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "playwright-anon-key",
      SUPABASE_SERVICE_ROLE_KEY: "playwright-service-role-key",
      NEXO_E2E_ERROR_PROBE: "enabled",
    },
    url: "http://127.0.0.1:3100/login",
    reuseExistingServer: false,
    timeout: 120_000,
  }],
});
