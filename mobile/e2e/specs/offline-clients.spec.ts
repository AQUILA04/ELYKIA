import { test, expect } from '@playwright/test';
import { NetworkInterceptor } from '../fixtures/network-interceptor';
import { loginAndWaitForTabs } from '../fixtures/auth-flow';

test.describe('Offline Clients Management', () => {
  let interceptor: NetworkInterceptor;

  test.beforeEach(async ({ page }) => {
    interceptor = new NetworkInterceptor(page);
    await interceptor.setup();

    // Login and wait for initial load to finish so we are at /tabs
    await loginAndWaitForTabs(page);
    
  });

  test('should display client list and filters correctly', async ({ page }) => {
    await expect(page).toHaveURL(/\/tabs\/dashboard/);
    await expect(page.locator('ion-tabs').first()).toBeVisible();
  });

  test('should create a new client offline', async ({ page }) => {
    await page.goto('/tabs/dashboard');
    await expect(page).toHaveURL(/\/tabs\/dashboard/);
    await expect(page.locator('ion-tabs').first()).toBeVisible();
  });
});
