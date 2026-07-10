import { test, expect } from '@playwright/test';
import { fillIonTestId, mockCustomerApi } from '../../fixtures/customer-auth';

test.describe('Auth availability', () => {
  test('shows unavailable message when customer space flag is disabled @smoke', async ({ page }) => {
    await mockCustomerApi(page);
    await page.addInitScript(() => {
      (window as Window & { __E2E_FLAGS__?: Record<string, boolean> }).__E2E_FLAGS__ = {
        customerSpaceAvailable: false,
      };
    });

    await page.goto('/auth');
    await fillIonTestId(page, 'e2e-auth-phone-input', '90123456');
    await page.getByTestId('e2e-auth-phone-submit').click();

    await expect(page.getByTestId('e2e-auth-unavailable')).toBeVisible();
    await expect(page.getByTestId('e2e-auth-unavailable')).toContainText('Amenouveve-Yaveh');
    await expect(page.getByTestId('e2e-auth-pin-input')).toHaveCount(0);
  });
});
