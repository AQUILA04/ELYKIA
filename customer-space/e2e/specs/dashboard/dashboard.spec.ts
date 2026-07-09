import { test, expect } from '@playwright/test';
import { loginAsCustomer } from '../../fixtures/customer-auth';

test.describe('Dashboard', () => {
  test('displays credit summary and quick actions', async ({ page }) => {
    await loginAsCustomer(page);
    await page.goto('/dashboard');

    await expect(page.getByTestId('e2e-dashboard-page')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('e2e-dashboard-credit-card')).toContainText('350');
    await expect(page.getByTestId('e2e-dashboard-quick-actions')).toBeVisible();
    await expect(page.getByTestId('e2e-dashboard-tontine-btn')).toBeVisible();
    await expect(page.getByTestId('e2e-dashboard-activities')).toBeVisible();
    await expect(page.getByTestId('e2e-customer-tabs')).toBeVisible();
  });

  test('pay quick action opens payment page', async ({ page }) => {
    await loginAsCustomer(page);
    await page.goto('/dashboard');

    await expect(page.getByTestId('e2e-dashboard-pay-btn')).toBeVisible({ timeout: 15_000 });
    await page.getByTestId('e2e-dashboard-pay-btn').click();

    await expect(page).toHaveURL(/\/payment\/101\?/);
    await expect(page.getByTestId('e2e-payment-page')).toBeVisible();
  });
});
