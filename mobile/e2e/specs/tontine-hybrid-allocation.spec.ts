import { test, expect } from '../fixtures/offline-test';

test.describe('Tontine hybrid allocation @smoke', () => {
  test('tontine dashboard is reachable after mocked login', async ({ authenticatedPage: page }) => {
    // page.goto() reloads Angular and drops the in-memory session (tabs or login).
    // Stay in the SPA: the worker page may already be on another tab after smoke tests.
    if (!/\/tontine\/dashboard/.test(page.url())) {
      if (!/\/tabs\/dashboard/.test(page.url())) {
        await page.getByTestId('e2e-tab-dashboard').click();
        await expect(page).toHaveURL(/\/tabs\/dashboard/, { timeout: 15_000 });
      }
      await page.getByTestId('e2e-action-tontine').click();
    }
    await expect(page).toHaveURL(/\/tontine\/dashboard/, { timeout: 15_000 });
    // Do not use ion-content.first(): the login page stays in the Ionic stack as hidden.
    await expect(page.getByTestId('e2e-tontine-dashboard-title')).toBeVisible({ timeout: 15_000 });
  });
});
