/**
 * playwright.config.js — Playwright E2E test configuration (R34–R36)
 * Tests run against the local dev stack by default.
 * E2E_BASE_URL env var can point to a deployed instance.
 */
const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './e2e',
  timeout:  30 * 1000,
  expect:  { timeout: 8000 },

  // No parallel — tests share a database, run sequentially to avoid flakiness
  fullyParallel: false,
  forbidOnly:    !!process.env.CI,
  retries:       process.env.CI ? 2 : 0,
  workers:       1,

  reporter: [
    ['html', { outputFolder: 'docs/playwright-report', open: 'never' }],
    ['list'],
  ],

  use: {
    baseURL:    process.env.E2E_BASE_URL || 'http://localhost:5173',
    trace:      'on-first-retry',
    screenshot: 'only-on-failure',
    video:      'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use:  { browserName: 'chromium' },
    },
  ],
});
