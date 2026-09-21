import { defineConfig, devices } from "@playwright/test"

const PORT = 5173
const BASE_URL = `http://localhost:${PORT}`

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["html", { open: "never" }], ["list"]] : "list",
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: process.env.CI
    ? [
        {
          command: "python -m uvicorn app.main:app --port 8000",
          cwd: "../backend",
          port: 8000,
          reuseExistingServer: false,
          timeout: 60_000,
          // Disables the rate limiter (see app/middleware/rate_limit.py) so
          // a fast E2E run doesn't trip it and surface as flaky failures.
          env: { ANNADATA_ENV: "test" },
        },
        {
          command: "npm run dev -- --port 5173",
          cwd: "../frontend",
          port: PORT,
          reuseExistingServer: false,
          timeout: 60_000,
        },
      ]
    : undefined,
})
