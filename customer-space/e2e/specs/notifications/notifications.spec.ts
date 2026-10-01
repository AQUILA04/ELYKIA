import { test, expect } from '@playwright/test';
import { loginAsCustomer } from '../../fixtures/customer-auth';

test.describe('Notifications', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsCustomer(page);
  });

  test('affiche la cloche et ouvre la liste', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.getByTestId('e2e-notification-bell')).toBeVisible();
    await expect(page.getByTestId('e2e-notification-badge')).toBeVisible();
    await page.getByTestId('e2e-notification-bell').click();
    await expect(page.getByTestId('e2e-notifications-page')).toBeVisible();
    await expect(page.getByTestId('e2e-notification-item-1')).toBeVisible();
    await expect(page.getByText('Compte activé')).toBeVisible();
  });
});
