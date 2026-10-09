import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e-tests",
  testMatch: "**/api.spec.ts",
  fullyParallel: false,
  forbidOnly: true,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "list",
  use: {
    baseURL: "http://localhost:8080",
  },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:8080/",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
