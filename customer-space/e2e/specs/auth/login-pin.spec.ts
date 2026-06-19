import { test, expect } from '@playwright/test';
import { fillIonTestId, mockCustomerApi } from '../../fixtures/customer-auth';

test.describe('Auth PIN login', () => {
  test('login with phone and PIN reaches dashboard', async ({ page }) => {
    await mockCustomerApi(page);
    await page.goto('/auth');
    await expect(page.getByTestId('e2e-auth-page')).toBeVisible();

    await fillIonTestId(page, 'e2e-auth-phone-input', '90123456');

    const checkPhone = page.waitForResponse(
      (r) => r.url().includes('/auth/check-phone') && r.ok(),
    );
    await page.getByTestId('e2e-auth-phone-submit').click();
    await checkPhone;

    await expect(page.getByTestId('e2e-auth-pin-input')).toBeVisible({ timeout: 10_000 });
    await fillIonTestId(page, 'e2e-auth-pin-input', '1234');

    const login = page.waitForResponse(
      (r) => r.url().includes('/auth/login') && r.ok(),
    );
    await page.getByTestId('e2e-auth-pin-submit').click();
    await login;

    await expect(page.getByTestId('e2e-dashboard-page')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('e2e-dashboard-credit-card')).toBeVisible();
  });
});
