import { test, expect } from '../fixtures/offline-test';

test.describe.configure({ mode: 'serial' });

test.describe('Offline Smoke @smoke', () => {
  test('dashboard shell is reachable after login', async ({ authenticatedPage: page }) => {
    await expect(page).toHaveURL(/\/tabs/);
    await expect(page.locator('ion-tabs').first()).toBeVisible();
  });

  test('clients tab is reachable', async ({ authenticatedPage: page }) => {
    await page.locator('ion-tab-button[tab="clients"]').click();
    await expect(page).toHaveURL(/\/tabs\/clients/, { timeout: 15_000 });
    await expect(page.locator('ion-tabs').first()).toBeVisible();
  });

  test('distributions tab is reachable', async ({ authenticatedPage: page }) => {
    await page.locator('ion-tab-button[tab="distributions"]').click();
    await expect(page).toHaveURL(/\/tabs\/distributions/, { timeout: 15_000 });
    await expect(page.locator('ion-tabs').first()).toBeVisible();
  });

  test('more tab is reachable', async ({ authenticatedPage: page }) => {
    await page.locator('ion-tab-button[tab="more"]').click();
    await expect(page).toHaveURL(/\/tabs\/more/, { timeout: 15_000 });
    await expect(page.locator('ion-tabs').first()).toBeVisible();
  });
});
