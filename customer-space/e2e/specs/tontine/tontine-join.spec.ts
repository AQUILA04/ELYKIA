import { test, expect } from '@playwright/test';
import { loginAsCustomer } from '../../fixtures/customer-auth';
import { MOCK_TONTINE_SESSION_JOINABLE, jsonResponse } from '../../fixtures/mock-customer-api';

test.describe('Tontine join flow', () => {
  test('@smoke joins an open session from empty-ish list', async ({ page }) => {
    await loginAsCustomer(page);

    await page.route('**/api/customer/tontine/session/current', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill(jsonResponse(MOCK_TONTINE_SESSION_JOINABLE));
        return;
      }
      await route.fallback();
    });
    await page.route('**/api/customer/tontine/contributions', async (route) => {
      if (route.request().method() === 'GET' && !route.request().url().includes('/contributions/')) {
        await route.fulfill(jsonResponse([]));
        return;
      }
      await route.fallback();
    });

    await page.goto('/tontines');
    await expect(page.getByTestId('e2e-tontines-page')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('e2e-tontine-session-card')).toBeVisible();
    await page.getByTestId('e2e-tontine-join-btn').click();

    await expect(page.getByTestId('e2e-tontine-join-page')).toBeVisible({ timeout: 10_000 });
    await page.getByTestId('e2e-tontine-stake-200').click();
    await page.getByTestId('e2e-tontine-join-submit').click();

    await expect(page.getByTestId('e2e-tontine-join-success')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Bienvenue dans la tontine 2026')).toBeVisible();
  });
});
