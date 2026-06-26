import { test, expect } from '@playwright/test';
import { loginAsCustomer, MOCK_PURCHASE_ID } from '../../fixtures/customer-auth';

test.describe('Purchases flow', () => {
  test('navigates list → detail → timeline → payment link', async ({ page }) => {
    await loginAsCustomer(page);
    await page.goto('/purchases');

    await expect(page.getByTestId('e2e-purchases-page')).toBeVisible({ timeout: 15_000 });
    await page.getByTestId(`e2e-purchase-row-${MOCK_PURCHASE_ID}`).click();

    await expect(page.getByTestId('e2e-purchase-detail-page')).toBeVisible();
    await page.getByTestId('e2e-purchase-timeline-btn').click();

    await expect(page.getByTestId('e2e-recovery-timeline-page')).toBeVisible();
    await expect(page.getByTestId('e2e-recovery-pills')).toBeVisible();
    await expect(page.getByTestId('e2e-recovery-pay-btn')).toBeVisible();
  });
});
