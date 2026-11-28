import { defineConfig, devices } from "@playwright/test";

const FRONTEND_PORT = 3100;
const MOCK_API_PORT = 4344;
const BASE_URL = `http://127.0.0.1:${FRONTEND_PORT}`;
const API_BASE_URL = `http://127.0.0.1:${MOCK_API_PORT}/api/v1`;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 2,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry"
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] }
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] }
    }
  ],
  webServer: [
    {
      command: `node tests/e2e/mock-api-server.mjs`,
      url: `http://127.0.0.1:${MOCK_API_PORT}/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
      stdout: "pipe",
      stderr: "pipe",
      env: {
        MOCK_API_PORT: String(MOCK_API_PORT)
      }
    },
    {
      command: `pnpm exec next dev --hostname 127.0.0.1 --port ${FRONTEND_PORT}`,
      url: `${BASE_URL}/en`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      stdout: "pipe",
      stderr: "pipe",
      env: {
        NEXT_PUBLIC_API_BASE_URL: API_BASE_URL,
        NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "",
        CLERK_SECRET_KEY: "",
        NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_test_e2e_mock"
      }
    }
  ]
});
