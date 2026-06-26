import { test, expect } from '@playwright/test';
import { loginAsCustomer } from '../../fixtures/customer-auth';

test.describe('Order flow', () => {
  test('catalog → cart → order confirmation', async ({ page }) => {
    await loginAsCustomer(page);
    await page.goto('/catalog');

    await expect(page.getByTestId('e2e-catalog-page')).toBeVisible({ timeout: 15_000 });
    await page.getByTestId('e2e-catalog-add-art-1').click();
    await page.getByTestId('e2e-catalog-cart-btn').click();

    await expect(page.getByTestId('e2e-cart-page')).toBeVisible();
    await expect(page.getByTestId('e2e-cart-line-art-1')).toBeVisible();

    const order = page.waitForResponse((r) => r.url().includes('/orders') && r.request().method() === 'POST' && r.ok());
    await page.getByTestId('e2e-cart-submit').click();
    await order;

    await expect(page.getByTestId('e2e-order-confirmation-page')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('e2e-order-reference')).toContainText('CMD-2026');
  });
});
