import { test as base, Page, BrowserContext, devices } from '@playwright/test';
import { NetworkInterceptor } from './network-interceptor';
import { loginAndWaitForTabs } from './auth-flow';

const E2E_BASE_URL = process.env['PLAYWRIGHT_BASE_URL'] ?? 'http://localhost:8100';
const { defaultBrowserType: _device, ...mobileContext } = devices['Pixel 5'];

type WorkerFixtures = {
  workerContext: BrowserContext;
  authenticatedPage: Page;
};

/**
 * Worker-scoped page: one login + initialization per Playwright worker.
 * Reuses the same tab for serial smoke tests (Angular session stays alive).
 */
export const test = base.extend<{}, WorkerFixtures>({
  workerContext: [
    async ({ browser }, use) => {
      const context = await browser.newContext({
        baseURL: E2E_BASE_URL,
        ...mobileContext,
      });
      await use(context);
      await context.close();
    },
    { scope: 'worker' },
  ],

  authenticatedPage: [
    async ({ workerContext }, use) => {
      const page = await workerContext.newPage();
      const interceptor = new NetworkInterceptor(page);
      await interceptor.setup();
      await loginAndWaitForTabs(page);
      await use(page);
      await page.close();
    },
    { scope: 'worker', timeout: 180_000 },
  ],
});

export { expect } from '@playwright/test';
