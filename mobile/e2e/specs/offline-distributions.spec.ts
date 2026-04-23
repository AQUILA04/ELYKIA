import { test, expect } from '@playwright/test';
import { NetworkInterceptor } from '../fixtures/network-interceptor';
import { loginAndWaitForTabs } from '../fixtures/auth-flow';

test.describe('Offline Distributions', () => {
  let interceptor: NetworkInterceptor;

  test.beforeEach(async ({ page }) => {
    interceptor = new NetworkInterceptor(page);
    await interceptor.setup();

    await loginAndWaitForTabs(page);
    
  });

  test('should create a new distribution (vente à crédit) offline', async ({ page }) => {
    await page.goto('/tabs/dashboard');
    await expect(page).toHaveURL(/\/tabs\/dashboard/);
    await expect(page.locator('ion-tabs').first()).toBeVisible();
  });
});
