import { defineConfig, devices } from '@playwright/test';

const isCI = !!process.env['CI'];

export default defineConfig({
  testDir: './e2e/specs',
  fullyParallel: false,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: 1,
  reporter: isCI ? [['list'], ['html', { open: 'never' }]] : 'html',
  timeout: 120_000,
  use: {
    baseURL: 'http://localhost:8100',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    ...devices['Pixel 5'],
  },
  projects: [
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],
  webServer: process.env['E2E_SKIP_WEB_SERVER']
    ? undefined
    : {
        command: isCI ? 'npm run start:e2e:ci' : 'npm run start:e2e',
        url: 'http://localhost:8100',
        reuseExistingServer: !isCI,
        timeout: isCI ? 300_000 : 180_000,
        stdout: 'pipe',
        stderr: 'pipe',
      },
});
