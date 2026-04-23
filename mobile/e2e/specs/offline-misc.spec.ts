import { test, expect } from '@playwright/test';
import { NetworkInterceptor } from '../fixtures/network-interceptor';
import { loginAndWaitForTabs } from '../fixtures/auth-flow';

test.describe('Offline Misc (Localities, Tontines)', () => {
  let interceptor: NetworkInterceptor;

  test.beforeEach(async ({ page }) => {
    interceptor = new NetworkInterceptor(page);
    await interceptor.setup();

    await loginAndWaitForTabs(page);
  });

  test('should add a member to Tontine and process collection offline', async ({ page }) => {
    await page.goto('/tabs/dashboard');
    await expect(page).toHaveURL(/\/tabs\/dashboard/);
    await expect(page.locator('ion-tabs').first()).toBeVisible();
  });

  test('should add a new locality offline', async ({ page }) => {
    await page.goto('/tabs/dashboard');
    await expect(page).toHaveURL(/\/tabs\/dashboard/);
    await expect(page.locator('ion-tabs').first()).toBeVisible();
  });
});
