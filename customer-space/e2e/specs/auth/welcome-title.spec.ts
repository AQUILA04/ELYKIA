import { test, expect } from '@playwright/test';
import { mockCustomerApi } from '../../fixtures/customer-auth';

test.describe('Auth welcome title', () => {
  test('first opening shows Bienvenue and the next one shows Bon retour', async ({ page }) => {
    await mockCustomerApi(page);
    await page.goto('/auth');
    await expect(page.getByRole('heading', { name: 'Bienvenue', exact: true })).toBeVisible();

    await page.reload();
    await expect(page.getByRole('heading', { name: 'Bon retour !' })).toBeVisible();
  });

  test('shows Bon retour when the device already has app data', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('elykia_customer_device_id', 'already-there');
    });
    await mockCustomerApi(page);
    await page.goto('/auth');
    await expect(page.getByRole('heading', { name: 'Bon retour !' })).toBeVisible();
  });
});
