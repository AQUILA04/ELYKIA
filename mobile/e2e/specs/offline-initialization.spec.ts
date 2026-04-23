import { test, expect } from '@playwright/test';
import { NetworkInterceptor } from '../fixtures/network-interceptor';
import { loginAndWaitForTabs } from '../fixtures/auth-flow';

test.describe('Offline Initialization', () => {
  let interceptor: NetworkInterceptor;

  test.beforeEach(async ({ page }) => {
    interceptor = new NetworkInterceptor(page);
    await interceptor.setup();

    // Clear local storage / IndexedDB before starting
    await page.goto('/');
    await page.evaluate(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
      // Delete indexedDB for localForage (Ionic Storage)
      indexedDB.databases().then(dbs => {
        dbs.forEach(db => {
          if(db.name) indexedDB.deleteDatabase(db.name);
        });
      });
    });
  });

  test('should login and perform mocked initialization', async ({ page }) => {
    await loginAndWaitForTabs(page);
  });

  test('should handle offline mode during initialization', async ({ page }) => {
    await loginAndWaitForTabs(page);
    await interceptor.goOffline();
    await expect(page).toHaveURL(/\/tabs/, { timeout: 10000 });
  });
});
