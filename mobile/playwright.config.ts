import { defineConfig, devices } from '@playwright/test';

const isCI = !!process.env['CI'];

export default defineConfig({
  testDir: './e2e/specs',
  fullyParallel: false,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  workers: 1,
  maxFailures: isCI ? 3 : undefined,
  reporter: isCI ? [['list'], ['html', { open: 'never' }]] : 'html',
  timeout: 120_000,
  use: {
    baseURL: 'http://localhost:8100',
    trace: 'on-first-retry',
    // Emulate Mobile Chrome on Pixel 5
    ...devices['Pixel 5'],
  },
  projects: [
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],
  testMatch: '**/*.spec.ts',
  webServer: process.env['E2E_SKIP_WEB_SERVER']
    ? undefined
    : {
        // CI: build once then serve static www (fast, reliable). Local: dev server.
        command: isCI ? 'npm run start:e2e:ci' : 'npm run start:e2e',
        url: 'http://localhost:8100',
        reuseExistingServer: !isCI,
        timeout: isCI ? 300_000 : 180_000,
        stdout: 'pipe',
        stderr: 'pipe',
      },
});
