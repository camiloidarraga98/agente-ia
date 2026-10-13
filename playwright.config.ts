import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e",
  workers: 1,
  fullyParallel: false,
  use: {
    baseURL: "http://127.0.0.1:3061",
    viewport: { width: 1440, height: 1000 },
    launchOptions: {
      executablePath: process.env.JAC_CHROMIUM_PATH || "/usr/bin/chromium",
      args: ["--no-sandbox"],
    },
    trace: "retain-on-failure",
  },
  webServer: [
    {
      command: "node scripts/test-server.mjs",
      url: "http://127.0.0.1:3061/api/health",
      reuseExistingServer: false,
    },
    {
      command: "node scripts/test-server-protected.mjs",
      url: "http://127.0.0.1:3062/api/health",
      reuseExistingServer: false,
    },
  ],
});
