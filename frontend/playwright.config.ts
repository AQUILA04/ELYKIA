import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env['E2E_BASE_URL'] ?? 'http://localhost:4200';

export default defineConfig({
  testDir: './e2e/specs',
  fullyParallel: false,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 2 : 0,
  workers: 1,
  reporter: [['html', { open: 'never' }], ['list']],
  timeout: 120_000,
  globalTimeout: 900_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    ...devices['Desktop Chrome'],
  },
  projects: [
    {
      name: 'smoke',
      testMatch: /smoke\/.*\.spec\.ts/,
    },
    {
      name: 'august-2026',
      testMatch: /august-2026\/.*\.spec\.ts/,
    },
  ],
  webServer: process.env['E2E_SKIP_WEB_SERVER']
    ? undefined
    : {
        command: 'npm run start -- --port 4200',
        url: baseURL,
        reuseExistingServer: !process.env['CI'],
        timeout: 180_000,
      },
});
