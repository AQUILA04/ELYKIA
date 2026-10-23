import { test, expect } from '@playwright/test';
import { loginAsCustomer } from '../../fixtures/customer-auth';

test.describe('Adhesions', () => {
  test('shows the personal ceiling and sends a declaration', async ({ page }) => {
    await loginAsCustomer(page);
    await page.goto('/adhesions');

    await expect(page.getByTestId('e2e-adhesions-page')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('e2e-adhesion-PERSONAL')).toContainText('35');
    await expect(page.getByTestId('e2e-adhesion-form')).toBeVisible();

    await page.getByTestId('e2e-adhesion-type').selectOption('BUSINESS');
    await page.getByTestId('e2e-adhesion-phone').fill('90111222');
    await page.getByTestId('e2e-adhesion-reference').fill('MM-E2E-2000');

    const declared = page.waitForResponse(
      (r) => r.url().includes('/adhesions/declarations') && r.request().method() === 'POST' && r.ok(),
    );
    await page.getByTestId('e2e-adhesion-submit').click();
    await declared;
    await expect(page.getByTestId('e2e-adhesion-success')).toBeVisible();
  });
});
