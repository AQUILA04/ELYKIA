import { test as base, Page, BrowserContext } from '@playwright/test';
import { NetworkInterceptor } from './network-interceptor';
import { loginAndWaitForTabs } from './auth-flow';

type WorkerFixtures = {
  workerContext: BrowserContext;
};

type TestFixtures = {
  authenticatedPage: Page;
};

/**
 * Worker-scoped browser context: one login + initialization per Playwright worker.
 * IndexedDB (jeep-sqlite) is shared across tests in the same worker, avoiding
 * repeated 17-step initialization on every spec.
 */
export const test = base.extend<TestFixtures, WorkerFixtures>({
  workerContext: [
    async ({ browser }, use) => {
      const context = await browser.newContext();
      const page = await context.newPage();
      const interceptor = new NetworkInterceptor(page);
      await interceptor.setup();
      await loginAndWaitForTabs(page);
      await page.close();
      await use(context);
      await context.close();
    },
    { scope: 'worker' },
  ],

  authenticatedPage: async ({ workerContext }, use) => {
    const page = await workerContext.newPage();
    await use(page);
    await page.close();
  },
});

export { expect } from '@playwright/test';
