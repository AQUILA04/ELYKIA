import { test, expect } from '@playwright/test';
import { loginAsCustomer } from '../../fixtures/customer-auth';

test.describe('Tontine readonly flow', () => {
  test('navigates tontine list -> detail -> timeline with carnet pills', async ({ page }) => {
    await loginAsCustomer(page);
    await page.goto('/dashboard');

    await page.getByTestId('e2e-dashboard-tontine-btn').click();
    await expect(page.getByTestId('e2e-tontines-page')).toBeVisible({ timeout: 15_000 });
    await page.getByTestId('e2e-tontine-row-77').click();

    await expect(page.getByTestId('e2e-tontine-detail-page')).toBeVisible();
    await expect(page.getByTestId('e2e-tontine-carnet-pills')).toBeVisible();
    await page.getByTestId('e2e-tontine-detail-timeline-btn').click();

    await expect(page.getByTestId('e2e-tontine-timeline-page')).toBeVisible();
    await expect(page.getByTestId('e2e-tontine-payment-row-tp-1')).toBeVisible();
  });
});
