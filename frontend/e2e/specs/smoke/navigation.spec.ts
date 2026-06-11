import { test, expect } from '@playwright/test';
import { loginAsGestionnaire } from '../../fixtures/auth';

test.describe('Navigation gestionnaire (ges003)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsGestionnaire(page);
  });

  test('accès à la liste des clients', async ({ page }) => {
    await page.getByTestId('e2e-sidebar-clients').click();
    await expect(page).toHaveURL(/\/client-list/);
    await expect(page.getByTestId('e2e-client-list')).toBeVisible();
    await expect(page.getByTestId('e2e-client-add-btn')).toBeVisible();
  });

  test('accès à la liste des localités via Configuration', async ({ page }) => {
    await page.getByTestId('e2e-sidebar-configuration').click();
    await page.getByTestId('e2e-sidebar-localities').click();
    await expect(page).toHaveURL(/\/localitylist/);
    await expect(page.getByTestId('e2e-locality-list')).toBeVisible();
    await expect(page.getByTestId('e2e-locality-add-btn')).toBeVisible();
  });

  test('accès aux demandes de sortie stock', async ({ page }) => {
    await page.getByTestId('e2e-sidebar-stock-commercial').click();
    await page.getByTestId('e2e-sidebar-stock-request').click();
    await expect(page).toHaveURL(/\/stock\/request/);
    await expect(page.getByTestId('e2e-stock-request-list')).toBeVisible();
  });

  test('accès au rapport journalier', async ({ page }) => {
    await page.getByTestId('e2e-sidebar-daily-report').click();
    await expect(page).toHaveURL(/\/daily-report/);
  });
});
