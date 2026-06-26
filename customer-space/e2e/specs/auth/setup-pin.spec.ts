import { test, expect } from '@playwright/test';
import { fillIonTestId, mockNewCustomerAuth } from '../../fixtures/customer-auth';

test.describe('Auth setup PIN', () => {
  test('OTP mock and PIN setup reaches dashboard', async ({ page }) => {
    await mockNewCustomerAuth(page);
    await page.goto('/auth');
    await expect(page.getByTestId('e2e-auth-page')).toBeVisible();

    await fillIonTestId(page, 'e2e-auth-phone-input', '90123456');
    const checkPhone = page.waitForResponse(
      (r) => r.url().includes('/auth/check-phone') && r.ok(),
    );
    await page.getByTestId('e2e-auth-phone-submit').click();
    await checkPhone;

    await expect(page.getByTestId('e2e-auth-otp-input')).toBeVisible({ timeout: 10_000 });
    await fillIonTestId(page, 'e2e-auth-otp-input', '123456');
    await page.getByTestId('e2e-auth-otp-submit').click();

    await expect(page.getByTestId('e2e-auth-setup-pin-input')).toBeVisible({ timeout: 10_000 });
    await fillIonTestId(page, 'e2e-auth-setup-pin-input', '5678');
    await fillIonTestId(page, 'e2e-auth-setup-pin-confirm', '5678');

    const setupPin = page.waitForResponse(
      (r) => r.url().includes('/auth/setup-pin') && r.ok(),
    );
    await page.getByTestId('e2e-auth-setup-pin-submit').click();
    await setupPin;

    await expect(page.getByTestId('e2e-dashboard-page')).toBeVisible({ timeout: 15_000 });
  });
});
