import { test, expect } from '@playwright/test';
import { fillIonTestId, loginAsCustomer, MOCK_PURCHASE_ID } from '../../fixtures/customer-auth';

test.describe('Mobile money payment', () => {
  test('submits payment form and shows confirmation', async ({ page }) => {
    await loginAsCustomer(page);
    await page.goto(`/payment/${MOCK_PURCHASE_ID}?amount=35000&installment=3`);

    await expect(page.getByTestId('e2e-payment-page')).toBeVisible({ timeout: 15_000 });
    await fillIonTestId(page, 'e2e-payment-phone', '90123456');
    await fillIonTestId(page, 'e2e-payment-amount', '35000');
    await fillIonTestId(page, 'e2e-payment-reference', 'TXN-E2E-001');

    const submit = page.waitForResponse((r) => r.url().includes('/recoveries/mobile-money') && r.ok());
    await page.getByTestId('e2e-payment-submit').click();
    await submit;

    await expect(page.getByTestId('e2e-payment-success')).toBeVisible();
  });
});
