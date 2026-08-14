import { test, expect } from '../fixtures/offline-test';

test.describe('Tontine hybrid allocation @smoke', () => {
  test('tontine dashboard is reachable after mocked login', async ({ authenticatedPage: page }) => {
    await page.goto('/tontine/dashboard');
    await expect(page).toHaveURL(/\/tontine\/dashboard/, { timeout: 15_000 });
    await expect(page.locator('ion-content').first()).toBeVisible();
  });
});
