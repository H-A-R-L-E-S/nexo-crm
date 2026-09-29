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
    command: "node node_modules/next/dist/bin/next dev --webpack --hostname 127.0.0.1 --port 3100",
    env: {
      NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "playwright-anon-key",
    },
    url: "http://127.0.0.1:3100/login",
    reuseExistingServer: false,
    timeout: 120_000,
  }],
});
