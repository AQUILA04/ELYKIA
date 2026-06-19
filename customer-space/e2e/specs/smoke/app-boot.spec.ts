import { test, expect } from '@playwright/test';
import { mockCustomerApi } from '../../fixtures/customer-auth';

test.describe('App boot', () => {
  test('@smoke redirects unauthenticated user to auth after splash', async ({ page }) => {
    await mockCustomerApi(page);
    await page.goto('/');
    await expect(page.getByTestId('e2e-auth-page')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('e2e-auth-phone-input')).toBeVisible();
  });
});
