import { test, expect } from '../fixtures/offline-test';

test.describe.configure({ mode: 'serial' });

test.describe('Offline Smoke @smoke', () => {
  test('dashboard shell is reachable after login', async ({ authenticatedPage: page }) => {
    await page.goto('/tabs/dashboard');
    await expect(page).toHaveURL(/\/tabs\/dashboard/);
    await expect(page.locator('ion-tabs').first()).toBeVisible();
  });

  test('article catalog area is reachable', async ({ authenticatedPage: page }) => {
    await page.goto('/tabs/article-list');
    await expect(page).toHaveURL(/\/tabs\/article-list/);
    await expect(page.locator('ion-tabs').first()).toBeVisible();
  });

  test('clients area is reachable', async ({ authenticatedPage: page }) => {
    await page.goto('/tabs/clients');
    await expect(page).toHaveURL(/\/tabs\/clients/);
    await expect(page.locator('ion-tabs').first()).toBeVisible();
  });

  test('distributions area is reachable', async ({ authenticatedPage: page }) => {
    await page.goto('/tabs/distributions');
    await expect(page).toHaveURL(/\/tabs\/distributions/);
    await expect(page.locator('ion-tabs').first()).toBeVisible();
  });

  test('localities area is reachable', async ({ authenticatedPage: page }) => {
    await page.goto('/tabs/localities');
    await expect(page).toHaveURL(/\/tabs\/localities/);
    await expect(page.locator('ion-tabs').first()).toBeVisible();
  });

  test('more menu and daily report area are reachable', async ({ authenticatedPage: page }) => {
    await page.goto('/tabs/more');
    await expect(page).toHaveURL(/\/tabs\/more/);
    await expect(page.locator('ion-content').first()).toBeVisible();
  });
});
