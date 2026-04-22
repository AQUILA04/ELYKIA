import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e/specs',
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 2 : 0,
  workers: process.env['CI'] ? 1 : undefined,
  reporter: 'html',
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
  // Ignore the regular Angular component tests if any exist outside e2e
  testIgnore: '*spec.ts',
  testMatch: 'e2e/**/*.spec.ts',
  webServer: {
    command: 'npx ionic serve --port 8100 --no-open',
    url: 'http://localhost:8100',
    reuseExistingServer: !process.env['CI'],
    timeout: 120000,
  },
});
