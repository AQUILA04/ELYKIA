import { test, expect } from '@playwright/test';
import { loginAsCustomer } from '../../fixtures/customer-auth';

test.describe('Profile logout', () => {
  test('logout redirects to auth', async ({ page }) => {
    await loginAsCustomer(page);
    await page.goto('/profile');

    await expect(page.getByTestId('e2e-profile-page')).toBeVisible({ timeout: 15_000 });
    await page.getByTestId('e2e-profile-logout').click();

    await expect(page.getByTestId('e2e-auth-page')).toBeVisible({ timeout: 15_000 });
  });
});
