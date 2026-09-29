import { test, expect } from '@playwright/test';
import { loginAsCustomer } from '../../fixtures/customer-auth';

test.describe('Desktop shell @desktop', () => {
  test('auth page uses desktop split layout', async ({ page }) => {
    await page.goto('/auth');
    await expect(page.getByTestId('e2e-auth-desktop')).toBeVisible({ timeout: 30_000 });
    await expect(page.locator('.auth-desktop__hero')).toBeVisible();
    await expect(page.getByTestId('e2e-auth-phone-input')).toBeVisible();
    await expect(page.locator('app-elyk-decor-header')).toHaveCount(0);
  });

  test('authenticated shell shows sidebar and desktop dashboard', async ({ page }) => {
    await loginAsCustomer(page);
    await page.goto('/dashboard');

    await expect(page.getByTestId('e2e-desktop-sidebar')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId('e2e-dashboard-desktop')).toBeVisible();
    await expect(page.getByTestId('e2e-dashboard-kpis')).toBeVisible();
    await expect(page.getByTestId('e2e-dashboard-credit-card')).toBeVisible();
    await expect(page.getByTestId('e2e-customer-tabs')).toHaveCount(0);

    await page.getByTestId('e2e-nav-purchases').click();
    await expect(page.getByTestId('e2e-purchases-desktop')).toBeVisible({ timeout: 15_000 });

    await page.getByTestId('e2e-nav-catalog').click();
    await expect(page.getByTestId('e2e-catalog-desktop')).toBeVisible({ timeout: 15_000 });

    await page.getByTestId('e2e-nav-tontines').click();
    await expect(page.getByTestId('e2e-tontines-desktop')).toBeVisible({ timeout: 15_000 });
  });
});
