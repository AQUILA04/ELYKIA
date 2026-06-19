import { test, expect } from '@playwright/test';
import { loginAsCustomer } from '../../fixtures/customer-auth';

test.describe('Dashboard', () => {
  test('displays credit summary and quick actions', async ({ page }) => {
    await loginAsCustomer(page);
    await page.goto('/dashboard');

    await expect(page.getByTestId('e2e-dashboard-page')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('e2e-dashboard-credit-card')).toContainText('350');
    await expect(page.getByTestId('e2e-dashboard-quick-actions')).toBeVisible();
    await expect(page.getByTestId('e2e-dashboard-activities')).toBeVisible();
    await expect(page.getByTestId('e2e-customer-tabs')).toBeVisible();
  });
});
