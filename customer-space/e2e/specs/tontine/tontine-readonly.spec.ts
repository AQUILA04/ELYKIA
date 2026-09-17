import { test, expect } from '@playwright/test';
import { fillIonTestId, loginAsCustomer } from '../../fixtures/customer-auth';

test.describe('Tontine customer flow', () => {
  test('navigates tontine list -> detail -> timeline with carnet pills', async ({ page }) => {
    await loginAsCustomer(page);
    await page.goto('/dashboard');

    await page.getByTestId('e2e-dashboard-tontine-btn').click();
    await expect(page.getByTestId('e2e-tontines-page')).toBeVisible({ timeout: 15_000 });
    await page.getByTestId('e2e-tontine-row-77').click();

    await expect(page.getByTestId('e2e-tontine-detail-page')).toBeVisible();
    await expect(page.getByTestId('e2e-tontine-carnet-pills')).toBeVisible();
    await expect(page.getByTestId('e2e-tontine-detail-pay-btn')).toBeVisible();
    await page.getByTestId('e2e-tontine-detail-timeline-btn').click();

    await expect(page.getByTestId('e2e-tontine-timeline-page')).toBeVisible();
    await expect(page.getByTestId('e2e-tontine-payment-row-tp-1')).toBeVisible();
  });

  test('declares a tontine mobile money payment', async ({ page }) => {
    await loginAsCustomer(page);
    await page.goto('/tontines/77');
    await expect(page.getByTestId('e2e-tontine-detail-page')).toBeVisible({ timeout: 15_000 });
    await page.getByTestId('e2e-tontine-detail-pay-btn').click();

    await expect(page.getByTestId('e2e-tontine-payment-page')).toBeVisible();
    await expect(page.getByTestId('e2e-tontine-payment-recipients')).toBeVisible({ timeout: 10_000 });

    await fillIonTestId(page, 'e2e-tontine-payment-phone', '97000000');
    await fillIonTestId(page, 'e2e-tontine-payment-amount', '500');
    await fillIonTestId(page, 'e2e-tontine-payment-reference', 'TXN-TONTINE-E2E');
    await page.getByTestId('e2e-tontine-payment-submit').click();

    await expect(page.getByTestId('e2e-tontine-payment-success')).toBeVisible({ timeout: 10_000 });
  });
});
