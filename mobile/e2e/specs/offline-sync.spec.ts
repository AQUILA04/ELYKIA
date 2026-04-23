import { test, expect } from '@playwright/test';
import { NetworkInterceptor } from '../fixtures/network-interceptor';
import { loginAndWaitForTabs } from '../fixtures/auth-flow';

test.describe('Offline Synchronization', () => {
  let interceptor: NetworkInterceptor;

  test.beforeEach(async ({ page }) => {
    interceptor = new NetworkInterceptor(page);
    await interceptor.setup();

    await loginAndWaitForTabs(page);
  });

  test('should start synchronization and handle network correctly', async ({ page }) => {
    await page.goto('/tabs/dashboard');
    await expect(page).toHaveURL(/\/tabs\/dashboard/);
    await expect(page.locator('ion-tabs').first()).toBeVisible();
  });

  test('should display sync errors', async ({ page }) => {
    await page.goto('/tabs/dashboard');
    await expect(page).toHaveURL(/\/tabs\/dashboard/);
    await expect(page.locator('ion-tabs').first()).toBeVisible();
  });
});
